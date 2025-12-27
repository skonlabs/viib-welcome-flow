import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for loaded configuration
let cachedGenreMap: Record<number, string> | null = null;
let cachedValidTvGenres: Set<number> | null = null;
let cachedMovieToTvGenreMap: Record<number, number | null> | null = null;
let cachedTvOnlyGenres: Record<number, number[]> | null = null;
let cachedTvOnlyGenreNames: Record<number, string> | null = null;
let cachedProviderMap: Record<number, string> | null = null;

// Load genre mappings from database
async function loadGenreMappings(supabase: any): Promise<void> {
  if (cachedGenreMap) return;

  console.log('Loading genre mappings from database...');
  
  const { data: genreMappings, error } = await supabase
    .from('tmdb_genre_mappings')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error loading genre mappings:', error);
    throw new Error('Failed to load genre mappings from database');
  }

  cachedGenreMap = {};
  cachedValidTvGenres = new Set();
  cachedMovieToTvGenreMap = {};
  cachedTvOnlyGenres = {};
  cachedTvOnlyGenreNames = {};

  for (const mapping of genreMappings || []) {
    // Build TMDB_GENRE_MAP
    cachedGenreMap[mapping.tmdb_genre_id] = mapping.genre_name;
    
    // Build VALID_TV_GENRES - genres that are TV or both
    if (mapping.media_type === 'tv' || mapping.media_type === 'both') {
      cachedValidTvGenres.add(mapping.tmdb_genre_id);
    }
    
    // Build MOVIE_TO_TV_GENRE_MAP - maps movie genre IDs to TV equivalents
    if (mapping.media_type === 'movie' || mapping.media_type === 'both') {
      if (mapping.tv_equivalent_id !== null) {
        cachedMovieToTvGenreMap[mapping.tmdb_genre_id] = mapping.tv_equivalent_id;
      } else if (mapping.media_type === 'both') {
        // Same ID for both movie and TV
        cachedMovieToTvGenreMap[mapping.tmdb_genre_id] = mapping.tmdb_genre_id;
      } else {
        // Movie-only genre with no TV equivalent
        cachedMovieToTvGenreMap[mapping.tmdb_genre_id] = null;
      }
    }
    
    // Build TV_ONLY_GENRES - genres that are TV only (for searching during movie genre work)
    if (mapping.media_type === 'tv') {
      cachedTvOnlyGenreNames[mapping.tmdb_genre_id] = mapping.genre_name;
    }
  }

  // Build TV_ONLY_GENRES_TO_SEARCH mapping based on related genres
  // Map: When searching Comedy (35), also search Talk (10767)
  // When searching Drama (18), also search Reality (10764), Soap (10766)
  // When searching Family (10751), also search Kids (10762)
  // When searching Documentary (99), also search News (10763)
  const tvOnlyGenreRelations: Record<number, number[]> = {
    35: [10767],        // Comedy → Talk
    18: [10764, 10766], // Drama → Reality, Soap
    10751: [10762],     // Family → Kids
    99: [10763],        // Documentary → News
  };
  
  // Only include TV-only genres that exist in the database
  for (const [movieGenreId, tvOnlyIds] of Object.entries(tvOnlyGenreRelations)) {
    const validTvOnlyIds = tvOnlyIds.filter(id => cachedTvOnlyGenreNames![id]);
    if (validTvOnlyIds.length > 0) {
      cachedTvOnlyGenres[Number(movieGenreId)] = validTvOnlyIds;
    }
  }

  console.log(`Loaded ${Object.keys(cachedGenreMap).length} genre mappings from database`);
}

// Load provider mappings from database
async function loadProviderMappings(supabase: any): Promise<void> {
  if (cachedProviderMap) return;

  console.log('Loading provider mappings from database...');
  
  const { data: providerMappings, error } = await supabase
    .from('tmdb_provider_mappings')
    .select('*')
    .eq('is_active', true)
    .eq('region_code', 'US');

  if (error) {
    console.error('Error loading provider mappings:', error);
    throw new Error('Failed to load provider mappings from database');
  }

  cachedProviderMap = {};
  for (const mapping of providerMappings || []) {
    cachedProviderMap[mapping.tmdb_provider_id] = mapping.service_name;
  }

  console.log(`Loaded ${Object.keys(cachedProviderMap).length} provider mappings from database`);
}

