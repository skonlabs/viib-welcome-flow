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

    // Create genre name to UUID mapping
    const genreNameToId: Record<string, string> = {};
    genres.forEach(g => {
      genreNameToId[g.genre_name.toLowerCase()] = g.id;
    });

    console.log(`Processing: ${languages.length} languages, ${streamingServices.length} services, years ${startYear}-${endYear}`);

    let totalProcessed = 0;
    const MAX_RUNTIME_MS = 90000; // 90 seconds safety margin

    // Process each combination - FETCH ALL GENRES TOGETHER, then map
    for (let year = startYear; year <= endYear; year++) {
      for (const language of languages) {
        // Check if we're approaching time limit
        const elapsed = Date.now() - startTime;
        if (elapsed > MAX_RUNTIME_MS) {
          console.log(`Approaching time limit at ${elapsed}ms. Stopping gracefully.`);
          break;
        }

        console.log(`Fetching: Year=${year}, Lang=${language.language_name}`);

        // Fetch movies (all genres in one call)
        const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_year=${year}&with_original_language=${language.language_code}&vote_average.gte=${minRating}&vote_count.gte=10&sort_by=popularity.desc&per_page=${titlesPerBatch}&page=1`;
        
        let moviesResponse;
        let moviesData;
        let movies = [];
        
        try {
          moviesResponse = await fetch(moviesUrl);
          moviesData = await moviesResponse.json();
          movies = moviesData.results || [];
          console.log(`Found ${movies.length} movies`);
        } catch (err) {
          console.error('Error fetching movies:', err);
        }

        for (const movie of movies) {
          try {
            // Insert/update title with TMDB ID
            const { data: insertedTitle, error: titleError } = await supabase
              .from('titles')
              .upsert({
                tmdb_id: movie.id,
                title_name: movie.title,
                original_title_name: movie.original_title,
                content_type: 'movie',
                release_year: new Date(movie.release_date || `${year}-01-01`).getFullYear(),
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

              // Insert language mapping
              await supabase
                .from('title_languages')
                .upsert({
                  title_id: insertedTitle.id,
                  language_code: language.language_code,
                  language_type: 'original'
                }, { onConflict: 'title_id,language_code,language_type' });

              // Insert streaming availability for all services
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

        // Clear movies array to free memory
        movies.length = 0;
        movies = [];
        moviesData = null;
        moviesResponse = null;

        // Fetch TV shows (all genres in one call)
        const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&first_air_date_year=${year}&with_original_language=${language.language_code}&vote_average.gte=${minRating}&vote_count.gte=10&sort_by=popularity.desc&per_page=${titlesPerBatch}&page=1`;
        
        let tvResponse;
        let tvData;
        let shows = [];
        
        try {
          tvResponse = await fetch(tvUrl);
          tvData = await tvResponse.json();
          shows = tvData.results || [];
          console.log(`Found ${shows.length} TV shows`);
        } catch (err) {
          console.error('Error fetching TV shows:', err);
        }

        for (const show of shows) {
          try {
            const { data: insertedTitle, error: titleError } = await supabase
              .from('titles')
              .upsert({
                tmdb_id: show.id,
                title_name: show.name,
                original_title_name: show.original_name,
                content_type: 'series',
                release_year: new Date(show.first_air_date || `${year}-01-01`).getFullYear(),
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

        // Clear TV shows array to free memory
        shows.length = 0;
        shows = [];
        tvData = null;
        tvResponse = null;

        // Update progress after each language
        await supabase
          .from('jobs')
          .update({ total_titles_processed: totalProcessed })
          .eq('job_type', 'full_refresh');
        console.log(`Progress: ${totalProcessed} titles processed (Year: ${year}, Lang: ${language.language_name})`);

        // Rate limit: 40 requests per second for TMDB
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check again after each year completes
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_RUNTIME_MS) {
        console.log(`Time limit reached after year ${year}. Stopping.`);
        break;
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