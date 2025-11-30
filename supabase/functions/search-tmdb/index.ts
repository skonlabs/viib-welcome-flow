import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, genres, language = 'en', limit = 20 } = await req.json();

    if (!TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not configured');
    }

    // Search both movies and TV shows
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query || 'popular')}&language=${language}`),
      fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query || 'popular')}&language=${language}`)
    ]);

    const [movieData, tvData] = await Promise.all([
      movieResponse.json(),
      tvResponse.json()
    ]);

    // Transform and combine results
    const movies = (movieData.results || []).map((movie: any) => ({
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
      genres: movie.genre_ids || [],
      mood_tags: [],
      rating: movie.vote_average,
      popularity: movie.popularity
    }));

    const tvShows = (tvData.results || []).map((tv: any) => ({
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
      genres: tv.genre_ids || [],
      mood_tags: [],
      rating: tv.vote_average,
      popularity: tv.popularity
    }));

    // Combine and sort by popularity
    let combined = [...movies, ...tvShows]
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
