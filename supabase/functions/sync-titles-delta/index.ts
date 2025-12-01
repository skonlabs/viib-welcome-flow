import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMDB Genre ID to Name mapping
const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
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

    console.log('Starting Sync Delta job...');

    // Update job status to running
    const startTime = Date.now();
    await supabase
      .from('jobs')
      .update({ 
        status: 'running', 
        last_run_at: new Date().toISOString(),
        error_message: null
      })
      .eq('job_type', 'sync_delta');

    // Fetch configuration
    const { data: jobData } = await supabase
      .from('jobs')
      .select('configuration')
      .eq('job_type', 'sync_delta')
      .single();

    const config = jobData?.configuration as any || {};
    const minRating = config.min_rating || 6.0;
    const lookbackDays = config.lookback_days || 7;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch all genres, languages, and streaming services
    const [genresRes, languagesRes, servicesRes] = await Promise.all([
      supabase.from('genres').select('id, genre_name'),
      supabase.from('languages').select('language_code, language_name'),
      supabase.from('streaming_services').select('id, service_name').eq('is_active', true)
    ]);

    const genres = genresRes.data || [];
    const languages = languagesRes.data || [];
    const streamingServices = servicesRes.data || [];

    // Create genre name to UUID mapping
    const genreNameToId: Record<string, string> = {};
    genres.forEach(g => {
      genreNameToId[g.genre_name.toLowerCase()] = g.id;
    });

    console.log(`Syncing titles from ${startDateStr} to ${endDateStr}`);
    console.log(`Processing: ${languages.length} languages, ${streamingServices.length} services`);

    let totalProcessed = 0;

    // Process each language
    for (const language of languages) {
      console.log(`Fetching: Lang=${language.language_name}`);

      // Fetch new movies
      const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_date.gte=${startDateStr}&primary_release_date.lte=${endDateStr}&with_original_language=${language.language_code}&vote_average.gte=${minRating}&vote_count.gte=5&sort_by=release_date.desc&page=1`;
      
      const moviesResponse = await fetch(moviesUrl);
      const moviesData = await moviesResponse.json();
      const movies = moviesData.results || [];

      console.log(`Found ${movies.length} new movies`);

      for (const movie of movies) {
        try {
          const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : new Date().getFullYear();

          const { data: insertedTitle, error: titleError } = await supabase
            .from('titles')
            .upsert({
              tmdb_id: movie.id,
              title_name: movie.title,
              original_title_name: movie.original_title,
              content_type: 'movie',
              release_year: releaseYear,
              runtime_minutes: movie.runtime || null,
              synopsis: movie.overview,
              original_language: movie.original_language,
              popularity_score: movie.popularity
            }, { onConflict: 'tmdb_id,content_type' })
            .select('id')
            .single();

          if (titleError) {
            console.error(`Error inserting movie ${movie.title}:`, titleError);
            continue;
          }

          if (insertedTitle) {
            totalProcessed++;

            // Map TMDB genre IDs to our genre UUIDs
            const tmdbGenreIds = movie.genre_ids || [];
            for (const tmdbGenreId of tmdbGenreIds) {
              const genreName = TMDB_GENRE_MAP[tmdbGenreId];
              if (genreName) {
                const genreId = genreNameToId[genreName.toLowerCase()];
                if (genreId) {
                  await supabase
                    .from('title_genres')
                    .upsert({ title_id: insertedTitle.id, genre_id: genreId }, { onConflict: 'title_id,genre_id' });
                }
              }
            }

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
        } catch (error) {
          console.error(`Error processing movie ${movie.title}:`, error);
        }
      }

      // Fetch new TV shows
      const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&first_air_date.gte=${startDateStr}&first_air_date.lte=${endDateStr}&with_original_language=${language.language_code}&vote_average.gte=${minRating}&vote_count.gte=5&sort_by=first_air_date.desc&page=1`;
      
      const tvResponse = await fetch(tvUrl);
      const tvData = await tvResponse.json();
      const shows = tvData.results || [];

      console.log(`Found ${shows.length} new TV shows`);

      for (const show of shows) {
        try {
          const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : new Date().getFullYear();

          const { data: insertedTitle, error: titleError } = await supabase
            .from('titles')
            .upsert({
              tmdb_id: show.id,
              title_name: show.name,
              original_title_name: show.original_name,
              content_type: 'series',
              release_year: releaseYear,
              synopsis: show.overview,
              original_language: show.original_language,
              popularity_score: show.popularity
            }, { onConflict: 'tmdb_id,content_type' })
            .select('id')
            .single();

          if (titleError) {
            console.error(`Error inserting show ${show.name}:`, titleError);
            continue;
          }

          if (insertedTitle) {
            totalProcessed++;

            // Map TMDB genre IDs to our genre UUIDs
            const tmdbGenreIds = show.genre_ids || [];
            for (const tmdbGenreId of tmdbGenreIds) {
              const genreName = TMDB_GENRE_MAP[tmdbGenreId];
              if (genreName) {
                const genreId = genreNameToId[genreName.toLowerCase()];
                if (genreId) {
                  await supabase
                    .from('title_genres')
                    .upsert({ title_id: insertedTitle.id, genre_id: genreId }, { onConflict: 'title_id,genre_id' });
                }
              }
            }

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
        } catch (error) {
          console.error(`Error processing show ${show.name}:`, error);
        }
      }

      // Update progress periodically
      if (totalProcessed % 50 === 0 && totalProcessed > 0) {
        await supabase
          .from('jobs')
          .update({ total_titles_processed: totalProcessed })
          .eq('job_type', 'sync_delta');
        console.log(`Progress: ${totalProcessed} new titles synced`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Calculate next run (tomorrow at 2 AM)
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(2, 0, 0, 0);

    // Mark job as completed
    await supabase
      .from('jobs')
      .update({ 
        status: 'completed',
        total_titles_processed: totalProcessed,
        last_run_duration_seconds: duration,
        next_run_at: nextRun.toISOString()
      })
      .eq('job_type', 'sync_delta');

    console.log(`Sync Delta completed: ${totalProcessed} new titles synced in ${duration} seconds`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalProcessed, 
        duration,
        message: `Sync completed successfully. ${totalProcessed} new titles added.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-titles-delta:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update job status to failed
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const nextRun = new Date();
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(2, 0, 0, 0);

      await supabase
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: errorMessage,
          next_run_at: nextRun.toISOString()
        })
        .eq('job_type', 'sync_delta');
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});