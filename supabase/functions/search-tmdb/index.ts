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
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, genres, language = 'en', limit = 20, page = 1 } = await req.json();

    if (!TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not configured');
    }

    // Search both movies and TV shows
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query || 'popular')}&language=${language}&page=${page}`),
      fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query || 'popular')}&language=${language}&page=${page}`)
    ]);

    const [movieData, tvData] = await Promise.all([
      movieResponse.json(),
      tvResponse.json()
    ]);

    // Fetch certifications and details for movies
    const moviesWithCertifications = await Promise.all(
      (movieData.results || []).slice(0, 10).map(async (movie: any) => {
        try {
          const [certResponse, detailsResponse] = await Promise.all([
            fetch(`${TMDB_BASE_URL}/movie/${movie.id}/release_dates?api_key=${TMDB_API_KEY}`),
            fetch(`${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=${language}`)
          ]);
          const [certData, details] = await Promise.all([
            certResponse.json(),
            detailsResponse.json()
          ]);
          
          // Find US certification
          const usCertification = certData.results?.find((r: any) => r.iso_3166_1 === 'US');
          const certification = usCertification?.release_dates?.[0]?.certification || 'NR';
          
          return {
            id: `tmdb-movie-${movie.id}`,
            tmdb_id: movie.id,
            external_id: `tmdb-movie-${movie.id}`,
            title: movie.title || movie.original_title,
            content_type: 'movie',
            type: 'movie',
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            description: movie.overview,
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : undefined,
            genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean),
            mood_tags: [],
            rating: movie.vote_average,
            popularity: movie.popularity,
            certification: certification,
            runtime_minutes: details.runtime
          };
        } catch (error) {
          console.error(`Error fetching details for movie ${movie.id}:`, error);
          return {
            id: `tmdb-movie-${movie.id}`,
            tmdb_id: movie.id,
            external_id: `tmdb-movie-${movie.id}`,
            title: movie.title || movie.original_title,
            content_type: 'movie',
            type: 'movie',
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            description: movie.overview,
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : undefined,
            genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean),
            mood_tags: [],
            rating: movie.vote_average,
            popularity: movie.popularity,
            certification: 'NR'
          };
        }
      })
    );

    // Fetch detailed info for TV shows to get number of seasons and certification
    const tvShowsWithDetails = await Promise.all(
      (tvData.results || []).slice(0, 10).map(async (tv: any) => {
        try {
          const [detailsResponse, certResponse] = await Promise.all([
            fetch(`${TMDB_BASE_URL}/tv/${tv.id}?api_key=${TMDB_API_KEY}&language=${language}`),
            fetch(`${TMDB_BASE_URL}/tv/${tv.id}/content_ratings?api_key=${TMDB_API_KEY}`)
          ]);
          const [details, certData] = await Promise.all([
            detailsResponse.json(),
            certResponse.json()
          ]);
          
          // Find US certification
          const usCertification = certData.results?.find((r: any) => r.iso_3166_1 === 'US');
          const certification = usCertification?.rating || 'NR';
          
          return {
            id: `tmdb-tv-${tv.id}`,
            tmdb_id: tv.id,
            external_id: `tmdb-tv-${tv.id}`,
            title: tv.name || tv.original_name,
            content_type: 'series',
            type: 'series',
            year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
            description: tv.overview,
            poster_url: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined,
            backdrop_url: tv.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}` : undefined,
            genres: (tv.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean),
            mood_tags: [],
            rating: tv.vote_average,
            popularity: tv.popularity,
            number_of_seasons: details.number_of_seasons,
            certification: certification,
            avg_episode_minutes: details.episode_run_time?.[0]
          };
        } catch (error) {
          console.error(`Error fetching details for TV show ${tv.id}:`, error);
          return {
            id: `tmdb-tv-${tv.id}`,
            tmdb_id: tv.id,
            external_id: `tmdb-tv-${tv.id}`,
            title: tv.name || tv.original_name,
            content_type: 'series',
            type: 'series',
            year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
            description: tv.overview,
            poster_url: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined,
            backdrop_url: tv.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}` : undefined,
            genres: (tv.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean),
            mood_tags: [],
            rating: tv.vote_average,
            popularity: tv.popularity,
            certification: 'NR'
          };
        }
      })
    );

    // Combine and sort by popularity
    let combined = [...moviesWithCertifications, ...tvShowsWithDetails]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    // Filter by genres if specified
    if (genres && genres.length > 0) {
      // Get genre IDs from TMDB
      const genreResponse = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=${language}`);
      const genreData = await genreResponse.json();
      const genreMap = new Map(genreData.genres.map((g: any) => [g.name.toLowerCase(), g.id]));
      
      const genreIds = genres.map((g: string) => genreMap.get(g.toLowerCase())).filter(Boolean);
      
      if (genreIds.length > 0) {
        combined = combined.filter(title => 
          title.genres.some((gid: number) => genreIds.includes(gid))
        );
      }
    }

    return new Response(
      JSON.stringify({ titles: combined }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
