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

// TMDB Provider ID to service name mapping (US region)
const TMDB_PROVIDER_MAP: Record<number, string> = {
  8: 'Netflix',
  9: 'Prime Video',
  119: 'Prime Video', // Amazon Video
  15: 'Hulu',
  350: 'Apple TV',
  2: 'Apple TV', // Apple iTunes
  337: 'DisneyPlus',
  390: 'DisneyPlus', // Disney+ variant
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
  const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
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
    let requestBody: any = {};
    try {
      const text = await req.text();
      if (text) requestBody = JSON.parse(text);
    } catch (e) {
      // Ignore if no body or invalid JSON
    }

    console.log('Starting Full Refresh job...', requestBody);

    const startTime = Date.now();
    const jobId = requestBody.jobId;

    const { data: jobData } = await supabase
      .from('jobs')
      .select('configuration')
      .eq('job_type', 'full_refresh')
      .single();

    const config = jobData?.configuration as any || {};
    const minRating = config.min_rating || 6.0;
    
    const languageCode = requestBody.languageCode;
    const year = requestBody.startYear;
    const tmdbGenreId = requestBody.genreId;

    if (!languageCode || !year || !tmdbGenreId) {
      throw new Error('Missing required parameters: languageCode, startYear, genreId');
    }

    // Fetch all genres
    const { data: genres } = await supabase.from('genres').select('id, genre_name, tmdb_genre_id');

    const genreNameToId: Record<string, string> = {};
    (genres || []).forEach(g => {
      genreNameToId[g.genre_name.toLowerCase()] = g.id;
    });

    // Fetch supported streaming services
    const { data: streamingServices } = await supabase
      .from('streaming_services')
      .select('id, service_name')
      .eq('is_active', true);

    const serviceNameToId: Record<string, string> = {};
    (streamingServices || []).forEach(s => {
      serviceNameToId[s.service_name.toLowerCase()] = s.id;
    });

    console.log(`Supported streaming services: ${Object.keys(serviceNameToId).join(', ')}`);

    // Fetch official trailer channels from database
    const { data: officialChannels } = await supabase
      .from('official_trailer_channels')
      .select('channel_name, language_code, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    console.log(`Loaded ${officialChannels?.length || 0} official trailer channels`);

    const genreName = TMDB_GENRE_MAP[tmdbGenreId];
    console.log(`Processing: Language=${languageCode}, Year=${year}, Genre=${genreName} (ID: ${tmdbGenreId})`);

    let totalProcessed = 0;
    let skippedNoProvider = 0;
    const MAX_RUNTIME_MS = 90000;

    // Helper function to fetch watch providers from TMDB
    async function fetchWatchProviders(tmdbId: number, titleType: string): Promise<{ providers: Array<{ tmdbId: number; name: string; serviceId: string }> }> {
      try {
        const endpoint = titleType === 'movie' ? 'movie' : 'tv';
        const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return { providers: [] };
        
        const data = await res.json();
        const usProviders = data.results?.US?.flatrate || [];
        
        const matchedProviders: Array<{ tmdbId: number; name: string; serviceId: string }> = [];
        
        for (const provider of usProviders) {
          const mappedName = TMDB_PROVIDER_MAP[provider.provider_id];
          if (mappedName) {
            const serviceId = serviceNameToId[mappedName.toLowerCase()];
            if (serviceId) {
              matchedProviders.push({
                tmdbId: provider.provider_id,
                name: mappedName,
                serviceId
              });
            }
          }
        }
        
        return { providers: matchedProviders };
      } catch (e) {
        console.error(`Error fetching watch providers for ${tmdbId}:`, e);
        return { providers: [] };
      }
    }

    // Helper function to fetch trailer from TMDB or YouTube (official channels only)
    // For TV series, fetches the latest season's trailer first
    async function fetchTrailer(tmdbId: number, titleType: string, titleName: string, releaseYear: number | null, titleLang: string = 'en', latestSeasonNumber?: number): Promise<{ url: string | null, isTmdbTrailer: boolean }> {
      try {
        let trailerKey: string | null = null;

        // For TV series, try to get the latest season's trailer first
        if (titleType === 'tv' && latestSeasonNumber && latestSeasonNumber > 0) {
          const seasonVideosRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${latestSeasonNumber}/videos?api_key=${TMDB_API_KEY}`);
          if (seasonVideosRes.ok) {
            const seasonVideosData = await seasonVideosRes.json();
            const seasonTrailer = seasonVideosData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
            if (seasonTrailer) {
              trailerKey = seasonTrailer.key;
              console.log(`Found season ${latestSeasonNumber} trailer for ${titleName}`);
            }
          }
        }

        // Fallback to series/movie level trailer if no season trailer found
        if (!trailerKey) {
          const endpoint = titleType === 'movie' ? 'movie' : 'tv';
          const videosRes = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`);
          
          if (videosRes.ok) {
            const videosData = await videosRes.json();
            const trailer = videosData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
            if (trailer) {
              trailerKey = trailer.key;
            }
          }
        }

        if (trailerKey) {
          return { url: `https://www.youtube.com/watch?v=${trailerKey}`, isTmdbTrailer: true };
        }

        // YouTube fallback - search official channels only
        if (YOUTUBE_API_KEY) {
          // Get official channel names for this language + global channels
          const relevantChannels = (officialChannels || []).filter(c => 
            c.language_code === titleLang || c.language_code === 'global' || c.language_code === 'en'
          ).map(c => c.channel_name.toLowerCase());

          const searchQuery = `${titleName} ${releaseYear || ''} official trailer`;
          const youtubeRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`
          );
          if (youtubeRes.ok) {
            const searchData = await youtubeRes.json();
            
            // First try to find a result from an official trailer channel (matched by name)
            const officialChannelTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
              return relevantChannels.some(officialName => channelTitle.includes(officialName.toLowerCase()));
            });

            if (officialChannelTrailer) {
              return { url: `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`, isTmdbTrailer: false };
            }
            
            // Fallback: find results with "official trailer" in title from verified-looking channels
            const verifiedTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
              const videoTitle = item.snippet.title?.toLowerCase() || '';
              
              const hasOfficialInTitle = videoTitle.includes('official trailer');
              const isOfficialChannel = 
                channelTitle.includes('pictures') ||
                channelTitle.includes('studios') ||
                channelTitle.includes('entertainment') ||
                channelTitle.includes('trailers') ||
                channelTitle.includes('movies') ||
                channelTitle.includes('films') ||
                channelTitle.includes('productions') ||
                channelTitle.includes('netflix') ||
                channelTitle.includes('disney') ||
                channelTitle.includes('prime video');
              
              return hasOfficialInTitle && isOfficialChannel;
            });

            if (verifiedTrailer) {
              return { url: `https://www.youtube.com/watch?v=${verifiedTrailer.id.videoId}`, isTmdbTrailer: false };
            }
          }
        }
      } catch (e) {
        console.error(`Error fetching trailer for ${titleName}:`, e);
      }
      return { url: null, isTmdbTrailer: true };
    }

    // Helper function to fetch full movie details
    async function fetchMovieDetails(tmdbId: number) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.error(`Error fetching movie details ${tmdbId}:`, e);
      }
      return null;
    }

    // Helper function to fetch full TV details
    async function fetchTvDetails(tmdbId: number) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.error(`Error fetching TV details ${tmdbId}:`, e);
      }
      return null;
    }

    // Process movies
    let moviePage = 1;
    let movieTotalPages = 1;
    
    while (moviePage <= movieTotalPages && moviePage <= 20) {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_RUNTIME_MS) {
        console.log(`Approaching time limit at ${elapsed}ms. Stopping gracefully.`);
        await supabase.from('system_logs').insert({
          severity: 'warning',
          operation: 'full-refresh-titles-timeout',
          error_message: `Thread approaching time limit at ${elapsed}ms for ${languageCode}/${year}/${genreName}`,
          context: { languageCode, year, genre: genreName, genreId: tmdbGenreId, totalProcessed, elapsedMs: elapsed, phase: 'movies', page: moviePage }
        });
        break;
      }

      const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_year=${year}&with_genres=${tmdbGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=${moviePage}`;
      
      try {
        const moviesResponse = await fetch(moviesUrl);
        const moviesData = await moviesResponse.json();
        const movies = moviesData.results || [];
        movieTotalPages = Math.min(moviesData.total_pages || 1, 20);
        console.log(`Found ${movies.length} movies (page ${moviePage}/${movieTotalPages})`);

        for (const movie of movies) {
          try {
            // Check streaming availability first
            const { providers } = await fetchWatchProviders(movie.id, 'movie');
            
            // Skip titles not available on any supported streaming service
            if (providers.length === 0) {
              skippedNoProvider++;
              continue;
            }

            // Fetch full details for additional metadata
            const details = await fetchMovieDetails(movie.id);
            
            // Fetch trailer
            const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
            const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(movie.id, 'movie', movie.title, releaseYear, movie.original_language || languageCode);

            // Upsert title (insert or update if exists)
            const { data: upsertedTitle, error: titleError } = await supabase
              .from('titles')
              .upsert({
                tmdb_id: movie.id,
                title_type: 'movie',
                name: movie.title,
                original_name: movie.original_title,
                overview: movie.overview,
                release_date: movie.release_date || null,
                first_air_date: null,
                last_air_date: null,
                status: details?.status || null,
                runtime: details?.runtime || null,
                episode_run_time: null,
                popularity: movie.popularity,
                vote_average: movie.vote_average,
                poster_path: movie.poster_path,
                backdrop_path: movie.backdrop_path,
                original_language: movie.original_language,
                is_adult: movie.adult || false,
                imdb_id: details?.imdb_id || null,
                tagline: details?.tagline || null,
                trailer_url: trailerUrl,
                is_tmdb_trailer: isTmdbTrailer,
                updated_at: new Date().toISOString()
              }, { onConflict: 'tmdb_id,title_type' })
              .select('id')
              .single();

            if (titleError) {
              console.error(`Error upserting movie ${movie.title}:`, titleError);
              continue;
            }

            if (upsertedTitle) {
              totalProcessed++;

              // Save streaming availability
              for (const provider of providers) {
                await supabase.from('title_streaming_availability').upsert({
                  title_id: upsertedTitle.id,
                  streaming_service_id: provider.serviceId,
                  region_code: 'US'
                }, { onConflict: 'title_id,streaming_service_id,region_code' });
              }

              // Map genres
              const movieGenreIds = movie.genre_ids || [];
              for (const gId of movieGenreIds) {
                const gName = TMDB_GENRE_MAP[gId];
                if (gName) {
                  const ourGenreId = genreNameToId[gName.toLowerCase()];
                  if (ourGenreId) {
                    await supabase.from('title_genres').upsert({ title_id: upsertedTitle.id, genre_id: ourGenreId }, { onConflict: 'title_id,genre_id' });
                  }
                }
              }

              // Store spoken languages from details
              if (details?.spoken_languages) {
                for (const lang of details.spoken_languages) {
                  // Ensure language exists in spoken_languages table
                  await supabase.from('spoken_languages').upsert({ iso_639_1: lang.iso_639_1, language_name: lang.english_name || lang.name }, { onConflict: 'iso_639_1' });
                  await supabase.from('title_spoken_languages').upsert({ title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
                }
              }

              // Store keywords if available
              if (details?.keywords?.keywords) {
                for (const kw of details.keywords.keywords.slice(0, 10)) {
                  const { data: kwData } = await supabase.from('keywords').upsert({ tmdb_keyword_id: kw.id, name: kw.name }, { onConflict: 'tmdb_keyword_id' }).select('id').single();
                  if (kwData) {
                    await supabase.from('title_keywords').upsert({ title_id: upsertedTitle.id, keyword_id: kwData.id }, { onConflict: 'title_id,keyword_id' });
                  }
                }
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

    // Process TV shows
    let tvPage = 1;
    let tvTotalPages = 1;
    
    while (tvPage <= tvTotalPages && tvPage <= 20) {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_RUNTIME_MS) {
        console.log(`Approaching time limit at ${elapsed}ms. Stopping gracefully.`);
        await supabase.from('system_logs').insert({
          severity: 'warning',
          operation: 'full-refresh-titles-timeout',
          error_message: `Thread approaching time limit at ${elapsed}ms for ${languageCode}/${year}/${genreName}`,
          context: { languageCode, year, genre: genreName, genreId: tmdbGenreId, totalProcessed, elapsedMs: elapsed, phase: 'tv', page: tvPage }
        });
        break;
      }

      const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${year}-01-01&air_date.lte=${year}-12-31&with_genres=${tmdbGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=${tvPage}`;
      
      try {
        const tvResponse = await fetch(tvUrl);
        const tvData = await tvResponse.json();
        const shows = tvData.results || [];
        tvTotalPages = Math.min(tvData.total_pages || 1, 20);
        console.log(`Found ${shows.length} TV shows (page ${tvPage}/${tvTotalPages})`);

        for (const show of shows) {
          try {
            // Check streaming availability first
            const { providers } = await fetchWatchProviders(show.id, 'tv');
            
            // Skip titles not available on any supported streaming service
            if (providers.length === 0) {
              skippedNoProvider++;
              continue;
            }

            // Fetch full details
            const details = await fetchTvDetails(show.id);
            
            // Fetch trailer - use latest season number for TV series
            const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
            const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
            const latestSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
            const { url: trailerUrl, isTmdbTrailer: isTmdbTrailerTv } = await fetchTrailer(show.id, 'tv', show.name, releaseYear, show.original_language || languageCode, latestSeasonNumber);

            // Upsert title (insert or update if exists)
            const { data: upsertedTitle, error: titleError } = await supabase
              .from('titles')
              .upsert({
                tmdb_id: show.id,
                title_type: 'tv',
                name: show.name,
                original_name: show.original_name,
                overview: show.overview,
                release_date: null,
                first_air_date: show.first_air_date || null,
                last_air_date: details?.last_air_date || null,
                status: details?.status || null,
                runtime: null,
                episode_run_time: details?.episode_run_time || null,
                popularity: show.popularity,
                vote_average: show.vote_average,
                poster_path: show.poster_path,
                backdrop_path: show.backdrop_path,
                original_language: show.original_language,
                is_adult: show.adult || false,
                imdb_id: details?.external_ids?.imdb_id || null,
                tagline: details?.tagline || null,
                trailer_url: trailerUrl,
                is_tmdb_trailer: isTmdbTrailerTv,
                updated_at: new Date().toISOString()
              }, { onConflict: 'tmdb_id,title_type' })
              .select('id')
              .single();

            if (titleError) {
              console.error(`Error upserting show ${show.name}:`, titleError);
              continue;
            }

            if (upsertedTitle) {
              totalProcessed++;

              // Save streaming availability
              for (const provider of providers) {
                await supabase.from('title_streaming_availability').upsert({
                  title_id: upsertedTitle.id,
                  streaming_service_id: provider.serviceId,
                  region_code: 'US'
                }, { onConflict: 'title_id,streaming_service_id,region_code' });
              }

              // Map genres
              const showGenreIds = show.genre_ids || [];
              for (const gId of showGenreIds) {
                const gName = TMDB_GENRE_MAP[gId];
                if (gName) {
                  const ourGenreId = genreNameToId[gName.toLowerCase()];
                  if (ourGenreId) {
                    await supabase.from('title_genres').upsert({ title_id: upsertedTitle.id, genre_id: ourGenreId }, { onConflict: 'title_id,genre_id' });
                  }
                }
              }

              // Store spoken languages
              if (details?.spoken_languages) {
                for (const lang of details.spoken_languages) {
                  await supabase.from('spoken_languages').upsert({ iso_639_1: lang.iso_639_1, language_name: lang.english_name || lang.name }, { onConflict: 'iso_639_1' });
                  await supabase.from('title_spoken_languages').upsert({ title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
                }
              }

              // Store seasons
              if (details?.seasons) {
                for (const season of details.seasons) {
                  await supabase.from('seasons').upsert({
                    title_id: upsertedTitle.id,
                    season_number: season.season_number,
                    episode_count: season.episode_count,
                    air_date: season.air_date || null,
                    name: season.name,
                    overview: season.overview,
                    poster_path: season.poster_path
                  }, { onConflict: 'title_id,season_number' });
                }
              }

              // Store keywords
              if (details?.keywords?.results) {
                for (const kw of details.keywords.results.slice(0, 10)) {
                  const { data: kwData } = await supabase.from('keywords').upsert({ tmdb_keyword_id: kw.id, name: kw.name }, { onConflict: 'tmdb_keyword_id' }).select('id').single();
                  if (kwData) {
                    await supabase.from('title_keywords').upsert({ title_id: upsertedTitle.id, keyword_id: kwData.id }, { onConflict: 'title_id,keyword_id' });
                  }
                }
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

    // Use atomic increment
    await supabase.rpc('increment_job_titles', { p_job_type: 'full_refresh', p_increment: totalProcessed });

    // Update thread tracking
    if (jobId) {
      const { data: currentJob } = await supabase
        .from('jobs')
        .select('configuration, status')
        .eq('id', jobId)
        .single();
      
      if (currentJob?.status === 'failed' || currentJob?.status === 'idle') {
        console.log('Job was stopped, skipping tracking update');
        return new Response(
          JSON.stringify({ success: true, totalProcessed, duration, message: 'Job was stopped' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const currentConfig = (currentJob?.configuration as any) || {};
      const tracking = currentConfig.thread_tracking || { succeeded: 0, failed: 0 };
      const completedUnits = currentConfig.completed_work_units || [];
      const failedUnits = (currentConfig.failed_work_units || []).filter((u: any) =>
        !(u.languageCode === languageCode && u.year === year && u.genreId === tmdbGenreId)
      );
      
      completedUnits.push({
        languageCode, year, genreId: tmdbGenreId, genreName,
        completedAt: new Date().toISOString(),
        titlesProcessed: totalProcessed
      });
      
      await supabase
        .from('jobs')
        .update({
          configuration: {
            ...currentConfig,
            thread_tracking: { succeeded: tracking.succeeded + 1, failed: tracking.failed },
            completed_work_units: completedUnits,
            failed_work_units: failedUnits
          },
          last_run_duration_seconds: duration
        })
        .eq('id', jobId)
        .eq('status', 'running');
    }

    console.log(`Full Refresh completed: ${totalProcessed} titles in ${duration}s for ${languageCode}/${year}/${genreName} (skipped ${skippedNoProvider} without streaming)`);

    return new Response(
      JSON.stringify({ success: true, totalProcessed, skippedNoProvider, duration, language: languageCode, year, genre: genreName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in full-refresh-titles:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error
    try {
      await supabase.from('system_logs').insert({
        severity: 'error',
        operation: 'full-refresh-titles-error',
        error_message: errorMessage,
        context: { error: errorMessage }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
