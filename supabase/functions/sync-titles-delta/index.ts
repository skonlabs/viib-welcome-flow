import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMDB Genre ID to Name mapping (includes both Movie and TV genre IDs)
const TMDB_GENRE_MAP: Record<number, string> = {
  // Movie genres (19 total)
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
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV-specific genres (16 total - some overlap with movie IDs)
  10759: 'Action', // Action & Adventure (TV)
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Science Fiction', // Sci-Fi & Fantasy (TV) - e.g., Stranger Things
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War', // War & Politics (TV)
};

// TMDB Provider ID to service name mapping (US region)
const TMDB_PROVIDER_MAP: Record<number, string> = {
  8: 'Netflix',
  9: 'Prime Video',
  119: 'Prime Video',
  15: 'Hulu',
  350: 'Apple TV',
  2: 'Apple TV',
  337: 'DisneyPlus',
  390: 'DisneyPlus',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting Sync Delta job...');

    const startTime = Date.now();
    await supabase
      .from('jobs')
      .update({ status: 'running', last_run_at: new Date().toISOString(), error_message: null })
      .eq('job_type', 'sync_delta');

    const { data: jobData } = await supabase
      .from('jobs')
      .select('configuration')
      .eq('job_type', 'sync_delta')
      .single();

    const config = jobData?.configuration as any || {};
    const minRating = config.min_rating || 6.0;
    const lookbackDays = config.lookback_days || 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`Syncing titles from ${startDateStr} to ${endDateStr}`);

    const { data: genres } = await supabase.from('genres').select('id, genre_name');
    const { data: languages } = await supabase.from('spoken_languages').select('iso_639_1, language_name');
    
    // Create a Set of valid language codes - ONLY use these, never add new ones
    const validLanguageCodes = new Set((languages || []).map(l => l.iso_639_1));
    console.log(`Valid language codes: ${validLanguageCodes.size}`);

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

    const genreNameToId: Record<string, string> = {};
    (genres || []).forEach(g => {
      genreNameToId[g.genre_name.toLowerCase()] = g.id;
    });

    // Fetch official trailer channels from database
    const { data: officialChannels } = await supabase
      .from('official_trailer_channels')
      .select('channel_name, language_code, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    console.log(`Loaded ${officialChannels?.length || 0} official trailer channels`);
    console.log(`Processing: ${(languages || []).length} languages`);

    let totalProcessed = 0;
    let skippedNoProvider = 0;

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
    // For TV series, fetches the latest season's trailer
    async function fetchTrailer(tmdbId: number, titleType: string, titleName: string, releaseYear: number | null, titleLang: string = 'en', latestSeasonNumber?: number, seasonName?: string): Promise<{ url: string | null, isTmdbTrailer: boolean }> {
      try {
        let trailerKey: string | null = null;

        if (titleType === 'tv' && latestSeasonNumber && latestSeasonNumber > 0) {
          // For TV series, try to get the latest season's trailer first
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
            const data = await videosRes.json();
            const trailer = data.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
            if (trailer) {
              trailerKey = trailer.key;
            }
          }
        }

        if (trailerKey) {
          return { url: `https://www.youtube.com/watch?v=${trailerKey}`, isTmdbTrailer: true };
        }

        if (YOUTUBE_API_KEY) {
          // Get official channel names for this language + global channels
          const relevantChannels = (officialChannels || []).filter(c => 
            c.language_code === titleLang || c.language_code === 'global' || c.language_code === 'en'
          ).map(c => c.channel_name.toLowerCase());

          // For TV series with season info, search for season-specific trailer (e.g., "Delhi Crime Season 3")
          const searchQuery = titleType === 'tv' && seasonName 
            ? `${titleName} ${seasonName} official trailer`
            : `${titleName} ${releaseYear || ''} official trailer`;
          const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`);
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            
            // First try to find a result from an official trailer channel (matched by name)
            const officialChannelTrailer = ytData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
              return relevantChannels.some(officialName => channelTitle.includes(officialName.toLowerCase()));
            });

            if (officialChannelTrailer) {
              return { url: `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`, isTmdbTrailer: false };
            }
            
            // Fallback: find results with "official trailer" in title from verified-looking channels
            const verifiedTrailer = ytData.items?.find((item: any) => {
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
        console.error(`Error fetching trailer:`, e);
      }
      return { url: null, isTmdbTrailer: true };
    }

    async function fetchMovieDetails(tmdbId: number) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (res.ok) return await res.json();
      } catch (e) { /* ignore */ }
      return null;
    }

    async function fetchTvDetails(tmdbId: number) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (res.ok) return await res.json();
      } catch (e) { /* ignore */ }
      return null;
    }

    for (const language of (languages || [])) {
      console.log(`Fetching: Lang=${language.language_name}`);

      // Fetch new movies
      const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_date.gte=${startDateStr}&primary_release_date.lte=${endDateStr}&with_original_language=${language.iso_639_1}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=1`;
      
      const moviesResponse = await fetch(moviesUrl);
      const moviesData = await moviesResponse.json();
      const movies = moviesData.results || [];

      console.log(`Found ${movies.length} new movies`);

      for (const movie of movies) {
        try {
          // Check streaming availability first
          const { providers } = await fetchWatchProviders(movie.id, 'movie');
          
          // Skip titles not available on any supported streaming service
          if (providers.length === 0) {
            skippedNoProvider++;
            continue;
          }

          const details = await fetchMovieDetails(movie.id);
          const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
          const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(movie.id, 'movie', movie.title, releaseYear, movie.original_language || language.iso_639_1);

          const { data: insertedTitle, error: titleError } = await supabase
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
            console.error(`Error inserting movie ${movie.title}:`, titleError);
            continue;
          }

          if (insertedTitle) {
            totalProcessed++;

            // Save streaming availability
            for (const provider of providers) {
              await supabase.from('title_streaming_availability').upsert({
                title_id: insertedTitle.id,
                streaming_service_id: provider.serviceId,
                region_code: 'US'
              }, { onConflict: 'title_id,streaming_service_id,region_code' });
            }

            // Map genres
            for (const gId of (movie.genre_ids || [])) {
              const gName = TMDB_GENRE_MAP[gId];
              if (gName) {
                const genreId = genreNameToId[gName.toLowerCase()];
                if (genreId) {
                  await supabase.from('title_genres').upsert({ title_id: insertedTitle.id, genre_id: genreId }, { onConflict: 'title_id,genre_id' });
                }
              }
            }

            // Store spoken languages - ONLY if language exists in our table
            if (details?.spoken_languages) {
              for (const lang of details.spoken_languages) {
                // Only link to existing languages, never add new ones
                if (validLanguageCodes.has(lang.iso_639_1)) {
                  await supabase.from('title_spoken_languages').upsert({ title_id: insertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing movie ${movie.title}:`, error);
        }
      }

      // Fetch new TV shows
      const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${startDateStr}&air_date.lte=${endDateStr}&with_original_language=${language.iso_639_1}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=1`;
      
      const tvResponse = await fetch(tvUrl);
      const tvData = await tvResponse.json();
      const shows = tvData.results || [];

      console.log(`Found ${shows.length} new TV shows`);

      for (const show of shows) {
        try {
          // Check streaming availability first
          const { providers } = await fetchWatchProviders(show.id, 'tv');
          
          // Skip titles not available on any supported streaming service
          if (providers.length === 0) {
            skippedNoProvider++;
            continue;
          }

          const details = await fetchTvDetails(show.id);
          const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
          // Get latest season number for trailer lookup
          const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
          const latestSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
          const latestSeason = seasons.find((s: any) => s.season_number === latestSeasonNumber);
          const seasonName = latestSeason?.name || (latestSeasonNumber ? `Season ${latestSeasonNumber}` : undefined);
          const { url: trailerUrl, isTmdbTrailer: isTmdbTrailerTv } = await fetchTrailer(show.id, 'tv', show.name, releaseYear, show.original_language || language.iso_639_1, latestSeasonNumber, seasonName);

          const { data: insertedTitle, error: titleError } = await supabase
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
            console.error(`Error inserting show ${show.name}:`, titleError);
            continue;
          }

          if (insertedTitle) {
            totalProcessed++;

            // Save streaming availability
            for (const provider of providers) {
              await supabase.from('title_streaming_availability').upsert({
                title_id: insertedTitle.id,
                streaming_service_id: provider.serviceId,
                region_code: 'US'
              }, { onConflict: 'title_id,streaming_service_id,region_code' });
            }

            // Map genres
            for (const gId of (show.genre_ids || [])) {
              const gName = TMDB_GENRE_MAP[gId];
              if (gName) {
                const genreId = genreNameToId[gName.toLowerCase()];
                if (genreId) {
                  await supabase.from('title_genres').upsert({ title_id: insertedTitle.id, genre_id: genreId }, { onConflict: 'title_id,genre_id' });
                }
              }
            }

            // Store spoken languages - ONLY if language exists in our table
            if (details?.spoken_languages) {
              for (const lang of details.spoken_languages) {
                // Only link to existing languages, never add new ones
                if (validLanguageCodes.has(lang.iso_639_1)) {
                  await supabase.from('title_spoken_languages').upsert({ title_id: insertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
                }
              }
            }

            // Store seasons
            if (details?.seasons) {
              for (const season of details.seasons) {
                await supabase.from('seasons').upsert({
                  title_id: insertedTitle.id,
                  season_number: season.season_number,
                  episode_count: season.episode_count,
                  air_date: season.air_date || null,
                  name: season.name,
                  overview: season.overview,
                  poster_path: season.poster_path
                }, { onConflict: 'title_id,season_number' });
              }
            }
          }
        } catch (error) {
          console.error(`Error processing show ${show.name}:`, error);
        }
      }

      if (totalProcessed % 50 === 0 && totalProcessed > 0) {
        await supabase.from('jobs').update({ total_titles_processed: totalProcessed }).eq('job_type', 'sync_delta');
        console.log(`Progress: ${totalProcessed} new titles synced (skipped ${skippedNoProvider} without streaming)`);
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(2, 0, 0, 0);

    await supabase
      .from('jobs')
      .update({ 
        status: 'completed',
        total_titles_processed: totalProcessed,
        last_run_duration_seconds: duration,
        next_run_at: nextRun.toISOString()
      })
      .eq('job_type', 'sync_delta');

    console.log(`Sync Delta completed: ${totalProcessed} new titles synced in ${duration} seconds (skipped ${skippedNoProvider} without streaming)`);

    return new Response(
      JSON.stringify({ success: true, totalProcessed, skippedNoProvider, duration, message: `Sync completed. ${totalProcessed} new titles added. ${skippedNoProvider} skipped (no streaming).` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-titles-delta:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const nextRun = new Date();
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(2, 0, 0, 0);

      await supabase
        .from('jobs')
        .update({ status: 'failed', error_message: errorMessage, next_run_at: nextRun.toISOString() })
        .eq('job_type', 'sync_delta');
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
