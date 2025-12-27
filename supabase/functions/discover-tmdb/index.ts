import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMDB Genre ID to Name mapping
const GENRE_MAP: Record<number, string> = {
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
};

// Reverse mapping: genre name to ID
const GENRE_NAME_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name, parseInt(id)])
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      languages = ['en'], 
      streamingProviderIds = [], // TMDB provider IDs (e.g., 8=Netflix, 337=Disney+, 9=Amazon)
      minYear, 
      minRating = 6, 
      minPopularity = 10,
      limit = 100,
      excludeKids = true,
      region = 'US'
    } = await req.json();

    if (!TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not configured');
    }

    // Calculate date range (last 3 years from minYear or current date)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const minDate = minYear || threeYearsAgo.toISOString().split('T')[0];

    const providerFilter = streamingProviderIds.length > 0 ? streamingProviderIds.join('|') : null;
    
    console.log(`[discover-tmdb] Fetching movies: languages=${languages}, minDate=${minDate}, minRating=${minRating}, providers=${providerFilter || 'none'}, region=${region}`);

    // Fetch multiple pages to get enough movies - track language priority
    const allMovies: any[] = [];
    const pagesToFetch = Math.ceil(limit / 20); // TMDB returns 20 per page

    for (let langIndex = 0; langIndex < languages.length; langIndex++) {
      const language = languages[langIndex];
      const languagePriority = languages.length - langIndex; // Higher priority for earlier languages
      
      // Use lower vote_count threshold for non-English languages (they have fewer votes on TMDB)
      const voteCountThreshold = language === 'en' ? 50 : 20;
      
      console.log(`[discover-tmdb] Fetching ${language} movies (priority=${languagePriority}, voteCount>=${voteCountThreshold})`);
      
      for (let page = 1; page <= Math.min(pagesToFetch, 5); page++) {
        const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
        url.searchParams.set('api_key', TMDB_API_KEY);
        url.searchParams.set('language', 'en-US'); // Response language
        url.searchParams.set('with_original_language', language);
        url.searchParams.set('primary_release_date.gte', minDate);
        url.searchParams.set('vote_average.gte', minRating.toString());
        url.searchParams.set('vote_count.gte', voteCountThreshold.toString());
        url.searchParams.set('sort_by', 'popularity.desc');
        url.searchParams.set('page', page.toString());
        url.searchParams.set('include_adult', 'false');
        
        // Add streaming provider filter - use the provided region for all languages
        if (providerFilter) {
          url.searchParams.set('with_watch_providers', providerFilter);
          url.searchParams.set('watch_region', region);
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.results) {
          // Attach language priority to each movie
          allMovies.push(...data.results.map((m: any) => ({ 
            ...m, 
            original_language: language,
            language_priority: languagePriority
          })));
        }
      }
    }

    console.log(`[discover-tmdb] Fetched ${allMovies.length} raw movies`);

    // Deduplicate by TMDB ID - keep the one with highest language priority
    const movieMap = new Map<number, any>();
    for (const movie of allMovies) {
      const existing = movieMap.get(movie.id);
      if (!existing || movie.language_priority > existing.language_priority) {
        movieMap.set(movie.id, movie);
      }
    }
    const uniqueMovies = Array.from(movieMap.values());

    // Filter by popularity
    const filteredMovies = uniqueMovies.filter(m => (m.popularity || 0) >= minPopularity);

    console.log(`[discover-tmdb] After filtering: ${filteredMovies.length} movies`);

    // Sort by language priority first, then by popularity
    const topMovies = filteredMovies
      .sort((a, b) => {
        // Primary sort: language priority (descending)
        if (b.language_priority !== a.language_priority) {
          return b.language_priority - a.language_priority;
        }
        // Secondary sort: popularity (descending)
        return (b.popularity || 0) - (a.popularity || 0);
      })
      .slice(0, limit);

    // Format response
    const formattedMovies = topMovies.map((movie: any) => ({
      tmdb_id: movie.id,
      name: movie.title || movie.original_title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      popularity: movie.popularity,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
      original_language: movie.original_language,
      genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean),
      overview: movie.overview,
    }));

    console.log(`[discover-tmdb] Returning ${formattedMovies.length} movies. Top 5:`, 
      formattedMovies.slice(0, 5).map((m: any) => `${m.name} (${m.release_date})`));

    return new Response(
      JSON.stringify({ movies: formattedMovies }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[discover-tmdb] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
