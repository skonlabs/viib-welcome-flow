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

    // Find titles that ACTUALLY need enrichment:
    // - Has tmdb_id (so we can fetch from TMDB)
    // - Missing poster_path (we need to get poster)
    // Priority by popularity to handle most important titles first
    const { data: titlesNeedingPoster, error: posterError } = await supabase
      .from('titles')
      .select('id, tmdb_id, title_type, name, poster_path, trailer_url')
      .not('tmdb_id', 'is', null)
      .is('poster_path', null)
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(batchSize);

    if (posterError) {
      throw new Error(`Error fetching titles needing poster: ${posterError.message}`);
    }

    // Also find titles missing trailer_url (separately, to not mix concerns)
    // Only if we have room in this batch
    const remainingBatchSize = batchSize - (titlesNeedingPoster?.length || 0);
    let titlesNeedingTrailer: any[] = [];
    
    if (remainingBatchSize > 0) {
      const { data: trailerTitles, error: trailerError } = await supabase
        .from('titles')
        .select('id, tmdb_id, title_type, name, poster_path, trailer_url')
        .not('tmdb_id', 'is', null)
        .not('poster_path', 'is', null) // Already has poster
        .is('trailer_url', null) // Missing trailer
        .is('is_tmdb_trailer', null) // Haven't checked TMDB yet for trailer
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(remainingBatchSize);

      if (trailerError) {
        console.error(`Error fetching titles needing trailer: ${trailerError.message}`);
      } else {
        titlesNeedingTrailer = trailerTitles || [];
      }
    }

    // Combine the lists (posters first, then trailers)
    const titlesToEnrich = [...(titlesNeedingPoster || []), ...titlesNeedingTrailer];

    // Get counts for remaining work
    const { count: remainingPosterCount } = await supabase
      .from('titles')
      .select('id', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .is('poster_path', null);

    const { count: remainingTrailerCount } = await supabase
      .from('titles')
      .select('id', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .not('poster_path', 'is', null)
      .is('trailer_url', null)
      .is('is_tmdb_trailer', null);

    const totalRemaining = (remainingPosterCount || 0) + (remainingTrailerCount || 0);
    const isComplete = titlesToEnrich.length === 0;

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

    console.log(`Found ${titlesToEnrich.length} titles to enrich (${remainingPosterCount || 0} need poster, ${remainingTrailerCount || 0} need trailer check)`);

    let processed = 0;
    let postersUpdated = 0;
    let trailersUpdated = 0;
    let errors = 0;
    let wasStoppedByUser = false;

    for (const title of titlesToEnrich) {
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
        let needsTmdbCall = false;

        // Determine what we need from TMDB
        const needsPoster = !title.poster_path;
        const needsTrailer = !title.trailer_url;

        if (needsPoster || needsTrailer) {
          needsTmdbCall = true;
        }

        if (!needsTmdbCall) {
          processed++;
          continue;
        }

        // Fetch details from TMDB (only if we need poster or other metadata)
        if (needsPoster) {
          const detailsRes = await fetch(
            `${TMDB_BASE_URL}/${endpoint}/${title.tmdb_id}?api_key=${TMDB_API_KEY}`
          );

          if (!detailsRes.ok) {
            console.error(`TMDB API error for ${title.name}: ${detailsRes.status}`);
            errors++;
            processed++;
            continue;
          }

          const details = await detailsRes.json();

          // Update poster_path if missing and available
          if (!title.poster_path && details.poster_path) {
            updateData.poster_path = details.poster_path;
            postersUpdated++;
            console.log(`✓ Poster: ${title.name}`);
          }

          // Also grab backdrop if available
          if (details.backdrop_path) {
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
        }

        // Fetch trailer if missing (separate API call to videos endpoint)
        if (needsTrailer) {
          const videosRes = await fetch(
            `${TMDB_BASE_URL}/${endpoint}/${title.tmdb_id}/videos?api_key=${TMDB_API_KEY}`
          );

          if (videosRes.ok) {
            const videosData = await videosRes.json();
            const trailer = videosData.results?.find(
              (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
            );
            
            if (trailer) {
              updateData.trailer_url = `https://www.youtube.com/watch?v=${trailer.key}`;
              updateData.is_tmdb_trailer = true;
              trailersUpdated++;
              console.log(`✓ Trailer: ${title.name}`);
            } else {
              // Mark that we checked TMDB but no trailer found
              // This prevents re-checking this title
              updateData.is_tmdb_trailer = false;
              console.log(`○ No TMDB trailer: ${title.name}`);
            }
          }
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
          }
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
    const moreRemaining = totalRemaining - processed > 0;
    
    console.log(`Batch completed: ${processed} processed, ${postersUpdated} posters, ${trailersUpdated} trailers, ${errors} errors in ${duration}s`);
    console.log(`Remaining: ~${totalRemaining - processed} titles`);

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
      const totalUpdated = postersUpdated + trailersUpdated;
      if (totalUpdated > 0) {
        await supabase.rpc('increment_job_titles', { 
          p_job_type: 'enrich_details', 
          p_increment: totalUpdated 
        });
      }
    }

    // Schedule next batch if more work remains and not stopped by user
    if (moreRemaining && !wasStoppedByUser && jobId) {
      console.log('More work remaining, scheduling next batch...');
      
      const invokeNextBatch = async () => {
        try {
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
    } else if (wasStoppedByUser) {
      console.log('Job was stopped by user, not scheduling next batch');
    } else if (!moreRemaining) {
      console.log('All titles enriched, job complete');
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        postersUpdated,
        trailersUpdated,
        errors,
        duration_seconds: duration,
        remainingPosters: (remainingPosterCount || 0) - postersUpdated,
        remainingTrailers: (remainingTrailerCount || 0),
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
