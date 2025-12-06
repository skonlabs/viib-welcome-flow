import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RUNTIME_MS = 90000; // 90 seconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { batchSize = 50, startOffset = 0, jobId } = await req.json();

    console.log(`Starting trailer enrichment: offset=${startOffset}, batch=${batchSize}, jobId=${jobId}`);

    if (!TMDB_API_KEY || !YOUTUBE_API_KEY) {
      throw new Error('API keys not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch official trailer channels from database
    const { data: officialChannels } = await supabase
      .from('official_trailer_channels')
      .select('channel_name, language_code, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    console.log(`Loaded ${officialChannels?.length || 0} official trailer channels`);

    let processed = 0;
    let titlesEnriched = 0;
    let seasonsEnriched = 0;
    let failed = 0;

    // Helper function to search YouTube for trailers
    async function searchYouTubeTrailer(
      titleName: string,
      titleLang: string,
      releaseYear: number | null,
      seasonName?: string
    ): Promise<{ url: string; isTmdbTrailer: false } | null> {
      const relevantChannels = (officialChannels || []).filter(c => 
        c.language_code === titleLang || c.language_code === 'global' || c.language_code === 'en'
      ).map(c => c.channel_name.toLowerCase());

      const searchQuery = seasonName 
        ? `${titleName} ${seasonName} official trailer`
        : `${titleName} ${releaseYear || ''} official trailer`;

      try {
        const youtubeSearchRes = await fetch(
          `${YOUTUBE_SEARCH_URL}?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`
        );

        if (!youtubeSearchRes.ok) return null;

        const searchData = await youtubeSearchRes.json();
        
        // First try to find a result from an official trailer channel
        const officialChannelTrailer = searchData.items?.find((item: any) => {
          const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
          return relevantChannels.some(officialName => channelTitle.includes(officialName.toLowerCase()));
        });

        if (officialChannelTrailer) {
          return { 
            url: `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`, 
            isTmdbTrailer: false 
          };
        }

        // Fallback: find results with "official trailer" in title from verified-looking channels
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
          return { 
            url: `https://www.youtube.com/watch?v=${verifiedTrailer.id.videoId}`, 
            isTmdbTrailer: false 
          };
        }
      } catch (e) {
        console.error(`YouTube search error for ${titleName}:`, e);
      }

      return null;
    }

    // Helper function to fetch trailer from TMDB videos endpoint
    async function fetchTmdbTrailer(tmdbId: number, endpoint: string, seasonNumber?: number): Promise<string | null> {
      try {
        let url: string;
        if (seasonNumber !== undefined) {
          url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}/videos?api_key=${TMDB_API_KEY}`;
        } else {
          url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;
        }

        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        const trailer = data.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        
        return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
      } catch (e) {
        console.error(`TMDB trailer fetch error for ${tmdbId}:`, e);
        return null;
      }
    }

    // ==========================================
    // PHASE 1: Enrich TITLES with null trailer_url
    // ==========================================
    console.log('=== PHASE 1: Enriching titles with missing trailers ===');
    
    const { data: titlesWithoutTrailers, error: titlesError } = await supabase
      .from('titles')
      .select('id, tmdb_id, name, release_date, first_air_date, title_type, original_language')
      .not('tmdb_id', 'is', null)
      .is('trailer_url', null)
      .range(startOffset, startOffset + Math.floor(batchSize / 2) - 1);

    if (titlesError) {
      console.error('Error fetching titles:', titlesError);
    }

    console.log(`Found ${titlesWithoutTrailers?.length || 0} titles without trailers`);

    for (const title of (titlesWithoutTrailers || [])) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log('Approaching time limit, stopping gracefully');
        break;
      }

      try {
        const titleLang = title.original_language || 'en';
        const dateStr = title.title_type === 'movie' ? title.release_date : title.first_air_date;
        const releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;

        let trailerUrl: string | null = null;
        let isTmdbTrailer = true;

        if (title.title_type === 'movie') {
          // Try TMDB for movies
          trailerUrl = await fetchTmdbTrailer(title.tmdb_id, 'movie');
        } else {
          // For TV, try to get latest season trailer first, then series-level
          // First get series details to find latest season
          try {
            const tvRes = await fetch(`${TMDB_BASE_URL}/tv/${title.tmdb_id}?api_key=${TMDB_API_KEY}`);
            if (tvRes.ok) {
              const tvData = await tvRes.json();
              const seasons = tvData.seasons?.filter((s: any) => s.season_number > 0) || [];
              const latestSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : null;
              
              if (latestSeasonNumber) {
                trailerUrl = await fetchTmdbTrailer(title.tmdb_id, 'tv', latestSeasonNumber);
              }
            }
          } catch (e) {
            console.error(`Error fetching TV details for ${title.tmdb_id}:`, e);
          }
          
          // Fallback to series-level TMDB trailer
          if (!trailerUrl) {
            trailerUrl = await fetchTmdbTrailer(title.tmdb_id, 'tv');
          }
        }

        // Fallback to YouTube if no TMDB trailer
        if (!trailerUrl) {
          const ytResult = await searchYouTubeTrailer(title.name, titleLang, releaseYear);
          if (ytResult) {
            trailerUrl = ytResult.url;
            isTmdbTrailer = false;
          }
        }

        if (trailerUrl) {
          const { error: updateError } = await supabase
            .from('titles')
            .update({ trailer_url: trailerUrl, is_tmdb_trailer: isTmdbTrailer })
            .eq('id', title.id);

          if (updateError) {
            console.error(`Failed to update title ${title.id}:`, updateError);
            failed++;
          } else {
            titlesEnriched++;
            console.log(`✓ Title: ${title.name} (${title.title_type}) - ${isTmdbTrailer ? 'TMDB' : 'YouTube'}`);
          }
        } else {
          console.log(`✗ No trailer found for: ${title.name}`);
        }

        processed++;
      } catch (titleError) {
        console.error(`Error processing title ${title.id}:`, titleError);
        failed++;
        processed++;
      }
    }

    // ==========================================
    // PHASE 2: Enrich SEASONS with null trailer_url
    // ==========================================
    if (Date.now() - startTime < MAX_RUNTIME_MS - 10000) {
      console.log('=== PHASE 2: Enriching seasons with missing trailers ===');
      
      // Get seasons without trailers, joining with titles to get tmdb_id and name
      const { data: seasonsWithoutTrailers, error: seasonsError } = await supabase
        .from('seasons')
        .select(`
          id,
          title_id,
          season_number,
          name,
          titles!inner (
            tmdb_id,
            name,
            original_language
          )
        `)
        .is('trailer_url', null)
        .gt('season_number', 0)
        .range(0, Math.floor(batchSize / 2) - 1);

      if (seasonsError) {
        console.error('Error fetching seasons:', seasonsError);
      }

      console.log(`Found ${seasonsWithoutTrailers?.length || 0} seasons without trailers`);

      for (const season of (seasonsWithoutTrailers || [])) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) {
          console.log('Approaching time limit, stopping gracefully');
          break;
        }

        try {
          const titleInfo = season.titles as any;
          const tmdbId = titleInfo?.tmdb_id;
          const titleName = titleInfo?.name;
          const titleLang = titleInfo?.original_language || 'en';

          if (!tmdbId || !titleName) {
            console.log(`Skipping season ${season.id} - missing title info`);
            continue;
          }

          let trailerUrl: string | null = null;
          let isTmdbTrailer = true;

          // Try TMDB season-specific trailer
          trailerUrl = await fetchTmdbTrailer(tmdbId, 'tv', season.season_number);

          // Fallback to series-level TMDB trailer
          if (!trailerUrl) {
            trailerUrl = await fetchTmdbTrailer(tmdbId, 'tv');
          }

          // Fallback to YouTube with season-specific search
          if (!trailerUrl) {
            const seasonName = season.name || `Season ${season.season_number}`;
            const ytResult = await searchYouTubeTrailer(titleName, titleLang, null, seasonName);
            if (ytResult) {
              trailerUrl = ytResult.url;
              isTmdbTrailer = false;
            }
          }

          if (trailerUrl) {
            const { error: updateError } = await supabase
              .from('seasons')
              .update({ trailer_url: trailerUrl, is_tmdb_trailer: isTmdbTrailer })
              .eq('id', season.id);

            if (updateError) {
              console.error(`Failed to update season ${season.id}:`, updateError);
              failed++;
            } else {
              seasonsEnriched++;
              console.log(`✓ Season: ${titleName} S${season.season_number} - ${isTmdbTrailer ? 'TMDB' : 'YouTube'}`);
            }
          } else {
            console.log(`✗ No trailer found for: ${titleName} S${season.season_number}`);
          }

          processed++;
        } catch (seasonError) {
          console.error(`Error processing season ${season.id}:`, seasonError);
          failed++;
          processed++;
        }
      }
    }

    // Increment job counter
    if (jobId && processed > 0) {
      await supabase.rpc('increment_job_titles', {
        p_job_type: 'enrich_trailers',
        p_increment: processed
      });
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    // Update thread tracking
    if (jobId) {
      const { data: currentJob } = await supabase
        .from('jobs')
        .select('configuration, status')
        .eq('id', jobId)
        .single();
      
      if (currentJob?.status === 'failed' || currentJob?.status === 'idle') {
        console.log('Job was stopped, skipping tracking update');
        return new Response(
          JSON.stringify({ success: true, totalProcessed: processed, message: 'Job was stopped' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const currentConfig = (currentJob?.configuration as any) || {};
      const tracking = currentConfig.thread_tracking || { succeeded: 0, failed: 0 };
      
      await supabase
        .from('jobs')
        .update({
          configuration: {
            ...currentConfig,
            thread_tracking: { succeeded: tracking.succeeded + 1, failed: tracking.failed }
          }
        })
        .eq('id', jobId)
        .eq('status', 'running');
    }
    
    console.log(`Trailer enrichment completed: ${titlesEnriched} titles, ${seasonsEnriched} seasons enriched, ${failed} failed in ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed: processed,
        titlesEnriched,
        seasonsEnriched,
        failed,
        duration,
        message: `Enriched ${titlesEnriched} titles and ${seasonsEnriched} seasons`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trailer enrichment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Track failed thread
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const requestBody = await req.clone().json();
      const jobId = requestBody.jobId;
      
      if (jobId) {
        const { data: currentJob } = await supabase
          .from('jobs')
          .select('configuration, status')
          .eq('id', jobId)
          .single();
        
        if (currentJob?.status !== 'failed' && currentJob?.status !== 'idle') {
          const currentConfig = (currentJob?.configuration as any) || {};
          const tracking = currentConfig.thread_tracking || { succeeded: 0, failed: 0 };
          
          await supabase
            .from('jobs')
            .update({
              configuration: {
                ...currentConfig,
                thread_tracking: { succeeded: tracking.succeeded, failed: tracking.failed + 1 }
              }
            })
            .eq('id', jobId)
            .eq('status', 'running');
        }
      }
    } catch (trackError) {
      console.error('Error tracking failure:', trackError);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