// Load job configuration from app_settings
async function loadJobConfig(supabase: any): Promise<{ minRating: number; maxRuntimeMs: number }> {
  const { data: minRatingSetting } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'full_refresh_min_rating')
    .single();

  const { data: maxRuntimeSetting } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'full_refresh_max_runtime_ms')
    .single();

  return {
    minRating: minRatingSetting?.setting_value ?? 6.0,
    maxRuntimeMs: maxRuntimeSetting?.setting_value ?? 90000,
  };
}

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

  let requestBody: any = {};
  try {
    const text = await req.text();
    if (text) requestBody = JSON.parse(text);
  } catch (e) {
    // Ignore if no body or invalid JSON
  }

  try {
    console.log('Starting Full Refresh job...', requestBody);

    // Load configuration from database
    await loadGenreMappings(supabase);
    await loadProviderMappings(supabase);

    const startTime = Date.now();

    // Load job-specific config from jobs table first, then fall back to app_settings
    const { data: jobData } = await supabase
      .from('jobs')
      .select('configuration')
      .eq('job_type', 'full_refresh')
      .single();

    const config = jobData?.configuration as any || {};
    const appConfig = await loadJobConfig(supabase);
    const minRating = config.min_rating || appConfig.minRating;
    const MAX_RUNTIME_MS = config.max_runtime_ms || appConfig.maxRuntimeMs;
    
    const languageCode = requestBody.languageCode;
    const year = requestBody.startYear;
    const tmdbGenreId = requestBody.genreId;

    if (!languageCode || !year || !tmdbGenreId) {
      throw new Error('Missing required parameters: languageCode, startYear, genreId');
    }

    // Fetch all genres from our DB
    const { data: genres } = await supabase.from('genres').select('id, genre_name, tmdb_genre_id');

    const genreNameToId: Record<string, string> = {};
    (genres || []).forEach(g => {
      genreNameToId[g.genre_name.toLowerCase()] = g.id;
    });

    // Fetch existing languages - ONLY use these, never add new ones
    const { data: existingLanguages } = await supabase.from('spoken_languages').select('iso_639_1');
    const validLanguageCodes = new Set((existingLanguages || []).map(l => l.iso_639_1));
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

    // Fetch official trailer channels from database
    const { data: officialChannels } = await supabase
      .from('official_trailer_channels')
      .select('channel_name, language_code, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    console.log(`Loaded ${officialChannels?.length || 0} official trailer channels`);

    const genreName = cachedGenreMap![tmdbGenreId] || `Unknown(${tmdbGenreId})`;
    console.log(`Processing: Language=${languageCode}, Year=${year}, Genre=${genreName} (ID: ${tmdbGenreId})`);

    let totalProcessed = 0;
    let moviesProcessed = 0;
    let seriesProcessed = 0;
    let skippedNoProvider = 0;

    // Helper function to fetch watch providers from TMDB (US region only)
    async function fetchWatchProviders(tmdbId: number, titleType: string): Promise<{ providers: Array<{ tmdbId: number; name: string; serviceId: string }> }> {
      try {
        const endpoint = titleType === 'movie' ? 'movie' : 'tv';
        const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return { providers: [] };
        
        const data = await res.json();
        const usProviders = data.results?.US?.flatrate || [];
        const matchedProviders: Array<{ tmdbId: number; name: string; serviceId: string }> = [];
        
        for (const provider of usProviders) {
          const mappedName = cachedProviderMap![provider.provider_id];
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

    // Helper function to fetch trailer from TMDB or YouTube
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
          const relevantChannels = (officialChannels || []).filter(c => 
            c.language_code === titleLang || c.language_code === 'global' || c.language_code === 'en'
          ).map(c => c.channel_name.toLowerCase());

          const searchQuery = titleType === 'tv' && seasonName 
            ? `${titleName} ${seasonName} official trailer`
            : `${titleName} ${releaseYear || ''} official trailer`;
          const youtubeRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`
          );
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

    // ==========================================
    // MOVIES PROCESSING
    // ==========================================
    
    // Helper function to process a movie
    async function processMovie(movie: any, phase: string) {
      try {
        const { providers } = await fetchWatchProviders(movie.id, 'movie');
        
        if (providers.length === 0) {
          skippedNoProvider++;
          return false;
        }

        const details = await fetchMovieDetails(movie.id);
        
        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
        const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(movie.id, 'movie', movie.title, releaseYear, movie.original_language || languageCode);

        // Build genres JSON array from TMDB genre IDs
        const movieGenreIds = movie.genre_ids || [];
        const genresJson = movieGenreIds
          .map((gId: number) => cachedGenreMap![gId])
          .filter(Boolean);

        const { data: upsertedTitle, error: titleError } = await supabase
          .from('titles')
          .upsert({
            tmdb_id: movie.id,
            title_type: 'movie',
            name: movie.title || details?.title,
            original_name: movie.original_title || details?.original_title,
            overview: movie.overview || details?.overview,
            release_date: movie.release_date || details?.release_date || null,
            first_air_date: null,
            last_air_date: null,
            status: details?.status || null,
            runtime: details?.runtime || null,
            episode_run_time: null,
            popularity: movie.popularity ?? details?.popularity,
            vote_average: movie.vote_average ?? details?.vote_average,
            poster_path: movie.poster_path || details?.poster_path,
            backdrop_path: movie.backdrop_path || details?.backdrop_path,
            original_language: movie.original_language || details?.original_language,
            is_adult: movie.adult || false,
            imdb_id: details?.imdb_id || null,
            trailer_url: trailerUrl,
            is_tmdb_trailer: isTmdbTrailer,
            title_genres: genresJson,
            updated_at: new Date().toISOString()
          }, { onConflict: 'tmdb_id,title_type' })
          .select('id')
          .single();

        if (titleError) {
          console.error(`Error upserting movie ${movie.title} (${phase}):`, titleError);
          return false;
        }

        if (upsertedTitle) {
          totalProcessed++;
          moviesProcessed++;

          // Streaming availability - delete old and insert fresh
          await supabase.from('title_streaming_availability')
            .delete()
            .eq('title_id', upsertedTitle.id)
            .eq('region_code', 'US');
          
          for (const provider of providers) {
            await supabase.from('title_streaming_availability').insert({
              title_id: upsertedTitle.id,
              streaming_service_id: provider.serviceId,
              region_code: 'US'
            });
          }

          if (details?.spoken_languages) {
            for (const lang of details.spoken_languages) {
              if (validLanguageCodes.has(lang.iso_639_1)) {
                await supabase.from('title_spoken_languages').upsert({ title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
              }
            }
          }

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
        console.error(`Error processing movie ${movie.title} (${phase}):`, error);
        return false;
      }
    }

    const processedMovieIds = new Set<number>();
    
    // CRITICAL: Determine if we should skip vote_average filter for recent content
    // New releases (within current year) may not have enough votes yet
    const currentYear = new Date().getFullYear();
    const isCurrentYear = year === currentYear;
    
    // Build vote_average filter - SKIP for current year to capture new releases
    const voteAverageFilter = isCurrentYear ? '' : `&vote_average.gte=${minRating}`;
    console.log(`Year ${year}: ${isCurrentYear ? 'SKIPPING vote_average filter (current year - new releases)' : `Using vote_average.gte=${minRating}`}`);

    // MOVIE PHASE 1: Year-based discovery
    // Using primary_release_year for EXACT year match
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
          context: { languageCode, year, genre: genreName, genreId: tmdbGenreId, totalProcessed, elapsedMs: elapsed, phase: 'movies-year', page: moviePage }
        });
        break;
      }

      // CRITICAL: with_genres expects a single genre ID
      // Movies that CONTAIN this genre will be returned (OR logic with multiple, AND if comma-separated)
      // We use single genre, so any movie with this genre is returned
      // NOTE: vote_average filter is SKIPPED for current year to capture new releases
      const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_year=${year}&with_genres=${tmdbGenreId}&with_original_language=${languageCode}${voteAverageFilter}&sort_by=popularity.desc&page=${moviePage}`;
      
      console.log(`[Movie Phase 1] Fetching: year=${year}, genre=${tmdbGenreId}, lang=${languageCode}, page=${moviePage}${isCurrentYear ? ' (no vote filter)' : ''}`);
      
      try {
        const moviesResponse = await fetch(moviesUrl);
        const moviesData = await moviesResponse.json();
        const movies = moviesData.results || [];
        movieTotalPages = Math.min(moviesData.total_pages || 1, 20);
        console.log(`[Year-based] Found ${movies.length} movies (page ${moviePage}/${movieTotalPages})`);

        for (const movie of movies) {
          processedMovieIds.add(movie.id);
          await processMovie(movie, 'year-based');
        }

        moviePage++;
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (err) {
        console.error('Error fetching movies page (year-based):', err);
        break;
      }
    }

    // MOVIE PHASE 2: Popularity-based discovery (captures classics regardless of year)
    const elapsedAfterMoviePhase1 = Date.now() - startTime;
    if (elapsedAfterMoviePhase1 < MAX_RUNTIME_MS - 30000) {
      console.log(`Starting Movie Phase 2: Popularity-based discovery for ${languageCode}/${genreName}`);
      
      let popularMoviePage = 1;
      let popularMovieTotalPages = 1;
      const MAX_POPULAR_MOVIE_PAGES = 15; // Increased to capture more classics
      
      while (popularMoviePage <= popularMovieTotalPages && popularMoviePage <= MAX_POPULAR_MOVIE_PAGES) {
        const elapsed = Date.now() - startTime;
        if (elapsed > MAX_RUNTIME_MS) {
          console.log(`Approaching time limit at ${elapsed}ms during Movie Phase 2. Stopping gracefully.`);
          break;
        }

        // NO year filter - get ALL popular movies for this language/genre
        const popularMovieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${tmdbGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=${popularMoviePage}`;
        
        try {
          const popularResponse = await fetch(popularMovieUrl);
          const popularData = await popularResponse.json();
          const movies = popularData.results || [];
          popularMovieTotalPages = Math.min(popularData.total_pages || 1, MAX_POPULAR_MOVIE_PAGES);
          console.log(`[Popularity-based] Found ${movies.length} movies (page ${popularMoviePage}/${popularMovieTotalPages})`);

          for (const movie of movies) {
            if (processedMovieIds.has(movie.id)) {
              continue;
            }
            processedMovieIds.add(movie.id);
            await processMovie(movie, 'popularity-based');
          }

          popularMoviePage++;
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (err) {
          console.error('Error fetching movies page (popularity-based):', err);
          break;
        }
      }
    } else {
      console.log(`Skipping Movie Phase 2 due to time constraints (${elapsedAfterMoviePhase1}ms elapsed)`);
    }

    // ==========================================
    // TV SHOWS PROCESSING
    // ==========================================

    // CRITICAL: Check if this genre has a TV equivalent
    // Movie-only genres (Horror, History, Music, Romance, Thriller, TV Movie) have NO TV equivalent
    const tvGenreId = cachedMovieToTvGenreMap![tmdbGenreId];
    
    if (tvGenreId === null || tvGenreId === undefined) {
      console.log(`⚠️ Genre "${genreName}" (${tmdbGenreId}) is movie-only - NO TV equivalent exists. Skipping TV discovery.`);
      // Skip TV discovery entirely for movie-only genres
    } else {
      // TV genre exists - proceed with TV discovery
      if (tvGenreId !== tmdbGenreId) {
        console.log(`Mapping movie genre "${genreName}" (${tmdbGenreId}) → TV genre ID ${tvGenreId}`);
      } else {
        console.log(`Using same genre ID ${tmdbGenreId} for TV (${genreName})`);
      }

      // Helper function to process a TV show
      async function processTvShow(show: any, phase: string) {
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
          const { url: trailerUrl, isTmdbTrailer: isTmdbTrailerTv } = await fetchTrailer(show.id, 'tv', show.name, releaseYear, show.original_language || languageCode, latestSeasonNumber, seasonName);

          // Build genres JSON array from TMDB genre IDs
          const showGenreIds = show.genre_ids || [];
          const genresJson = showGenreIds
            .map((gId: number) => cachedGenreMap![gId])
            .filter(Boolean);

          const { data: upsertedTitle, error: titleError } = await supabase
            .from('titles')
            .upsert({
              tmdb_id: show.id,
              title_type: 'tv',
              name: show.name || details?.name,
              original_name: show.original_name || details?.original_name,
              overview: show.overview || details?.overview,
              release_date: null,
              first_air_date: show.first_air_date || details?.first_air_date || null,
              last_air_date: details?.last_air_date || null,
              status: details?.status || null,
              runtime: null,
              episode_run_time: details?.episode_run_time || null,
              popularity: show.popularity ?? details?.popularity,
              vote_average: show.vote_average ?? details?.vote_average,
              poster_path: show.poster_path || details?.poster_path,
              backdrop_path: show.backdrop_path || details?.backdrop_path,
              original_language: show.original_language || details?.original_language,
              is_adult: show.adult || false,
              imdb_id: details?.external_ids?.imdb_id || null,
              trailer_url: trailerUrl,
              is_tmdb_trailer: isTmdbTrailerTv,
              title_genres: genresJson,
              updated_at: new Date().toISOString()
            }, { onConflict: 'tmdb_id,title_type' })
            .select('id')
            .single();

          if (titleError) {
            console.error(`Error upserting show ${show.name} (${phase}):`, titleError);
            return false;
          }

          if (upsertedTitle) {
            totalProcessed++;
            seriesProcessed++;

            // Streaming availability - delete old and insert fresh
            await supabase.from('title_streaming_availability')
              .delete()
              .eq('title_id', upsertedTitle.id)
              .eq('region_code', 'US');
            
            for (const provider of providers) {
              await supabase.from('title_streaming_availability').insert({
                title_id: upsertedTitle.id,
                streaming_service_id: provider.serviceId,
                region_code: 'US'
              });
            }

            if (details?.spoken_languages) {
              for (const lang of details.spoken_languages) {
                if (validLanguageCodes.has(lang.iso_639_1)) {
                  await supabase.from('title_spoken_languages').upsert({ title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
                }
              }
            }

            // Store seasons with trailers
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
                        seasonIsTmdbTrailer = true;
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
                        const officialChannelTrailer = ytData.items?.find((item: any) => {
                          const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
                          return relevantChannels.some(officialName => channelTitle.includes(officialName.toLowerCase()));
                        });
                        if (officialChannelTrailer) {
                          seasonTrailerUrl = `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`;
                          seasonIsTmdbTrailer = false;
                        } else {
                          const verifiedTrailer = ytData.items?.find((item: any) => {
                            const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
                            const videoTitle = item.snippet.title?.toLowerCase() || '';
                            const hasOfficialInTitle = videoTitle.includes('official trailer');
                            const isOfficialChannel = channelTitle.includes('pictures') || channelTitle.includes('studios') || channelTitle.includes('entertainment') || channelTitle.includes('netflix') || channelTitle.includes('disney');
                            return hasOfficialInTitle && isOfficialChannel;
                          });
                          if (verifiedTrailer) {
                            seasonTrailerUrl = `https://www.youtube.com/watch?v=${verifiedTrailer.id.videoId}`;
                            seasonIsTmdbTrailer = false;
                          }
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
          console.error(`Error processing show ${show.name} (${phase}):`, error);
          return false;
        }
      }

      const processedTvIds = new Set<number>();

      // TV PHASE 1: Year-based discovery
      // IMPORTANT: air_date filter in discover/tv refers to FIRST air date, not season air dates
      // This means shows that premiered in this year will be found
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
            context: { languageCode, year, genre: genreName, genreId: tmdbGenreId, tvGenreId, totalProcessed, elapsedMs: elapsed, phase: 'tv-year', page: tvPage }
          });
          break;
        }

        // Use CORRECT TV genre ID for TV show discovery
        // NOTE: vote_average filter is SKIPPED for current year to capture new releases
        const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${year}-01-01&air_date.lte=${year}-12-31&with_genres=${tvGenreId}&with_original_language=${languageCode}${voteAverageFilter}&sort_by=popularity.desc&page=${tvPage}`;
        
        console.log(`[TV Phase 1] Fetching: year=${year}, tvGenreId=${tvGenreId}, lang=${languageCode}, page=${tvPage}${isCurrentYear ? ' (no vote filter)' : ''}`);
        
        try {
          const tvResponse = await fetch(tvUrl);
          const tvData = await tvResponse.json();
          const shows = tvData.results || [];
          tvTotalPages = Math.min(tvData.total_pages || 1, 20);
          console.log(`[Year-based] Found ${shows.length} TV shows (page ${tvPage}/${tvTotalPages})`);

          for (const show of shows) {
            processedTvIds.add(show.id);
            await processTvShow(show, 'year-based');
          }

          tvPage++;
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (err) {
          console.error('Error fetching TV shows page (year-based):', err);
          break;
        }
      }

      // TV PHASE 2: Popularity-based discovery (captures classic/popular shows regardless of year)
      // This is CRITICAL for catching shows like "Breaking Bad", "Friends", "The Office"
      // that premiered years ago but are still highly popular
      const elapsedAfterTvPhase1 = Date.now() - startTime;
      if (elapsedAfterTvPhase1 < MAX_RUNTIME_MS - 30000) {
        console.log(`Starting TV Phase 2: Popularity-based discovery for ${languageCode}/${genreName}`);
        
        let popularPage = 1;
        let popularTotalPages = 1;
        const MAX_POPULAR_PAGES = 15; // Increased to capture more classics
        
        while (popularPage <= popularTotalPages && popularPage <= MAX_POPULAR_PAGES) {
          const elapsed = Date.now() - startTime;
          if (elapsed > MAX_RUNTIME_MS) {
            console.log(`Approaching time limit at ${elapsed}ms during TV Phase 2. Stopping gracefully.`);
            break;
          }

          // NO year filter - get ALL popular shows for this language/genre
          const popularUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${tvGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=${popularPage}`;
          
          try {
            const popularResponse = await fetch(popularUrl);
            const popularData = await popularResponse.json();
            const shows = popularData.results || [];
            popularTotalPages = Math.min(popularData.total_pages || 1, MAX_POPULAR_PAGES);
            console.log(`[Popularity-based] Found ${shows.length} TV shows (page ${popularPage}/${popularTotalPages})`);

            for (const show of shows) {
              if (processedTvIds.has(show.id)) {
                continue;
              }
              processedTvIds.add(show.id);
              await processTvShow(show, 'popularity-based');
            }

            popularPage++;
            await new Promise(resolve => setTimeout(resolve, 250));
          } catch (err) {
            console.error('Error fetching TV shows page (popularity-based):', err);
            break;
          }
        }
      } else {
        console.log(`Skipping TV Phase 2 due to time constraints (${elapsedAfterTvPhase1}ms elapsed)`);
      }
    }

    // ==========================================
    // TV PHASE 3: TV-ONLY GENRES (Kids, Reality, News, Soap, Talk)
    // These genres have NO movie equivalent and must be searched separately
    // ==========================================
    const tvOnlyGenresToSearch = cachedTvOnlyGenres![tmdbGenreId] || [];
    
    if (tvOnlyGenresToSearch.length > 0) {
      const elapsedBeforeTvOnly = Date.now() - startTime;
      if (elapsedBeforeTvOnly < MAX_RUNTIME_MS - 20000) {
        console.log(`Starting TV Phase 3: TV-only genres ${tvOnlyGenresToSearch.map(g => cachedTvOnlyGenreNames![g] || g).join(', ')} for ${languageCode}`);
        
        // Reuse processedTvIds from earlier phases if available
        const processedTvIdsForTvOnly = new Set<number>();
        
        for (const tvOnlyGenreId of tvOnlyGenresToSearch) {
          const tvOnlyGenreName = cachedTvOnlyGenreNames![tvOnlyGenreId] || `Unknown(${tvOnlyGenreId})`;
          console.log(`Searching TV-only genre: ${tvOnlyGenreName} (${tvOnlyGenreId})`);
          
          // Phase 3a: Year-based discovery for TV-only genre
          let tvOnlyPage = 1;
          let tvOnlyTotalPages = 1;
          
          while (tvOnlyPage <= tvOnlyTotalPages && tvOnlyPage <= 10) {
            const elapsed = Date.now() - startTime;
            if (elapsed > MAX_RUNTIME_MS) {
              console.log(`Time limit reached during TV-only genre discovery. Stopping.`);
              break;
            }
            
            // NOTE: vote_average filter is SKIPPED for current year to capture new releases
            const tvOnlyUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${year}-01-01&air_date.lte=${year}-12-31&with_genres=${tvOnlyGenreId}&with_original_language=${languageCode}${voteAverageFilter}&sort_by=popularity.desc&page=${tvOnlyPage}`;
            
            try {
              const tvOnlyResponse = await fetch(tvOnlyUrl);
              const tvOnlyData = await tvOnlyResponse.json();
              const shows = tvOnlyData.results || [];
              tvOnlyTotalPages = Math.min(tvOnlyData.total_pages || 1, 10);
              console.log(`[TV-only ${tvOnlyGenreName}] Found ${shows.length} shows (page ${tvOnlyPage}/${tvOnlyTotalPages})`);
              
              for (const show of shows) {
                if (processedTvIdsForTvOnly.has(show.id)) continue;
                processedTvIdsForTvOnly.add(show.id);
                
                // Process TV show using existing helper function
                const { providers } = await fetchWatchProviders(show.id, 'tv');
                if (providers.length === 0) {
                  skippedNoProvider++;
                  continue;
                }
                
                const details = await fetchTvDetails(show.id);
                const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
                const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
                const latestSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
                const latestSeason = seasons.find((s: any) => s.season_number === latestSeasonNumber);
                const seasonName = latestSeason?.name || (latestSeasonNumber ? `Season ${latestSeasonNumber}` : undefined);
                const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(show.id, 'tv', show.name, releaseYear, show.original_language || languageCode, latestSeasonNumber, seasonName);
                
                // Build genres JSON array
                const showGenreIds = show.genre_ids || [];
                const genresJson = showGenreIds
                  .map((gId: number) => cachedGenreMap![gId])
                  .filter(Boolean);

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
                    trailer_url: trailerUrl,
                    is_tmdb_trailer: isTmdbTrailer,
                    title_genres: genresJson,
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'tmdb_id,title_type' })
                  .select('id')
                  .single();
                
                if (titleError) {
                  console.error(`Error upserting TV-only show ${show.name}:`, titleError);
                  continue;
                }
                
                if (upsertedTitle) {
                  totalProcessed++;
                  seriesProcessed++;
                  
                  // Streaming availability - delete old and insert fresh
                  await supabase.from('title_streaming_availability')
                    .delete()
                    .eq('title_id', upsertedTitle.id)
                    .eq('region_code', 'US');
                  
                  for (const provider of providers) {
                    await supabase.from('title_streaming_availability').insert({
                      title_id: upsertedTitle.id,
                      streaming_service_id: provider.serviceId,
                      region_code: 'US'
                    });
                  }
                  
                  // Map languages
                  if (details?.spoken_languages) {
                    for (const lang of details.spoken_languages) {
                      if (validLanguageCodes.has(lang.iso_639_1)) {
                        await supabase.from('title_spoken_languages').upsert({ title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
                      }
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
                        poster_path: season.poster_path,
                        trailer_url: null,
                        is_tmdb_trailer: true
                      }, { onConflict: 'title_id,season_number' });
                    }
                  }
                }
              }
              
              tvOnlyPage++;
              await new Promise(resolve => setTimeout(resolve, 250));
            } catch (err) {
              console.error(`Error fetching TV-only genre ${tvOnlyGenreName}:`, err);
              break;
            }
          }
          
          // Phase 3b: Popularity-based for TV-only genre (to catch classics)
          const elapsedAfterTvOnlyYears = Date.now() - startTime;
          if (elapsedAfterTvOnlyYears < MAX_RUNTIME_MS - 10000) {
            let tvOnlyPopPage = 1;
            const MAX_TV_ONLY_POP_PAGES = 5;
            
            while (tvOnlyPopPage <= MAX_TV_ONLY_POP_PAGES) {
              const elapsed = Date.now() - startTime;
              if (elapsed > MAX_RUNTIME_MS) break;
              
              const tvOnlyPopUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${tvOnlyGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=${tvOnlyPopPage}`;
              
              try {
                const popResponse = await fetch(tvOnlyPopUrl);
                const popData = await popResponse.json();
                const shows = popData.results || [];
                
                for (const show of shows) {
                  if (processedTvIdsForTvOnly.has(show.id)) continue;
                  processedTvIdsForTvOnly.add(show.id);
                  
                  const { providers } = await fetchWatchProviders(show.id, 'tv');
                  if (providers.length === 0) {
                    skippedNoProvider++;
                    continue;
                  }
                  
                  const details = await fetchTvDetails(show.id);
                  const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
                  const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
                  const latestSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
                  const latestSeason = seasons.find((s: any) => s.season_number === latestSeasonNumber);
                  const seasonName = latestSeason?.name || (latestSeasonNumber ? `Season ${latestSeasonNumber}` : undefined);
                  const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(show.id, 'tv', show.name, releaseYear, show.original_language || languageCode, latestSeasonNumber, seasonName);
                  
                  // Build genres JSON array
                  const showGenreIds = show.genre_ids || [];
                  const genresJson = showGenreIds
                    .map((gId: number) => cachedGenreMap![gId])
                    .filter(Boolean);

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
                      trailer_url: trailerUrl,
                      is_tmdb_trailer: isTmdbTrailer,
                      title_genres: genresJson,
                      updated_at: new Date().toISOString()
                    }, { onConflict: 'tmdb_id,title_type' })
                    .select('id')
                    .single();
                  
                  if (!titleError && upsertedTitle) {
                    totalProcessed++;
                    seriesProcessed++;
                    
                    // Streaming availability - delete old and insert fresh
                    await supabase.from('title_streaming_availability')
                      .delete()
                      .eq('title_id', upsertedTitle.id)
                      .eq('region_code', 'US');
                    
                    for (const provider of providers) {
                      await supabase.from('title_streaming_availability').insert({
                        title_id: upsertedTitle.id,
                        streaming_service_id: provider.serviceId,
                        region_code: 'US'
                      });
                    }
                    
                    if (details?.spoken_languages) {
                      for (const lang of details.spoken_languages) {
                        if (validLanguageCodes.has(lang.iso_639_1)) {
                          await supabase.from('title_spoken_languages').upsert({ title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 }, { onConflict: 'title_id,iso_639_1' });
                        }
                      }
                    }
                    
                    if (details?.seasons) {
                      for (const season of details.seasons) {
                        await supabase.from('seasons').upsert({
                          title_id: upsertedTitle.id,
                          season_number: season.season_number,
                          episode_count: season.episode_count,
                          air_date: season.air_date || null,
                          name: season.name,
                          overview: season.overview,
                          poster_path: season.poster_path,
                          trailer_url: null,
                          is_tmdb_trailer: true
                        }, { onConflict: 'title_id,season_number' });
                      }
                    }
                  }
                }
                
                tvOnlyPopPage++;
                await new Promise(resolve => setTimeout(resolve, 250));
              } catch (err) {
                console.error(`Error in TV-only popularity phase for ${tvOnlyGenreName}:`, err);
                break;
              }
            }
          }
        }
        console.log(`Completed TV Phase 3: TV-only genres for ${languageCode}`);
      } else {
        console.log(`Skipping TV Phase 3 due to time constraints`);
      }
    }

    // Update job stats
    try {
      await supabase.rpc('increment_job_titles', {
        p_job_type: 'full_refresh',
        p_increment: totalProcessed
      });
    } catch (err) {
      console.error('Error incrementing job titles:', err);
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    console.log(`Completed: ${languageCode}/${year}/${genreName}. Processed: ${totalProcessed}, Skipped (no provider): ${skippedNoProvider}, Duration: ${durationMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        language: languageCode,
        year,
        genre: genreName,
        genreId: tmdbGenreId,
        titlesProcessed: totalProcessed,
        moviesProcessed,
        seriesProcessed,
        skippedNoProvider,
        durationMs
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Full refresh error:', error);
    
    // Log error to system_logs
    await supabase.from('system_logs').insert({
      severity: 'error',
      operation: 'full-refresh-titles-error',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : null,
      context: { requestBody: requestBody || {} }
    });
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
