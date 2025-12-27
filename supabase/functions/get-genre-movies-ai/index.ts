import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMDB genre IDs - mapped for both movies and TV
const GENRE_MAP: Record<string, { movie: number; tv: number }> = {
  'Action': { movie: 28, tv: 10759 },       // TV uses "Action & Adventure"
  'Adventure': { movie: 12, tv: 10759 },    // TV uses "Action & Adventure"
  'Animation': { movie: 16, tv: 16 },
  'Comedy': { movie: 35, tv: 35 },
  'Crime': { movie: 80, tv: 80 },
  'Documentary': { movie: 99, tv: 99 },
  'Drama': { movie: 18, tv: 18 },
  'Family': { movie: 10751, tv: 10751 },
  'Fantasy': { movie: 14, tv: 10765 },      // TV uses "Sci-Fi & Fantasy"
  'History': { movie: 36, tv: 36 },
  'Horror': { movie: 27, tv: 27 },
  'Music': { movie: 10402, tv: 10402 },
  'Mystery': { movie: 9648, tv: 9648 },
  'Romance': { movie: 10749, tv: 10749 },
  'Science Fiction': { movie: 878, tv: 10765 }, // TV uses "Sci-Fi & Fantasy"
  'Thriller': { movie: 53, tv: 53 },
  'War': { movie: 10752, tv: 10768 },       // TV uses "War & Politics"
  'Western': { movie: 37, tv: 37 },
};

const GENRES = Object.keys(GENRE_MAP);

