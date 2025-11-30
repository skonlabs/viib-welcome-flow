import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tmdb_id, type } = await req.json();

    if (!TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not configured');
    }

    if (!tmdb_id || !type) {
      throw new Error('tmdb_id and type are required');
    }

    const endpoint = type === 'movie' ? 'movie' : 'tv';
    
    // Fetch details, credits, videos, and watch providers in parallel
    const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdb_id}?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdb_id}/credits?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdb_id}/videos?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdb_id}/watch/providers?api_key=${TMDB_API_KEY}`)
    ]);

    const [details, credits, videos, providers] = await Promise.all([
      detailsRes.json(),
      creditsRes.json(),
      videosRes.json(),
      providersRes.json()
    ]);

    // Extract trailer URL
    const trailer = videos.results?.find((v: any) => 
      v.type === 'Trailer' && v.site === 'YouTube'
    );
    const trailer_url = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    // Extract cast (top 5)
    const cast = credits.cast?.slice(0, 5).map((c: any) => c.name) || [];

    // Extract genre names
    const genres = details.genres?.map((g: any) => GENRE_MAP[g.id] || g.name) || [];

    // Extract streaming services (US providers)
    const usProviders = providers.results?.US;
    const streaming_services = [];
    
    if (usProviders?.flatrate) {
      streaming_services.push(...usProviders.flatrate.map((p: any) => ({
        service_name: p.provider_name,
        service_code: p.provider_id.toString(),
        logo_url: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null
      })));
    }

    // Runtime
    const runtime_minutes = type === 'movie' ? details.runtime : null;
    const avg_episode_minutes = type === 'series' ? details.episode_run_time?.[0] : null;

    // Extract seasons for TV shows
    const seasons = type === 'series' ? (details.seasons || []).map((season: any) => ({
      season_number: season.season_number,
      name: season.name,
      episode_count: season.episode_count,
      air_date: season.air_date,
      overview: season.overview,
      poster_path: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : null,
      id: season.id
    })) : [];

    return new Response(
      JSON.stringify({
        trailer_url,
        cast,
        genres,
        streaming_services,
        runtime_minutes,
        avg_episode_minutes,
        seasons,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Enrich error:', error);
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
