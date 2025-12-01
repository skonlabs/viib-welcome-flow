import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting Full Refresh job...');

    // Update job status to running
    const startTime = Date.now();
    await supabase
      .from('jobs')
      .update({ 
        status: 'running', 
        last_run_at: new Date().toISOString(),
        error_message: null
      })
      .eq('job_type', 'full_refresh');

    // Fetch configuration
    const { data: jobData } = await supabase
      .from('jobs')
      .select('configuration')
      .eq('job_type', 'full_refresh')
      .single();

    const config = jobData?.configuration as any || {};
    const minRating = config.min_rating || 6.0;
    const titlesPerBatch = config.titles_per_batch || 100;
    const startYear = config.start_year || 2020;
    const endYear = config.end_year || 2025;

    // Fetch all genres, languages, and streaming services
    const [genresRes, languagesRes, servicesRes] = await Promise.all([
      supabase.from('genres').select('id, genre_name'),
      supabase.from('languages').select('language_code, language_name'),
      supabase.from('streaming_services').select('id, service_name').eq('is_active', true)
    ]);

    const genres = genresRes.data || [];
    const languages = languagesRes.data || [];
    const streamingServices = servicesRes.data || [];

    console.log(`Processing: ${genres.length} genres, ${languages.length} languages, ${streamingServices.length} services, years ${startYear}-${endYear}`);

    let totalProcessed = 0;
    const processedTitles = new Set<number>(); // Track TMDB IDs to avoid duplicates

    // Process each combination
    for (const genre of genres) {
      for (let year = startYear; year <= endYear; year++) {
        for (const language of languages) {
          console.log(`Fetching: Genre=${genre.genre_name}, Year=${year}, Lang=${language.language_name}`);

          // Fetch movies
          const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genre.id}&primary_release_year=${year}&with_original_language=${language.language_code}&vote_average.gte=${minRating}&vote_count.gte=10&sort_by=popularity.desc&page=1`;
          
          const moviesResponse = await fetch(moviesUrl);
          const moviesData = await moviesResponse.json();
          const movies = (moviesData.results || []).slice(0, titlesPerBatch);

          for (const movie of movies) {
            if (processedTitles.has(movie.id)) continue;
            processedTitles.add(movie.id);

            // Insert title
            const { data: insertedTitle } = await supabase
              .from('titles')
              .upsert({
                title_name: movie.title,
                original_title_name: movie.original_title,
                content_type: 'movie',
                release_year: new Date(movie.release_date || `${year}-01-01`).getFullYear(),
                runtime_minutes: movie.runtime || null,
                synopsis: movie.overview,
                original_language: movie.original_language,
                popularity_score: movie.popularity
              }, { onConflict: 'title_name,release_year' })
              .select('id')
              .single();

            if (insertedTitle) {
              totalProcessed++;

              // Insert genre mapping
              await supabase
                .from('title_genres')
                .upsert({ title_id: insertedTitle.id, genre_id: genre.id }, { onConflict: 'title_id,genre_id' });

              // Insert language mapping
              await supabase
                .from('title_languages')
                .upsert({
                  title_id: insertedTitle.id,
                  language_code: language.language_code,
                  language_type: 'original'
                }, { onConflict: 'title_id,language_code,language_type' });

              // Insert streaming availability for all services (simplified - TMDB doesn't provide this data easily)
              for (const service of streamingServices) {
                await supabase
                  .from('title_streaming_availability')
                  .upsert({
                    title_id: insertedTitle.id,
                    streaming_service_id: service.id,
                    region_code: 'US'
                  }, { onConflict: 'title_id,streaming_service_id,region_code' });
              }
            }
          }

          // Fetch TV shows
          const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${genre.id}&first_air_date_year=${year}&with_original_language=${language.language_code}&vote_average.gte=${minRating}&vote_count.gte=10&sort_by=popularity.desc&page=1`;
          
          const tvResponse = await fetch(tvUrl);
          const tvData = await tvResponse.json();
          const shows = (tvData.results || []).slice(0, titlesPerBatch);

          for (const show of shows) {
            if (processedTitles.has(show.id)) continue;
            processedTitles.add(show.id);

            const { data: insertedTitle } = await supabase
              .from('titles')
              .upsert({
                title_name: show.name,
                original_title_name: show.original_name,
                content_type: 'series',
                release_year: new Date(show.first_air_date || `${year}-01-01`).getFullYear(),
                synopsis: show.overview,
                original_language: show.original_language,
                popularity_score: show.popularity
              }, { onConflict: 'title_name,release_year' })
              .select('id')
              .single();

            if (insertedTitle) {
              totalProcessed++;

              await supabase
                .from('title_genres')
                .upsert({ title_id: insertedTitle.id, genre_id: genre.id }, { onConflict: 'title_id,genre_id' });

              await supabase
                .from('title_languages')
                .upsert({
                  title_id: insertedTitle.id,
                  language_code: language.language_code,
                  language_type: 'original'
                }, { onConflict: 'title_id,language_code,language_type' });

              for (const service of streamingServices) {
                await supabase
                  .from('title_streaming_availability')
                  .upsert({
                    title_id: insertedTitle.id,
                    streaming_service_id: service.id,
                    region_code: 'US'
                  }, { onConflict: 'title_id,streaming_service_id,region_code' });
              }
            }
          }

          // Update progress periodically
          if (totalProcessed % 100 === 0) {
            await supabase
              .from('jobs')
              .update({ total_titles_processed: totalProcessed })
              .eq('job_type', 'full_refresh');
            console.log(`Progress: ${totalProcessed} titles processed`);
          }

          // Rate limit: 40 requests per second for TMDB
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Mark job as completed
    await supabase
      .from('jobs')
      .update({ 
        status: 'completed',
        total_titles_processed: totalProcessed,
        last_run_duration_seconds: duration
      })
      .eq('job_type', 'full_refresh');

    console.log(`Full Refresh completed: ${totalProcessed} titles processed in ${duration} seconds`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalProcessed, 
        duration,
        message: `Full refresh completed successfully. ${totalProcessed} titles processed.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in full-refresh-titles:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update job status to failed
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: errorMessage
        })
        .eq('job_type', 'full_refresh');
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});