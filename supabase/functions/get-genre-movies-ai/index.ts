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
  'Action': { movie: 28, tv: 10759 },
  'Adventure': { movie: 12, tv: 10759 },
  'Animation': { movie: 16, tv: 16 },
  'Comedy': { movie: 35, tv: 35 },
  'Crime': { movie: 80, tv: 80 },
  'Documentary': { movie: 99, tv: 99 },
  'Drama': { movie: 18, tv: 18 },
  'Family': { movie: 10751, tv: 10751 },
  'Fantasy': { movie: 14, tv: 10765 },
  'History': { movie: 36, tv: 36 },
  'Horror': { movie: 27, tv: 27 },
  'Music': { movie: 10402, tv: 10402 },
  'Mystery': { movie: 9648, tv: 9648 },
  'Romance': { movie: 10749, tv: 10749 },
  'Science Fiction': { movie: 878, tv: 10765 },
  'Thriller': { movie: 53, tv: 53 },
  'War': { movie: 10752, tv: 10768 },
  'Western': { movie: 37, tv: 37 },
};

const GENRES = Object.keys(GENRE_MAP);

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

interface FoundTitle {
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      languages = ['en', 'hi', 'ko'], 
      streamingServices = ['Netflix', 'Prime Video'],
      yearsBack = 3,
      region = 'US'
    } = await req.json();

    if (!tmdbApiKey) {
      throw new Error('TMDB_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Calculate date range
    const today = new Date();
    const minDate = new Date(today.getFullYear() - yearsBack, today.getMonth(), today.getDate())
      .toISOString().split('T')[0];
    const maxDate = today.toISOString().split('T')[0];

    // Get provider IDs from database mappings
    const { data: providerMappings } = await supabase
      .from('tmdb_provider_mappings')
      .select('tmdb_provider_id, service_name')
      .eq('is_active', true)
      .eq('region_code', region)
      .in('service_name', streamingServices);

    const providerIds = [...new Set(providerMappings?.map(p => p.tmdb_provider_id) || [])];
    
    console.log(`[get-genre-movies-ai] Config: languages=${languages.join(',')}, providers=${streamingServices.join(',')} (IDs: ${providerIds.join(',')}), region=${region}, dateRange=${minDate} to ${maxDate}`);

    const usedTmdbIds = new Set<number>();
    const results: Array<{
      genre: string;
      title: FoundTitle | null;
      source: string;
    }> = [];

    const animationGenreId = 16;

    // Helper function to fetch from TMDB
    async function fetchFromTMDB(
      genre: string,
      lang: string,
      mediaType: 'movie' | 'tv',
      useProviderFilter: boolean
    ): Promise<TMDBResult[]> {
      const genreIds = GENRE_MAP[genre];
      const genreId = mediaType === 'movie' ? genreIds.movie : genreIds.tv;
      const dateParam = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
      
      // Lower vote threshold for non-English to find more results
      const voteThreshold = lang === 'en' ? '100' : '20';
      
      const params = new URLSearchParams({
        api_key: tmdbApiKey!,
        language: 'en-US',
        sort_by: 'popularity.desc',
        'vote_count.gte': voteThreshold,
        'vote_average.gte': '6.0',
        with_genres: String(genreId),
        with_original_language: lang,
        [`${dateParam}.gte`]: minDate,
        [`${dateParam}.lte`]: maxDate,
        page: '1',
      });

      // Add streaming provider filter if requested and we have providers
      if (useProviderFilter && providerIds.length > 0) {
        params.append('with_watch_providers', providerIds.join('|'));
        params.append('watch_region', region);
      }

      // Exclude animation from non-Animation genres
      if (genre !== 'Animation') {
        params.append('without_genres', String(animationGenreId));
      }

      const url = `https://api.themoviedb.org/3/discover/${mediaType}?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[get-genre-movies-ai] TMDB error for ${genre}/${lang}/${mediaType}:`, await response.text());
        return [];
      }

      const data = await response.json();
      return data.results || [];
    }

    // Helper to process TMDB results and find first unused title
    async function processResults(
      tmdbResults: TMDBResult[],
      mediaType: 'movie' | 'tv'
    ): Promise<{ title: FoundTitle; source: string } | null> {
      for (const item of tmdbResults) {
        if (usedTmdbIds.has(item.id)) continue;
        
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
          return {
            title: {
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
            },
            source: 'database'
          };
        } else {
          return {
            title: {
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
            },
            source: 'tmdb'
          };
        }
      }
      return null;
    }

    // Process each genre
    for (const genre of GENRES) {
      let foundResult: { title: FoundTitle; source: string } | null = null;

      // Try each language in preference order
      for (const lang of languages) {
        if (foundResult) break;

        // Try movies first, then TV
        for (const mediaType of ['movie', 'tv'] as const) {
          if (foundResult) break;

          try {
            // First try WITH streaming provider filter
            let tmdbResults = await fetchFromTMDB(genre, lang, mediaType, true);
            foundResult = await processResults(tmdbResults, mediaType);

            // If no results with provider filter, try WITHOUT (fallback)
            if (!foundResult && providerIds.length > 0) {
              console.log(`[get-genre-movies-ai] ${genre}/${lang}/${mediaType}: No results with provider filter, trying without...`);
              tmdbResults = await fetchFromTMDB(genre, lang, mediaType, false);
              foundResult = await processResults(tmdbResults, mediaType);
              if (foundResult) {
                foundResult.source += '_no_provider_filter';
              }
            }
          } catch (error) {
            console.error(`[get-genre-movies-ai] Error fetching ${genre}/${lang}/${mediaType}:`, error);
          }
        }
      }

      results.push({
        genre,
        title: foundResult?.title || null,
        source: foundResult?.source || 'not_found',
      });

      console.log(`[get-genre-movies-ai] ${genre}: ${foundResult ? `"${foundResult.title.name}" (${foundResult.source}, lang: ${foundResult.title.original_language})` : 'NOT FOUND'}`);
    }

    // Stats
    const found = results.filter(r => r.title !== null).length;
    const fromDb = results.filter(r => r.source === 'database').length;
    const fromTmdb = results.filter(r => r.source.startsWith('tmdb')).length;
    const withoutProviderFilter = results.filter(r => r.source.includes('no_provider_filter')).length;
    
    console.log(`[get-genre-movies-ai] Complete: ${found}/${results.length} found (DB: ${fromDb}, TMDB: ${fromTmdb}, noProviderFilter: ${withoutProviderFilter})`);

    return new Response(
      JSON.stringify({ 
        movies: results,
        stats: {
          total: results.length,
          found,
          fromDb,
          fromTmdb,
          withoutProviderFilter,
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
