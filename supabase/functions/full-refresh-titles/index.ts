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

    // Parse request body for parameters
    let requestBody: any = {};
    try {
      const text = await req.text();
      if (text) requestBody = JSON.parse(text);
    } catch (e) {
      // Ignore if no body or invalid JSON
    }

    console.log('Starting Full Refresh job...', requestBody);

    const startTime = Date.now();
    
    const jobId = requestBody.jobId; // Extract job ID if provided

    // Fetch configuration
    const { data: jobData } = await supabase
      .from('jobs')
      .select('configuration')
      .eq('job_type', 'full_refresh')
      .single();

    const config = jobData?.configuration as any || {};
    const minRating = config.min_rating || 6.0;
    
    // CRITICAL: This edge function now processes exactly ONE language + year + genre combination
    const languageCode = requestBody.languageCode; // Required
    const year = requestBody.startYear; // Required (single year)
    const tmdbGenreId = requestBody.genreId; // Required

    if (!languageCode || !year || !tmdbGenreId) {
      throw new Error('Missing required parameters: languageCode, startYear, genreId');
    }

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

    const genreName = TMDB_GENRE_MAP[tmdbGenreId];
    console.log(`Processing: Language=${languageCode}, Year=${year}, Genre=${genreName} (ID: ${tmdbGenreId})`);

    let totalProcessed = 0;
    const MAX_RUNTIME_MS = 90000; // 90 seconds safety margin

    // Fetch movies with pagination (TMDB limits to 20 pages = 500 results max per query)
    let moviePage = 1;
    let movieTotalPages = 1;
    
    while (moviePage <= movieTotalPages && moviePage <= 20) {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_RUNTIME_MS) {
        console.log(`Approaching time limit at ${elapsed}ms. Stopping gracefully.`);
        break;
      }

      const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_year=${year}&with_genres=${tmdbGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&vote_count.gte=10&sort_by=popularity.desc&page=${moviePage}`;
      
      try {
        const moviesResponse = await fetch(moviesUrl);
        const moviesData = await moviesResponse.json();
        const movies = moviesData.results || [];
        movieTotalPages = Math.min(moviesData.total_pages || 1, 20);
        console.log(`Found ${movies.length} movies (page ${moviePage}/${movieTotalPages})`);

        for (const movie of movies) {
          try {
            // Check if title already exists - skip if it does
            const { data: existingTitle } = await supabase
              .from('titles')
              .select('id')
              .eq('tmdb_id', movie.id)
              .eq('content_type', 'movie')
              .maybeSingle();

            if (existingTitle) {
              // Title already exists, skip all processing
              continue;
            }

            // Insert new title only
            const { data: insertedTitle, error: titleError } = await supabase
              .from('titles')
              .insert({
                tmdb_id: movie.id,
                title_name: movie.title,
                original_title_name: movie.original_title,
                content_type: 'movie',
                release_year: new Date(movie.release_date || `${year}-01-01`).getFullYear(),
                runtime_minutes: movie.runtime || null,
                synopsis: movie.overview,
                original_language: movie.original_language,
                popularity_score: movie.popularity
              })
              .select('id')
              .single();

            if (titleError) {
              console.error(`Error inserting movie ${movie.title}:`, titleError);
              continue;
            }

            if (insertedTitle) {
              totalProcessed++;

              // Map TMDB genre IDs to our genre UUIDs
              const movieGenreIds = movie.genre_ids || [];
              for (const genreId of movieGenreIds) {
                const genreName = TMDB_GENRE_MAP[genreId];
                if (genreName) {
                  const ourGenreId = genreNameToId[genreName.toLowerCase()];
                  if (ourGenreId) {
                    await supabase
                      .from('title_genres')
                      .upsert({ title_id: insertedTitle.id, genre_id: ourGenreId }, { onConflict: 'title_id,genre_id' });
                  }
                }
              }

              // Store original language if available
              if (movie.original_language) {
                const langExists = languages.find(l => l.language_code === movie.original_language);
                if (langExists) {
                  await supabase
                    .from('title_languages')
                    .upsert({
                      title_id: insertedTitle.id,
                      language_code: movie.original_language,
                      language_type: 'original'
                    }, { onConflict: 'title_id,language_code,language_type' });
                }
              }

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

        moviePage++;
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (err) {
        console.error('Error fetching movies page:', err);
        break;
      }
    }

    // Fetch TV shows with pagination (TMDB limits to 20 pages = 500 results max per query)
    let tvPage = 1;
    let tvTotalPages = 1;
    
    while (tvPage <= tvTotalPages && tvPage <= 20) {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_RUNTIME_MS) {
        console.log(`Approaching time limit at ${elapsed}ms. Stopping gracefully.`);
        break;
      }

      const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&first_air_date_year=${year}&with_genres=${tmdbGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&vote_count.gte=10&sort_by=popularity.desc&page=${tvPage}`;
      
      try {
        const tvResponse = await fetch(tvUrl);
        const tvData = await tvResponse.json();
        const shows = tvData.results || [];
        tvTotalPages = Math.min(tvData.total_pages || 1, 20);
        console.log(`Found ${shows.length} TV shows (page ${tvPage}/${tvTotalPages})`);

        for (const show of shows) {
          try {
            // Check if title already exists - skip if it does
            const { data: existingTitle } = await supabase
              .from('titles')
              .select('id')
              .eq('tmdb_id', show.id)
              .eq('content_type', 'series')
              .maybeSingle();

            if (existingTitle) {
              // Title already exists, skip all processing
              continue;
            }

            // Insert new title only
            const { data: insertedTitle, error: titleError } = await supabase
              .from('titles')
              .insert({
                tmdb_id: show.id,
                title_name: show.name,
                original_title_name: show.original_name,
                content_type: 'series',
                release_year: new Date(show.first_air_date || `${year}-01-01`).getFullYear(),
                synopsis: show.overview,
                original_language: show.original_language,
                popularity_score: show.popularity
              })
              .select('id')
              .single();

            if (titleError) {
              console.error(`Error inserting show ${show.name}:`, titleError);
              continue;
            }

            if (insertedTitle) {
              totalProcessed++;

              const showGenreIds = show.genre_ids || [];
              for (const genreId of showGenreIds) {
                const genreName = TMDB_GENRE_MAP[genreId];
                if (genreName) {
                  const ourGenreId = genreNameToId[genreName.toLowerCase()];
                  if (ourGenreId) {
                    await supabase
                      .from('title_genres')
                      .upsert({ title_id: insertedTitle.id, genre_id: ourGenreId }, { onConflict: 'title_id,genre_id' });
                  }
                }
              }

              // Store original language if available
              if (show.original_language) {
                const langExists = languages.find(l => l.language_code === show.original_language);
                if (langExists) {
                  await supabase
                    .from('title_languages')
                    .upsert({
                      title_id: insertedTitle.id,
                      language_code: show.original_language,
                      language_type: 'original'
                    }, { onConflict: 'title_id,language_code,language_type' });
                }
              }

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

        tvPage++;
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (err) {
        console.error('Error fetching TV shows page:', err);
        break;
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Use atomic increment to avoid race conditions across parallel threads
    const { error: incrementError } = await supabase.rpc('increment_job_titles', {
      p_job_type: 'full_refresh',
      p_increment: totalProcessed
    });

    if (incrementError) {
      console.error('Error incrementing title count:', incrementError);
    }
    
    // Always update duration for this specific job (not by job_type, by jobId if provided)
    if (jobId) {
      await supabase
        .from('jobs')
        .update({ 
          last_run_duration_seconds: duration
        })
        .eq('id', jobId);
    }

    // Update thread tracking in job configuration
    if (jobId) {
      const { data: currentJob } = await supabase
        .from('jobs')
        .select('configuration, status')
        .eq('id', jobId)
        .single();
      
      // Don't update if job was stopped by admin
      if (currentJob?.status === 'failed' || currentJob?.status === 'idle') {
        console.log('Job was stopped, skipping tracking update');
        return new Response(
          JSON.stringify({ 
            success: true, 
            totalProcessed, 
            duration,
            message: 'Job was stopped, skipping update'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const currentConfig = (currentJob?.configuration as any) || {};
      const tracking = currentConfig.thread_tracking || { succeeded: 0, failed: 0 };
      
      await supabase
        .from('jobs')
        .update({
          configuration: {
            ...currentConfig,
            thread_tracking: {
              succeeded: tracking.succeeded + 1,
              failed: tracking.failed
            }
          }
        })
        .eq('id', jobId)
        .eq('status', 'running'); // Only update if still running
    }

    console.log(`Full Refresh completed: ${totalProcessed} titles processed in ${duration} seconds for ${languageCode}/${year}/${genreName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalProcessed, 
        duration,
        language: languageCode,
        year,
        genre: genreName,
        message: `Full refresh completed successfully. ${totalProcessed} titles processed.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in full-refresh-titles:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Track failed thread
    try {
      const requestBody = await req.clone().json();
      const jobId = requestBody.jobId;
      
      if (jobId) {
        const { data: currentJob } = await supabase
          .from('jobs')
          .select('configuration, status')
          .eq('id', jobId)
          .single();
        
        // Don't update if job was stopped by admin
        if (currentJob?.status === 'failed' || currentJob?.status === 'idle') {
          console.log('Job was stopped, skipping failure tracking');
        } else {
          const currentConfig = (currentJob?.configuration as any) || {};
          const tracking = currentConfig.thread_tracking || { succeeded: 0, failed: 0 };
          
          await supabase
            .from('jobs')
            .update({
              configuration: {
                ...currentConfig,
                thread_tracking: {
                  succeeded: tracking.succeeded,
                  failed: tracking.failed + 1
                }
              }
            })
            .eq('id', jobId)
            .eq('status', 'running'); // Only update if still running
        }
      }
    } catch (trackError) {
      console.error('Error tracking failure:', trackError);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
