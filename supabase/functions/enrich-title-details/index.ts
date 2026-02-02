import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

import { getCorsHeaders } from '../_shared/cors.ts';

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
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tmdb_id, type } = await req.json();

    if (!TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not configured');
    }

    if (!tmdb_id || !type) {
      throw new Error('tmdb_id and type are required');
    }

    // Ensure tmdb_id is an integer (handles scientific notation from DB)
    const tmdbIdInt = Math.floor(Number(tmdb_id));
    if (!tmdbIdInt || isNaN(tmdbIdInt)) {
      throw new Error(`Invalid tmdb_id: ${tmdb_id}`);
    }

    const endpoint = type === 'movie' ? 'movie' : 'tv';
    
    // Fetch details, credits, and videos from TMDB in parallel
    const [detailsRes, creditsRes, videosRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbIdInt}?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbIdInt}/credits?api_key=${TMDB_API_KEY}`),
      fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbIdInt}/videos?api_key=${TMDB_API_KEY}`)
    ]);

    const [details, credits, videos] = await Promise.all([
      detailsRes.json(),
      creditsRes.json(),
      videosRes.json()
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

    // Fetch streaming services from our database instead of TMDB API
    let streaming_services: Array<{service_name: string; logo_url: string | null}> = [];
    
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // First get the title_id from our titles table using tmdb_id
      const titleType = type === 'movie' ? 'movie' : 'tv';
      const { data: titleData, error: titleError } = await supabase
        .from('titles')
        .select('id')
        .eq('tmdb_id', tmdbIdInt)
        .eq('title_type', titleType)
        .single();
      
      if (titleError) {
        console.log(`Title not found in DB for tmdb_id ${tmdbIdInt}, type ${titleType}:`, titleError.message);
      }
      
      if (titleData?.id) {
        // Now get streaming services from title_streaming_availability
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('title_streaming_availability')
          .select(`
            streaming_service_id,
            streaming_services!inner (
              service_name,
              logo_url
            )
          `)
          .eq('title_id', titleData.id)
          .eq('region_code', 'US');
        
        if (availabilityError) {
          console.error('Error fetching streaming availability:', availabilityError);
        } else if (availabilityData && availabilityData.length > 0) {
          streaming_services = availabilityData.map((item: any) => ({
            service_name: item.streaming_services.service_name,
            logo_url: item.streaming_services.logo_url
          }));
          console.log(`Found ${streaming_services.length} streaming services from DB for title ${titleData.id}`);
        } else {
          console.log(`No streaming services found in DB for title ${titleData.id}`);
        }
      }
    } else {
      console.warn('Supabase credentials not configured, skipping DB streaming lookup');
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
        fetch(`${TMDB_BASE_URL}/tv/${tmdbIdInt}/season/${season.season_number}/videos?api_key=${TMDB_API_KEY}`)
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
