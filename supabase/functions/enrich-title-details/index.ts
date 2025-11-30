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

    // Extract seasons for TV shows with trailers
    let seasons = [];
    let latestSeasonTrailer = null;
    
    if (type === 'series' && details.seasons) {
      console.log(`Fetching season videos for ${details.seasons.length} seasons`);
      
      // Fetch videos for each season with error handling
      const seasonVideoPromises = details.seasons.map((season: any) => 
        fetch(`${TMDB_BASE_URL}/tv/${tmdb_id}/season/${season.season_number}/videos?api_key=${TMDB_API_KEY}`)
          .then(res => {
            if (!res.ok) {
              console.error(`Failed to fetch videos for season ${season.season_number}: ${res.status}`);
              return { results: [] };
            }
            return res.json();
          })
          .catch(err => {
            console.error(`Error fetching videos for season ${season.season_number}:`, err);
            return { results: [] };
          })
      );
      
      const seasonVideos = await Promise.all(seasonVideoPromises);
      
      seasons = details.seasons.map((season: any, index: number) => {
        const videos = seasonVideos[index]?.results || [];
        const seasonTrailer = videos.find((v: any) => 
          v.type === 'Trailer' && v.site === 'YouTube'
        );
        
        const trailerUrl = seasonTrailer ? `https://www.youtube.com/watch?v=${seasonTrailer.key}` : null;
        
        console.log(`Season ${season.season_number}: Found ${videos.length} videos, trailer: ${trailerUrl ? 'yes' : 'no'}`);
        
        return {
          season_number: season.season_number,
          name: season.name,
          episode_count: season.episode_count,
          air_date: season.air_date,
          overview: season.overview,
          poster_path: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : null,
          id: season.id,
          trailer_url: trailerUrl
        };
      });
      
      // Get the latest season's trailer (most recent season with valid air_date and trailer)
      const seasonsWithTrailers = seasons.filter((s: any) => s.air_date && s.trailer_url);
      console.log(`Found ${seasonsWithTrailers.length} seasons with trailers out of ${seasons.length} total seasons`);
      
      if (seasonsWithTrailers.length > 0) {
        const sortedSeasons = seasonsWithTrailers.sort((a: any, b: any) => 
          new Date(b.air_date).getTime() - new Date(a.air_date).getTime()
        );
        latestSeasonTrailer = sortedSeasons[0].trailer_url;
        console.log(`Latest season trailer: ${latestSeasonTrailer}`);
      } else {
        console.log('No season trailers found, will use series-level trailer');
      }
    }

    const finalTrailerUrl = type === 'series' ? (latestSeasonTrailer || trailer_url) : trailer_url;
    console.log(`Final trailer URL: ${finalTrailerUrl} (series-level: ${trailer_url}, latest season: ${latestSeasonTrailer})`);
    
    return new Response(
      JSON.stringify({
        trailer_url: finalTrailerUrl,
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
