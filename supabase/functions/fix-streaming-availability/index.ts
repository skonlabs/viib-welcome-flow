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

    // Helper function to check if job was stopped
    async function isJobStopped(): Promise<boolean> {
      const { data } = await supabase
        .from('jobs')
        .select('is_active')
        .eq('job_type', 'fix_streaming')
        .single();
      return data?.is_active === false;
    }

    let totalProcessed = 0;
    let totalFixed = 0;
    let totalNoProviders = 0;
    let totalErrors = 0;
    let batchNumber = 0;

    // MAIN LOOP: Keep processing batches until no more corrupted titles
    while (true) {
      batchNumber++;
      
      // Check if job was stopped by user
      if (await isJobStopped()) {
        console.log('Job stopped by user');
        break;
      }

      // Use RPC to find corrupted titles
      const { data: corruptedTitles, error: queryError } = await supabase
        .rpc('get_titles_with_all_streaming_services', { p_limit: batchSize });

      let titlesToFix: Array<{ id: string; tmdb_id: number; title_type: string; name: string }> = [];
      
      if (queryError || !corruptedTitles) {
        console.log('RPC not available, using direct query...');
        
        const { data: allServiceCount } = await supabase
          .from('streaming_services')
          .select('id')
          .eq('is_active', true);
        
        const totalServices = allServiceCount?.length || 6;
        
        const { data: corruptedIds } = await supabase
          .from('title_streaming_availability')
          .select('title_id')
          .eq('region_code', 'US');
        
        if (corruptedIds) {
          const titleServiceCount: Record<string, number> = {};
          for (const row of corruptedIds) {
            titleServiceCount[row.title_id] = (titleServiceCount[row.title_id] || 0) + 1;
          }
          
          const corruptedTitleIds = Object.entries(titleServiceCount)
            .filter(([_, count]) => count >= totalServices - 1)
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

      console.log(`Batch ${batchNumber}: Found ${titlesToFix.length} titles with corrupted streaming data`);

      // No more corrupted titles - we're done!
      if (titlesToFix.length === 0) {
        console.log('All corrupted titles have been processed!');
        break;
      }

      let batchProcessed = 0;
      let batchFixed = 0;
      let batchNoProviders = 0;
      let batchErrors = 0;

      // Process titles in parallel batches for speed
      const PARALLEL_BATCH_SIZE = 10; // Process 10 at a time
      
      for (let i = 0; i < titlesToFix.length; i += PARALLEL_BATCH_SIZE) {
        // Check if job was stopped mid-batch
        if (i > 0 && i % 50 === 0) {
          if (await isJobStopped()) {
            console.log('Job stopped by user mid-batch');
            break;
          }
        }

        const batch = titlesToFix.slice(i, i + PARALLEL_BATCH_SIZE);
        let parallelFixed = 0;
        
        // Fetch all providers in parallel
        const providerResults = await Promise.all(
          batch.map(async (title) => {
            const tmdbId = Math.floor(Number(title.tmdb_id));
            if (!tmdbId || isNaN(tmdbId)) {
              return { title, providers: null, error: true };
            }
            const providers = await fetchWatchProviders(tmdbId, title.title_type);
            return { title, providers, error: false };
          })
        );

        // Process results
        for (const result of providerResults) {
          batchProcessed++;
          
          if (result.error || result.providers === null) {
            console.error(`Invalid tmdb_id for ${result.title.name}`);
            batchErrors++;
            continue;
          }

          const { title, providers } = result;
          console.log(`${title.name} (${title.title_type}): ${providers.length} providers [${providers.map(p => p.name).join(', ')}]`);

          if (dryRun) {
            if (providers.length > 0 && providers.length < 5) {
              batchFixed++;
              parallelFixed++;
            } else if (providers.length === 0) {
              batchNoProviders++;
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
            batchErrors++;
            continue;
          }

          // Insert correct providers (batch insert for speed)
          if (providers.length > 0) {
            const insertData = providers.map(provider => ({
              title_id: title.id,
              streaming_service_id: provider.serviceId,
              region_code: 'US'
            }));
            
            const { error: insertError } = await supabase
              .from('title_streaming_availability')
              .insert(insertData);
            
            if (insertError) {
              console.error(`Error inserting for ${title.name}:`, insertError);
              batchErrors++;
            } else {
              batchFixed++;
              parallelFixed++;
            }
          } else {
            batchNoProviders++;
          }
        }
        
        // Increment job count after each parallel batch (so progress is saved even if stopped)
        if (parallelFixed > 0 && !dryRun) {
          await supabase.rpc('increment_job_titles', { 
            p_job_type: 'fix_streaming', 
            p_increment: parallelFixed 
          });
        }
        
        // Small delay between parallel batches to respect TMDB rate limits (40 req/10s)
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Update totals
      totalProcessed += batchProcessed;
      totalFixed += batchFixed;
      totalNoProviders += batchNoProviders;
      totalErrors += batchErrors;

      console.log(`Batch ${batchNumber} complete: processed=${batchProcessed}, fixed=${batchFixed}, noProviders=${batchNoProviders}, errors=${batchErrors}`);
      console.log(`Running totals: processed=${totalProcessed}, fixed=${totalFixed}, noProviders=${totalNoProviders}, errors=${totalErrors}`);

      // Update job status periodically
      const duration = Math.round((Date.now() - startTime) / 1000);
      await supabase
        .from('jobs')
        .update({ 
          status: 'running',
          last_run_duration_seconds: duration
        })
        .eq('job_type', 'fix_streaming');

      // Small delay between main batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`COMPLETED: processed=${totalProcessed}, fixed=${totalFixed}, noProviders=${totalNoProviders}, errors=${totalErrors}, duration=${duration}s`);

    // Update job status to completed
    await supabase
      .from('jobs')
      .update({ 
        status: 'completed',
        last_run_at: new Date().toISOString(),
        last_run_duration_seconds: duration
      })
      .eq('job_type', 'fix_streaming');

    // Log to system_logs
    await supabase.from('system_logs').insert({
      severity: 'info',
      operation: 'fix-streaming-availability',
      error_message: `Completed: Fixed ${totalFixed} titles, ${totalNoProviders} with no providers, ${totalErrors} errors`,
      context: { totalProcessed, totalFixed, totalNoProviders, totalErrors, duration, dryRun, batchSize, batchesRun: batchNumber }
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        fixed: totalFixed,
        noProviders: totalNoProviders,
        errors: totalErrors,
        duration,
        dryRun,
        batchesRun: batchNumber
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

    // Mark job as failed
    await supabase
      .from('jobs')
      .update({ 
        status: 'failed',
        error_message: errorMessage
      })
      .eq('job_type', 'fix_streaming');

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
