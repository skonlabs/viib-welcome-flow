import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MAX_RUNTIME_MS = 55000; // 55 seconds
const BATCH_SIZE = 50;

// Helper to check if a string is empty/null/whitespace
function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

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
    // Parse request body for jobId
    let jobId: string | null = null;
    try {
      const body = await req.json();
      jobId = body.jobId || null;
    } catch {
      // No body provided
    }

    console.log('Starting Enrich Title Details Batch job...');
    const startTime = Date.now();

    // Check if job was stopped by user
    if (jobId) {
      const { data: jobCheck } = await supabase
        .from('jobs')
        .select('status, is_active')
        .eq('id', jobId)
        .single();

      if (jobCheck?.status === 'stopped' || jobCheck?.status === 'idle' || !jobCheck?.is_active) {
        console.log('Job was stopped by user or deactivated, exiting...');
        return new Response(
          JSON.stringify({ success: true, message: 'Job stopped by user', processed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update job status to running
    if (jobId) {
      await supabase
        .from('jobs')
        .update({ 
          status: 'running', 
          last_run_at: new Date().toISOString(), 
          error_message: null 
        })
        .eq('id', jobId);
    }

    // Load job configuration
    const { data: jobData } = await supabase
      .from('jobs')
      .select('configuration')
      .eq('job_type', 'enrich_details')
      .single();

    const config = (jobData?.configuration as any) || {};
    const batchSize = config.batch_size || BATCH_SIZE;

    // Find titles that need enrichment:
    // - Has tmdb_id (so we can fetch from TMDB)
    // - Missing ANY of: overview, poster_path, or trailer_url
    const { data: titlesToEnrich, error: fetchError } = await supabase
      .from('titles')
      .select('id, tmdb_id, title_type, name, overview, poster_path, trailer_url, backdrop_path')
      .not('tmdb_id', 'is', null)
      .or('overview.is.null,overview.eq.,poster_path.is.null,poster_path.eq.,trailer_url.is.null,trailer_url.eq.')
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Error fetching titles: ${fetchError.message}`);
    }

    // Filter to only titles that actually need enrichment (handle empty strings too)
    const titlesNeedingEnrichment = (titlesToEnrich || []).filter(title => 
      isEmpty(title.overview) || isEmpty(title.poster_path) || isEmpty(title.trailer_url)
    );

    // Get count for remaining work
    const { count: remainingCount } = await supabase
      .from('titles')
      .select('id', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .or('overview.is.null,overview.eq.,poster_path.is.null,poster_path.eq.,trailer_url.is.null,trailer_url.eq.');

    const isComplete = titlesNeedingEnrichment.length === 0;

    if (isComplete) {
      console.log('No titles need enrichment - job complete');
      
      if (jobId) {
        await supabase
          .from('jobs')
          .update({ status: 'completed', error_message: null })
          .eq('id', jobId);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          message: 'All titles enriched - job complete',
          isComplete: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${titlesNeedingEnrichment.length} titles to enrich (${remainingCount || 0} total remaining)`);

    let processed = 0;
    let updated = 0;
    let errors = 0;
    let wasStoppedByUser = false;

    for (const title of titlesNeedingEnrichment) {
      // Check runtime limit
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`Stopping due to runtime limit. Processed: ${processed}`);
        break;
      }

      // Check if job was stopped mid-batch
      if (jobId && processed % 10 === 0 && processed > 0) {
        const { data: jobStatus } = await supabase
          .from('jobs')
          .select('status')
          .eq('id', jobId)
          .single();
        
        if (jobStatus?.status === 'stopped' || jobStatus?.status === 'idle') {
          console.log('Job stopped by user mid-batch');
          wasStoppedByUser = true;
          break;
        }
      }

      try {
        const endpoint = title.title_type === 'movie' ? 'movie' : 'tv';
        const updateData: Record<string, any> = {};
        const updates: string[] = [];

        // Fetch details from TMDB
        const tmdbUrl = `${TMDB_BASE_URL}/${endpoint}/${title.tmdb_id}?api_key=${TMDB_API_KEY}&append_to_response=videos`;
        const detailsRes = await fetch(tmdbUrl);

        if (!detailsRes.ok) {
          console.error(`TMDB API error for ${title.name} (tmdb_id: ${title.tmdb_id}): ${detailsRes.status}`);
          errors++;
          processed++;
          continue;
        }

        const details = await detailsRes.json();

        // Log what TMDB returned for debugging
        console.log(`TMDB response for ${title.name}: poster=${details.poster_path || 'null'}, overview=${details.overview ? 'yes' : 'null'}, videos=${details.videos?.results?.length || 0}`);

        // Update overview if missing/empty - always update from TMDB if we have data
        if (isEmpty(title.overview)) {
          if (details.overview) {
            updateData.overview = details.overview;
            updates.push('overview');
          } else {
            console.log(`  No overview from TMDB for ${title.name}`);
          }
        }

        // Update poster_path if missing/empty - always update from TMDB if we have data
        if (isEmpty(title.poster_path)) {
          if (details.poster_path) {
            updateData.poster_path = details.poster_path;
            updates.push('poster');
          } else {
            console.log(`  No poster_path from TMDB for ${title.name}`);
          }
        }

        // Update trailer_url if missing/empty
        if (isEmpty(title.trailer_url)) {
          // Look for trailer in the videos response
          const trailer = details.videos?.results?.find(
            (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
          );
          
          if (trailer) {
            updateData.trailer_url = `https://www.youtube.com/watch?v=${trailer.key}`;
            updateData.is_tmdb_trailer = true;
            updates.push('trailer');
          } else {
            // No trailer found - set is_tmdb_trailer to NULL to mark as checked
            updateData.is_tmdb_trailer = null;
            console.log(`  No trailer from TMDB for ${title.name}`);
          }
        }

        // Also grab backdrop if available and missing
        if (!title.backdrop_path && details.backdrop_path) {
          updateData.backdrop_path = details.backdrop_path;
        }

        // Update runtime for movies
        if (title.title_type === 'movie' && details.runtime) {
          updateData.runtime = details.runtime;
        }

        // Update episode_run_time for TV
        if (title.title_type === 'tv' && details.episode_run_time?.length > 0) {
          updateData.episode_run_time = details.episode_run_time;
        }

        // If we couldn't get ANY of the 3 required fields from TMDB, we need to mark
        // this title so we don't keep retrying it. Set placeholder values.
        const gotOverview = !isEmpty(title.overview) || details.overview;
        const gotPoster = !isEmpty(title.poster_path) || details.poster_path;
        const gotTrailer = !isEmpty(title.trailer_url) || details.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

        // If TMDB has no data for a field, mark it with a placeholder so we stop querying
        if (isEmpty(title.overview) && !details.overview) {
          updateData.overview = '[No overview available]';
          updates.push('overview-placeholder');
        }
        if (isEmpty(title.poster_path) && !details.poster_path) {
          updateData.poster_path = '/no-poster';
          updates.push('poster-placeholder');
        }

        // Always update if we have changes
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('titles')
            .update(updateData)
            .eq('id', title.id);

          if (updateError) {
            console.error(`Error updating ${title.name}:`, updateError);
            errors++;
          } else {
            updated++;
            console.log(`✓ Updated ${title.name}: ${updates.join(', ')}`);
          }
        } else {
          console.log(`  No updates needed for ${title.name}`);
        }

        processed++;

        // Rate limiting - be nice to TMDB API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`Error processing ${title.name}:`, err);
        errors++;
        processed++;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const moreRemaining = (remainingCount || 0) - processed > 0;
    
    console.log(`Batch completed: ${processed} processed, ${updated} updated, ${errors} errors in ${duration}s`);
    console.log(`Remaining: ~${(remainingCount || 0) - processed} titles`);

    // Update job status
    if (jobId) {
      await supabase
        .from('jobs')
        .update({ 
          status: (moreRemaining && !wasStoppedByUser) ? 'running' : 'completed',
          last_run_duration_seconds: duration,
          ...((!moreRemaining || wasStoppedByUser) ? { error_message: null } : {})
        })
        .eq('id', jobId);

      // Increment counter
      if (updated > 0) {
        await supabase.rpc('increment_job_titles', { 
          p_job_type: 'enrich_details', 
          p_increment: updated 
        });
      }
    }

    // Check job status AGAIN before scheduling next batch (user may have stopped it)
    let shouldScheduleNext = moreRemaining && !wasStoppedByUser && jobId;
    
    if (shouldScheduleNext && jobId) {
      const { data: finalJobCheck } = await supabase
        .from('jobs')
        .select('status, is_active')
        .eq('id', jobId)
        .single();
      
      if (finalJobCheck?.status === 'stopped' || finalJobCheck?.status === 'idle' || !finalJobCheck?.is_active) {
        console.log('Job was stopped before scheduling next batch, not continuing');
        shouldScheduleNext = false;
      }
    }

    // Schedule next batch if more work remains and job is still active
    if (shouldScheduleNext && jobId) {
      console.log('More work remaining, scheduling next batch...');
      
      const invokeNextBatch = async () => {
        try {
          // Double-check job status before actually invoking
          const { data: preInvokeCheck } = await supabase
            .from('jobs')
            .select('status, is_active')
            .eq('id', jobId)
            .single();
          
          if (preInvokeCheck?.status === 'stopped' || preInvokeCheck?.status === 'idle' || !preInvokeCheck?.is_active) {
            console.log('Job stopped before next batch invocation, aborting');
            return;
          }
          
          const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich-title-details-batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ jobId })
          });
          
          if (!response.ok) {
            console.error('Failed to invoke next batch:', await response.text());
          } else {
            console.log('Next batch invoked successfully');
          }
        } catch (e) {
          console.error('Error invoking next batch:', e);
        }
      };

      // Use EdgeRuntime.waitUntil for reliable background continuation
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(invokeNextBatch());
        console.log('Next batch scheduled via EdgeRuntime.waitUntil');
      } else {
        invokeNextBatch();
        console.log('Next batch dispatched (no EdgeRuntime available)');
      }
    } else if (wasStoppedByUser || !shouldScheduleNext) {
      console.log('Job was stopped by user, not scheduling next batch');
    } else if (!moreRemaining) {
      console.log('All titles enriched, job complete');
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        updated,
        errors,
        duration_seconds: duration,
        remaining: (remainingCount || 0) - processed,
        isComplete: !moreRemaining,
        message: moreRemaining ? 'Batch completed, more work remaining' : 'All titles enriched'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enrich batch job error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase
      .from('jobs')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('job_type', 'enrich_details');

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
