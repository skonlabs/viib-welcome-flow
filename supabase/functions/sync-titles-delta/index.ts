import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMDB Genre ID to Name mapping (includes both Movie and TV genre IDs)
const TMDB_GENRE_MAP: Record<number, string> = {
  // Movie genres
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
  // TV-specific genres
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

// Map movie genre IDs to TV genre IDs
const MOVIE_TO_TV_GENRE_MAP: Record<number, number | null> = {
  28: 10759,    // Action → Action & Adventure (TV)
  12: 10759,    // Adventure → Action & Adventure (TV)
  878: 10765,   // Science Fiction → Sci-Fi & Fantasy (TV)
  14: 10765,    // Fantasy → Sci-Fi & Fantasy (TV)
  10752: 10768, // War → War & Politics (TV)
  16: 16,       // Animation
  35: 35,       // Comedy
  80: 80,       // Crime
  99: 99,       // Documentary
  18: 18,       // Drama
  10751: 10751, // Family
  9648: 9648,   // Mystery
  37: 37,       // Western
  // Movie-only genres - NO TV equivalent
  27: null,     // Horror
  36: null,     // History
  10402: null,  // Music
  10749: null,  // Romance
  53: null,     // Thriller
  10770: null,  // TV Movie
};

// TV-ONLY genres to search
const TV_ONLY_GENRES: number[] = [10762, 10763, 10764, 10766, 10767]; // Kids, News, Reality, Soap, Talk

// TMDB Provider ID to service name mapping (US region only)
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
    console.log('Starting Nightly Sync Delta job...');

    const startTime = Date.now();
    await supabase
      .from('jobs')
      .update({ status: 'running', last_run_at: new Date().toISOString(), error_message: null })
      .eq('job_type', 'sync_delta');

    // Load job configuration
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
    const currentYear = new Date().getFullYear();

    console.log(`Syncing titles from ${startDateStr} to ${endDateStr} (${lookbackDays} days lookback)`);

    // Load reference data
    const { data: genres } = await supabase.from('genres').select('id, genre_name, tmdb_genre_id');
    const { data: existingLanguages } = await supabase.from('spoken_languages').select('iso_639_1, language_name');
    const { data: streamingServices } = await supabase
      .from('streaming_services')
      .select('id, service_name')
      .eq('is_active', true);

    const { data: officialChannels } = await supabase
      .from('official_trailer_channels')
      .select('channel_name, language_code, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    // Build lookup maps
    const validLanguageCodes = new Set((existingLanguages || []).map(l => l.iso_639_1));
    const genreNameToId: Record<string, string> = {};
    (genres || []).forEach(g => { genreNameToId[g.genre_name.toLowerCase()] = g.id; });
    
    const serviceNameToId: Record<string, string> = {};
    (streamingServices || []).forEach(s => { serviceNameToId[s.service_name.toLowerCase()] = s.id; });

    console.log(`Loaded: ${validLanguageCodes.size} languages, ${Object.keys(genreNameToId).length} genres, ${Object.keys(serviceNameToId).length} streaming services`);

    let totalProcessed = 0;
    let moviesProcessed = 0;
    let seriesProcessed = 0;
    let skippedNoProvider = 0;

    // ========================================
    // HELPER FUNCTIONS (same as full-refresh)
    // ========================================

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
              matchedProviders.push({ tmdbId: provider.provider_id, name: mappedName, serviceId });
            }
          }
        }
        
        return { providers: matchedProviders };
      } catch (e) {
        console.error(`Error fetching watch providers for ${tmdbId}:`, e);
        return { providers: [] };
      }
    }

    async function fetchTrailer(tmdbId: number, titleType: string, titleName: string, releaseYear: number | null, titleLang: string = 'en', latestSeasonNumber?: number, seasonName?: string): Promise<{ url: string | null, isTmdbTrailer: boolean }> {
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
            }
          }
        }

        // Fallback to series/movie level trailer
        if (!trailerKey) {
          const endpoint = titleType === 'movie' ? 'movie' : 'tv';
          const videosRes = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`);
          if (videosRes.ok) {
            const videosData = await videosRes.json();
            const trailer = videosData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
            if (trailer) trailerKey = trailer.key;
          }
        }

        if (trailerKey) {
          return { url: `https://www.youtube.com/watch?v=${trailerKey}`, isTmdbTrailer: true };
        }

        // YouTube fallback
        if (YOUTUBE_API_KEY) {
          const relevantChannels = (officialChannels || []).filter(c => 
            c.language_code === titleLang || c.language_code === 'global' || c.language_code === 'en'
          ).map(c => c.channel_name.toLowerCase());

          const searchQuery = titleType === 'tv' && seasonName 
            ? `${titleName} ${seasonName} official trailer`
            : `${titleName} ${releaseYear || ''} official trailer`;
          
          const youtubeRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`);
          if (youtubeRes.ok) {
            const searchData = await youtubeRes.json();
            
            const officialChannelTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
              return relevantChannels.some(officialName => channelTitle.includes(officialName.toLowerCase()));
            });

            if (officialChannelTrailer) {
              return { url: `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`, isTmdbTrailer: false };
            }
            
            const verifiedTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
              const videoTitle = item.snippet.title?.toLowerCase() || '';
              const hasOfficialInTitle = videoTitle.includes('official trailer');
              const isOfficialChannel = channelTitle.includes('pictures') || channelTitle.includes('studios') || 
                channelTitle.includes('entertainment') || channelTitle.includes('netflix') || channelTitle.includes('disney');
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

    async function fetchMovieDetails(tmdbId: number) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=keywords`);
        if (res.ok) return await res.json();
      } catch (e) { /* ignore */ }
      return null;
    }

    async function fetchTvDetails(tmdbId: number) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=keywords,external_ids`);
        if (res.ok) return await res.json();
      } catch (e) { /* ignore */ }
      return null;
    }

    // ========================================
    // MOVIE PROCESSING
    // ========================================

    async function processMovie(movie: any) {
      try {
        const { providers } = await fetchWatchProviders(movie.id, 'movie');
        if (providers.length === 0) {
          skippedNoProvider++;
          return false;
        }

        const details = await fetchMovieDetails(movie.id);
        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
        const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(movie.id, 'movie', movie.title, releaseYear, movie.original_language);

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
          return false;
        }

        if (upsertedTitle) {
          totalProcessed++;
          moviesProcessed++;

          // Streaming availability
          for (const provider of providers) {
            await supabase.from('title_streaming_availability').upsert({
              title_id: upsertedTitle.id,
              streaming_service_id: provider.serviceId,
              region_code: 'US'
            }, { onConflict: 'title_id,streaming_service_id,region_code' });
          }

          // Genres
          for (const gId of (movie.genre_ids || [])) {
            const gName = TMDB_GENRE_MAP[gId];
            if (gName) {
              const ourGenreId = genreNameToId[gName.toLowerCase()];
              if (ourGenreId) {
                await supabase.from('title_genres').upsert({ title_id: upsertedTitle.id, genre_id: ourGenreId }, { onConflict: 'title_id,genre_id' });
              }
            }
          }

          // Spoken languages
          if (details?.spoken_languages) {
            for (const lang of details.spoken_languages) {
              if (validLanguageCodes.has(lang.iso_639_1)) {
                await supabase.from('title_spoken_languages').upsert({ title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
              }
            }
          }

          // Keywords
          if (details?.keywords?.keywords) {
            for (const kw of details.keywords.keywords.slice(0, 10)) {
              const { data: kwData } = await supabase.from('keywords').upsert({ tmdb_keyword_id: kw.id, name: kw.name }, { onConflict: 'tmdb_keyword_id' }).select('id').single();
              if (kwData) {
                await supabase.from('title_keywords').upsert({ title_id: upsertedTitle.id, keyword_id: kwData.id }, { onConflict: 'title_id,keyword_id' });
              }
            }
          }

          return true;
        }
        return false;
      } catch (error) {
        console.error(`Error processing movie ${movie.title}:`, error);
        return false;
      }
    }

    // ========================================
    // TV SHOW PROCESSING
    // ========================================

    async function processTvShow(show: any, languageCode: string) {
      try {
        const { providers } = await fetchWatchProviders(show.id, 'tv');
        if (providers.length === 0) {
          skippedNoProvider++;
          return false;
        }

        const details = await fetchTvDetails(show.id);
        const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
        const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
        const latestSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
        const latestSeason = seasons.find((s: any) => s.season_number === latestSeasonNumber);
        const seasonName = latestSeason?.name || (latestSeasonNumber ? `Season ${latestSeasonNumber}` : undefined);
        const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(show.id, 'tv', show.name, releaseYear, show.original_language || languageCode, latestSeasonNumber, seasonName);

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
            is_tmdb_trailer: isTmdbTrailer,
            updated_at: new Date().toISOString()
          }, { onConflict: 'tmdb_id,title_type' })
          .select('id')
          .single();

        if (titleError) {
          console.error(`Error upserting show ${show.name}:`, titleError);
          return false;
        }

        if (upsertedTitle) {
          totalProcessed++;
          seriesProcessed++;

          // Streaming availability
          for (const provider of providers) {
            await supabase.from('title_streaming_availability').upsert({
              title_id: upsertedTitle.id,
              streaming_service_id: provider.serviceId,
              region_code: 'US'
            }, { onConflict: 'title_id,streaming_service_id,region_code' });
          }

          // Genres
          for (const gId of (show.genre_ids || [])) {
            const gName = TMDB_GENRE_MAP[gId];
            if (gName) {
              const ourGenreId = genreNameToId[gName.toLowerCase()];
              if (ourGenreId) {
                await supabase.from('title_genres').upsert({ title_id: upsertedTitle.id, genre_id: ourGenreId }, { onConflict: 'title_id,genre_id' });
              }
            }
          }

          // Spoken languages
          if (details?.spoken_languages) {
            for (const lang of details.spoken_languages) {
              if (validLanguageCodes.has(lang.iso_639_1)) {
                await supabase.from('title_spoken_languages').upsert({ title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
              }
            }
          }

          // Seasons with trailers
          if (details?.seasons) {
            for (const season of details.seasons) {
              let seasonTrailerUrl: string | null = null;
              let seasonIsTmdbTrailer = true;

              if (season.season_number > 0) {
                try {
                  const seasonVideosRes = await fetch(`https://api.themoviedb.org/3/tv/${show.id}/season/${season.season_number}/videos?api_key=${TMDB_API_KEY}`);
                  if (seasonVideosRes.ok) {
                    const seasonVideosData = await seasonVideosRes.json();
                    const seasonTrailer = seasonVideosData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
                    if (seasonTrailer) {
                      seasonTrailerUrl = `https://www.youtube.com/watch?v=${seasonTrailer.key}`;
                    }
                  }

                  if (!seasonTrailerUrl && YOUTUBE_API_KEY) {
                    const seasonSearchName = season.name || `Season ${season.season_number}`;
                    const searchQuery = `${show.name} ${seasonSearchName} official trailer`;
                    const relevantChannels = (officialChannels || []).filter(c => 
                      c.language_code === (show.original_language || languageCode) || c.language_code === 'global' || c.language_code === 'en'
                    ).map(c => c.channel_name.toLowerCase());

                    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`);
                    if (ytRes.ok) {
                      const ytData = await ytRes.json();
                      const found = ytData.items?.find((item: any) => {
                        const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
                        return relevantChannels.some(name => channelTitle.includes(name.toLowerCase()));
                      });
                      if (found) {
                        seasonTrailerUrl = `https://www.youtube.com/watch?v=${found.id.videoId}`;
                        seasonIsTmdbTrailer = false;
                      }
                    }
                  }
                } catch (e) {
                  console.error(`Error fetching season ${season.season_number} trailer:`, e);
                }
              }

              await supabase.from('seasons').upsert({
                title_id: upsertedTitle.id,
                season_number: season.season_number,
                episode_count: season.episode_count,
                air_date: season.air_date || null,
                name: season.name,
                overview: season.overview,
                poster_path: season.poster_path,
                trailer_url: seasonTrailerUrl,
                is_tmdb_trailer: seasonIsTmdbTrailer
              }, { onConflict: 'title_id,season_number' });
            }
          }

          // Keywords
          if (details?.keywords?.results) {
            for (const kw of details.keywords.results.slice(0, 10)) {
              const { data: kwData } = await supabase.from('keywords').upsert({ tmdb_keyword_id: kw.id, name: kw.name }, { onConflict: 'tmdb_keyword_id' }).select('id').single();
              if (kwData) {
                await supabase.from('title_keywords').upsert({ title_id: upsertedTitle.id, keyword_id: kwData.id }, { onConflict: 'title_id,keyword_id' });
              }
            }
          }

          return true;
        }
        return false;
      } catch (error) {
        console.error(`Error processing show ${show.name}:`, error);
        return false;
      }
    }

    // ========================================
    // MAIN DISCOVERY LOOP
    // ========================================

    const processedMovieIds = new Set<number>();
    const processedTvIds = new Set<number>();

    // Process each language
    for (const language of (existingLanguages || [])) {
      console.log(`\n=== Processing language: ${language.language_name} (${language.iso_639_1}) ===`);

      // ----------------------------------------
      // MOVIES: Date-range discovery
      // ----------------------------------------
      console.log(`[Movies] Fetching releases from ${startDateStr} to ${endDateStr}`);
      
      let moviePage = 1;
      let movieTotalPages = 1;

      while (moviePage <= movieTotalPages && moviePage <= 10) {
        // NOTE: For recent releases, skip vote_average filter as they may not have enough votes yet
        const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_date.gte=${startDateStr}&primary_release_date.lte=${endDateStr}&with_original_language=${language.iso_639_1}&sort_by=popularity.desc&page=${moviePage}`;
        
        try {
          const moviesResponse = await fetch(moviesUrl);
          const moviesData = await moviesResponse.json();
          const movies = moviesData.results || [];
          movieTotalPages = Math.min(moviesData.total_pages || 1, 10);

          console.log(`[Movies] Found ${movies.length} titles (page ${moviePage}/${movieTotalPages})`);

          for (const movie of movies) {
            if (processedMovieIds.has(movie.id)) continue;
            processedMovieIds.add(movie.id);
            await processMovie(movie);
          }

          moviePage++;
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (err) {
          console.error('Error fetching movies:', err);
          break;
        }
      }

      // ----------------------------------------
      // TV SHOWS: Date-range discovery (by air_date for recent seasons)
      // ----------------------------------------
      console.log(`[TV Shows] Fetching airings from ${startDateStr} to ${endDateStr}`);
      
      let tvPage = 1;
      let tvTotalPages = 1;

      while (tvPage <= tvTotalPages && tvPage <= 10) {
        // air_date filter captures shows with episodes airing in the date range
        const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${startDateStr}&air_date.lte=${endDateStr}&with_original_language=${language.iso_639_1}&sort_by=popularity.desc&page=${tvPage}`;
        
        try {
          const tvResponse = await fetch(tvUrl);
          const tvData = await tvResponse.json();
          const shows = tvData.results || [];
          tvTotalPages = Math.min(tvData.total_pages || 1, 10);

          console.log(`[TV Shows] Found ${shows.length} titles (page ${tvPage}/${tvTotalPages})`);

          for (const show of shows) {
            if (processedTvIds.has(show.id)) continue;
            processedTvIds.add(show.id);
            await processTvShow(show, language.iso_639_1);
          }

          tvPage++;
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (err) {
          console.error('Error fetching TV shows:', err);
          break;
        }
      }

      // Progress update
      if (totalProcessed > 0 && totalProcessed % 50 === 0) {
        await supabase.rpc('increment_job_titles', { p_job_type: 'sync_delta', p_increment: 0 });
        console.log(`Progress: ${totalProcessed} titles processed (${moviesProcessed} movies, ${seriesProcessed} TV)`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // ----------------------------------------
    // TV-ONLY GENRES (Kids, News, Reality, Soap, Talk)
    // These don't have movie equivalents, search separately
    // ----------------------------------------
    console.log(`\n=== Processing TV-only genres ===`);
    
    for (const tvOnlyGenreId of TV_ONLY_GENRES) {
      const genreName = TMDB_GENRE_MAP[tvOnlyGenreId] || `Genre ${tvOnlyGenreId}`;
      console.log(`[TV-Only] Processing ${genreName} (${tvOnlyGenreId})`);

      for (const language of (existingLanguages || [])) {
        let tvPage = 1;
        let tvTotalPages = 1;

        while (tvPage <= tvTotalPages && tvPage <= 5) {
          const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${startDateStr}&air_date.lte=${endDateStr}&with_genres=${tvOnlyGenreId}&with_original_language=${language.iso_639_1}&sort_by=popularity.desc&page=${tvPage}`;
          
          try {
            const tvResponse = await fetch(tvUrl);
            const tvData = await tvResponse.json();
            const shows = tvData.results || [];
            tvTotalPages = Math.min(tvData.total_pages || 1, 5);

            for (const show of shows) {
              if (processedTvIds.has(show.id)) continue;
              processedTvIds.add(show.id);
              await processTvShow(show, language.iso_639_1);
            }

            tvPage++;
            await new Promise(resolve => setTimeout(resolve, 250));
          } catch (err) {
            console.error(`Error fetching ${genreName} shows:`, err);
            break;
          }
        }
      }
    }

    // ========================================
    // COMPLETION
    // ========================================

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

    console.log(`\n=== Nightly Sync Complete ===`);
    console.log(`Total: ${totalProcessed} titles (${moviesProcessed} movies, ${seriesProcessed} TV)`);
    console.log(`Skipped (no streaming): ${skippedNoProvider}`);
    console.log(`Duration: ${duration} seconds`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalProcessed, 
        moviesProcessed,
        seriesProcessed,
        skippedNoProvider, 
        duration,
        lookbackDays,
        message: `Synced ${totalProcessed} titles in ${duration}s` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-titles-delta:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(2, 0, 0, 0);

    await supabase
      .from('jobs')
      .update({ status: 'failed', error_message: errorMessage, next_run_at: nextRun.toISOString() })
      .eq('job_type', 'sync_delta');

    await supabase.from('system_logs').insert({
      severity: 'error',
      operation: 'sync-titles-delta',
      error_message: errorMessage,
      context: { stack: error instanceof Error ? error.stack : null }
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