// TMDB streaming provider IDs (US region)
const PROVIDER_MAP: Record<string, number> = {
  'Netflix': 8,
  'Amazon Prime Video': 9,
  'Disney+': 337,
  'Hulu': 15,
  'HBO Max': 384,
  'Apple TV+': 350,
  'Paramount+': 531,
  'Peacock': 386,
  'Max': 1899,
};

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  original_language: string;
  genre_ids: number[];
  popularity: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      languages = ['en', 'hi', 'ko'], 
      streamingServices = ['Netflix', 'Amazon Prime Video'],
      yearsBack = 3
    } = await req.json();

    if (!tmdbApiKey) {
      throw new Error('TMDB_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Calculate date range (last 3 years)
    const today = new Date();
    const minDate = new Date(today.getFullYear() - yearsBack, today.getMonth(), today.getDate())
      .toISOString().split('T')[0];
    const maxDate = today.toISOString().split('T')[0];

    // Get provider IDs for user's streaming services
    const providerIds = streamingServices
      .map((s: string) => PROVIDER_MAP[s])
      .filter((id: number | undefined): id is number => id !== undefined);

    console.log(`[get-genre-movies-ai] Fetching for languages: ${languages.join(', ')}, providers: ${streamingServices.join(', ')}, dateRange: ${minDate} to ${maxDate}`);

    const usedTmdbIds = new Set<number>();
    const results: Array<{
      genre: string;
      title: {
        id: string;
        name: string;
        poster_path: string | null;
        backdrop_path: string | null;
        overview: string | null;
        vote_average: number | null;
        release_date: string | null;
        original_language: string | null;
        title_type: string;
        tmdb_id: number;
      } | null;
      source: string;
    }> = [];

    // Animation genre ID for exclusion
    const animationGenreId = 16;

    // Process each genre
    for (const genre of GENRES) {
      const genreIds = GENRE_MAP[genre];
      let foundTitle = null;
      let source = 'not_found';

      // Try each language in preference order
      for (const lang of languages) {
        if (foundTitle) break;

        // Try movies first, then TV
        for (const mediaType of ['movie', 'tv'] as const) {
          if (foundTitle) break;

          const genreId = mediaType === 'movie' ? genreIds.movie : genreIds.tv;
          const dateParam = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
          
          // Build query params
          const params = new URLSearchParams({
            api_key: tmdbApiKey,
            language: 'en-US',
            sort_by: 'popularity.desc',
            'vote_count.gte': '100',       // Ensure it's well-known
            'vote_average.gte': '6.5',     // Good ratings
            with_genres: String(genreId),
            with_original_language: lang,
            [`${dateParam}.gte`]: minDate,
            [`${dateParam}.lte`]: maxDate,
            page: '1',
          });

          // Add streaming provider filter if we have providers
          if (providerIds.length > 0) {
            params.append('with_watch_providers', providerIds.join('|'));
            params.append('watch_region', 'US');
          }

          // For non-Animation genres, exclude animation
          if (genre !== 'Animation') {
            params.append('without_genres', String(animationGenreId));
          }

          try {
            const url = `https://api.themoviedb.org/3/discover/${mediaType}?${params.toString()}`;
            const response = await fetch(url);
            
            if (!response.ok) {
              console.error(`[get-genre-movies-ai] TMDB error for ${genre}/${lang}/${mediaType}:`, await response.text());
              continue;
            }

            const data = await response.json();
            const tmdbResults: TMDBResult[] = data.results || [];

            // Find first result not already used
            for (const item of tmdbResults) {
              if (!usedTmdbIds.has(item.id)) {
                usedTmdbIds.add(item.id);
                
                const titleName = mediaType === 'movie' ? item.title : item.name;
                const releaseDate = mediaType === 'movie' ? item.release_date : item.first_air_date;

                // Check if exists in our database
                const { data: dbTitle } = await supabase
                  .from('titles')
                  .select('id, name, poster_path, backdrop_path, overview, vote_average, release_date, first_air_date, original_language, title_type, tmdb_id')
                  .eq('tmdb_id', item.id)
                  .limit(1);

                if (dbTitle && dbTitle.length > 0) {
                  foundTitle = {
                    id: dbTitle[0].id,
                    name: dbTitle[0].name,
                    poster_path: dbTitle[0].poster_path,
                    backdrop_path: dbTitle[0].backdrop_path,
                    overview: dbTitle[0].overview,
                    vote_average: dbTitle[0].vote_average,
                    release_date: dbTitle[0].release_date || dbTitle[0].first_air_date,
                    original_language: dbTitle[0].original_language,
                    title_type: dbTitle[0].title_type,
                    tmdb_id: item.id,
                  };
                  source = 'database';
                } else {
                  foundTitle = {
                    id: `tmdb-${mediaType}-${item.id}`,
                    name: titleName || 'Unknown',
                    poster_path: item.poster_path,
                    backdrop_path: item.backdrop_path,
                    overview: item.overview,
                    vote_average: item.vote_average,
                    release_date: releaseDate || null,
                    original_language: item.original_language,
                    title_type: mediaType === 'movie' ? 'movie' : 'tv',
                    tmdb_id: item.id,
                  };
                  source = 'tmdb';
                }
                break;
              }
            }
          } catch (error) {
            console.error(`[get-genre-movies-ai] Error fetching ${genre}/${lang}/${mediaType}:`, error);
          }
        }
      }

      results.push({
        genre,
        title: foundTitle,
        source,
      });

      console.log(`[get-genre-movies-ai] ${genre}: ${foundTitle ? `"${foundTitle.name}" (${source}, lang: ${foundTitle.original_language})` : 'NOT FOUND'}`);
    }

    // Stats
    const found = results.filter(r => r.title !== null).length;
    const fromDb = results.filter(r => r.source === 'database').length;
    const fromTmdb = results.filter(r => r.source === 'tmdb').length;
    
    console.log(`[get-genre-movies-ai] Complete: ${found}/${results.length} found (DB: ${fromDb}, TMDB: ${fromTmdb})`);

    return new Response(
      JSON.stringify({ 
        movies: results,
        stats: {
          total: results.length,
          found,
          fromDb,
          fromTmdb,
          notFound: results.length - found
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[get-genre-movies-ai] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
