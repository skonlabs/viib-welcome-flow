import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMDB Provider ID to service name mapping (US region only)
const TMDB_PROVIDER_MAP: Record<number, string> = {
  8: 'Netflix',
  9: 'Prime Video',
  119: 'Prime Video',
  15: 'Hulu',
  350: 'Apple TV+',
  2: 'Apple TV+',
  337: 'Disney+',
  390: 'Disney+',
  1899: 'HBO Max',
  384: 'HBO Max',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing required environment variables' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { batchSize = 100, dryRun = false } = await req.json().catch(() => ({}));
    
    console.log(`Starting streaming availability fix job (batchSize: ${batchSize}, dryRun: ${dryRun})`);
    const startTime = Date.now();
    const MAX_RUNTIME_MS = 55000;

    // Fetch streaming services for lookup
    const { data: streamingServices } = await supabase
      .from('streaming_services')
      .select('id, service_name')
      .eq('is_active', true);

    const serviceNameToId: Record<string, string> = {};
    (streamingServices || []).forEach(s => {
      serviceNameToId[s.service_name.toLowerCase()] = s.id;
    });

    console.log(`Loaded ${Object.keys(serviceNameToId).length} streaming services`);

    // Find titles with all 5 services (corrupted data)
    // These are titles where streaming data was incorrectly populated
    const { data: corruptedTitles, error: queryError } = await supabase
      .rpc('get_titles_with_all_streaming_services', { p_limit: batchSize });

    // If RPC doesn't exist, use a direct query approach
    let titlesToFix: Array<{ id: string; tmdb_id: number; title_type: string; name: string }> = [];
    
    if (queryError || !corruptedTitles) {
      console.log('RPC not available, using direct query...');
      
      // Get titles that have exactly 5 streaming services (all of them = corrupted)
      const { data: allServiceCount } = await supabase
        .from('streaming_services')
        .select('id')
        .eq('is_active', true);
      
      const totalServices = allServiceCount?.length || 6;
      
      // Find title IDs with all services
      const { data: corruptedIds } = await supabase
        .from('title_streaming_availability')
        .select('title_id')
        .eq('region_code', 'US');
      
      if (corruptedIds) {
        // Count services per title
        const titleServiceCount: Record<string, number> = {};
        for (const row of corruptedIds) {
          titleServiceCount[row.title_id] = (titleServiceCount[row.title_id] || 0) + 1;
        }
        
        // Get titles with all services (corrupted)
        const corruptedTitleIds = Object.entries(titleServiceCount)
          .filter(([_, count]) => count >= totalServices - 1) // 5 or more services = likely corrupted
          .map(([id]) => id)
          .slice(0, batchSize);
        
        if (corruptedTitleIds.length > 0) {
          const { data: titleDetails } = await supabase
            .from('titles')
            .select('id, tmdb_id, title_type, name')
            .in('id', corruptedTitleIds)
            .not('tmdb_id', 'is', null);
          
          titlesToFix = titleDetails || [];
        }
      }
    } else {
      titlesToFix = corruptedTitles;
    }

    console.log(`Found ${titlesToFix.length} titles with corrupted streaming data`);

    if (titlesToFix.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No corrupted titles found',
          processed: 0,
          fixed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let fixed = 0;
    let noProviders = 0;
    let errors = 0;

    // Helper function to fetch watch providers from TMDB
    async function fetchWatchProviders(tmdbId: number, titleType: string): Promise<Array<{ name: string; serviceId: string }>> {
      try {
        const endpoint = titleType === 'movie' ? 'movie' : 'tv';
        const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return [];
        
        const data = await res.json();
        const usProviders = data.results?.US?.flatrate || [];
        const matchedProviders: Array<{ name: string; serviceId: string }> = [];
        
        for (const provider of usProviders) {
          const mappedName = TMDB_PROVIDER_MAP[provider.provider_id];
          if (mappedName) {
            const serviceId = serviceNameToId[mappedName.toLowerCase()];
            if (serviceId) {
              // Avoid duplicates (e.g., provider_id 9 and 119 both map to Prime Video)
              if (!matchedProviders.some(p => p.serviceId === serviceId)) {
                matchedProviders.push({ name: mappedName, serviceId });
              }
            }
          }
        }
        
        return matchedProviders;
      } catch (e) {
        console.error(`Error fetching providers for ${tmdbId}:`, e);
        return [];
      }
    }

    for (const title of titlesToFix) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`Runtime limit reached at ${processed} titles`);
        break;
      }

      processed++;
      const tmdbId = Math.floor(Number(title.tmdb_id));
      
      if (!tmdbId || isNaN(tmdbId)) {
        console.error(`Invalid tmdb_id for ${title.name}`);
        errors++;
        continue;
      }

      // Fetch correct providers from TMDB
      const providers = await fetchWatchProviders(tmdbId, title.title_type);
      
      console.log(`${title.name} (${title.title_type}): ${providers.length} actual providers [${providers.map(p => p.name).join(', ')}]`);

      if (dryRun) {
        if (providers.length > 0 && providers.length < 5) {
          fixed++;
        } else if (providers.length === 0) {
          noProviders++;
        }
        continue;
      }

      // Delete existing corrupted data
      const { error: deleteError } = await supabase
        .from('title_streaming_availability')
        .delete()
        .eq('title_id', title.id)
        .eq('region_code', 'US');

      if (deleteError) {
        console.error(`Error deleting for ${title.name}:`, deleteError);
        errors++;
        continue;
      }

      // Insert correct providers (if any)
      if (providers.length > 0) {
        for (const provider of providers) {
          await supabase.from('title_streaming_availability').insert({
            title_id: title.id,
            streaming_service_id: provider.serviceId,
            region_code: 'US'
          });
        }
        fixed++;
      } else {
        noProviders++;
      }

      // Rate limit to avoid TMDB API limits
      if (processed % 40 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`Completed: processed=${processed}, fixed=${fixed}, noProviders=${noProviders}, errors=${errors}, duration=${duration}s`);

    // Update job record with processed count
    const jobId = (await req.clone().json().catch(() => ({})))?.jobId;
    if (jobId) {
      await supabase
        .from('jobs')
        .update({ 
          total_titles_processed: processed,
          status: titlesToFix.length < batchSize ? 'completed' : 'idle',
          last_run_at: new Date().toISOString(),
          last_run_duration_seconds: duration
        })
        .eq('id', jobId);
    } else {
      // Update by job_type if no jobId provided - increment the count
      const { data: fixJob } = await supabase
        .from('jobs')
        .select('total_titles_processed')
        .eq('job_type', 'fix_streaming')
        .single();
      
      await supabase
        .from('jobs')
        .update({ 
          total_titles_processed: (fixJob?.total_titles_processed || 0) + processed,
          status: titlesToFix.length < batchSize ? 'completed' : 'idle',
          last_run_at: new Date().toISOString(),
          last_run_duration_seconds: duration
        })
        .eq('job_type', 'fix_streaming');
    }

    // Log to system_logs
    await supabase.from('system_logs').insert({
      severity: 'info',
      operation: 'fix-streaming-availability',
      error_message: `Fixed ${fixed} titles, ${noProviders} with no providers, ${errors} errors`,
      context: { processed, fixed, noProviders, errors, duration, dryRun, batchSize }
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        fixed,
        noProviders,
        errors,
        duration,
        dryRun,
        hasMore: titlesToFix.length >= batchSize
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error in fix-streaming-availability:', errorMessage);
    
    await supabase.from('system_logs').insert({
      severity: 'error',
      operation: 'fix-streaming-availability',
      error_message: errorMessage,
      error_stack: errorStack
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
