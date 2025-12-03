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

    // Fetch titles that need trailer enrichment - using new column names
    const { data: titles, error: fetchError } = await supabase
      .from('titles')
      .select('id, tmdb_id, name, release_date, first_air_date, title_type, original_language')
      .not('tmdb_id', 'is', null)
      .is('trailer_url', null)
      .range(startOffset, startOffset + batchSize - 1);

    // Helper function to get latest season number for TV shows
    async function getLatestSeasonNumber(tmdbId: number): Promise<number | null> {
      try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (res.ok) {
          const data = await res.json();
          // Get the highest season number that's not season 0 (specials)
          const seasons = data.seasons?.filter((s: any) => s.season_number > 0) || [];
          if (seasons.length > 0) {
            return Math.max(...seasons.map((s: any) => s.season_number));
          }
        }
      } catch (e) {
        console.error(`Error fetching TV details for ${tmdbId}:`, e);
      }
      return null;
    }

    if (fetchError) {
      console.error('Error fetching titles:', fetchError);
      throw fetchError;
    }

    if (!titles || titles.length === 0) {
      console.log('No titles to process');
      return new Response(
        JSON.stringify({ success: true, totalProcessed: 0, message: 'No titles to enrich' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${titles.length} titles`);
    let processed = 0;
    let enriched = 0;
    let failed = 0;

    for (const title of titles) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log('Approaching time limit, stopping gracefully');
        break;
      }

      try {
        const endpoint = title.title_type === 'movie' ? 'movie' : 'tv';
        let trailerUrl: string | null = null;
        let isTmdbTrailer: boolean = true;

        // Get release year from the appropriate date field
        const dateStr = title.title_type === 'movie' ? title.release_date : title.first_air_date;
        const releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;

        // For TV series, try to get the latest season's trailer first
        let latestSeasonNumber: number | null = null;
        let seasonName: string | undefined;
        if (title.title_type === 'tv') {
          latestSeasonNumber = await getLatestSeasonNumber(title.tmdb_id);
          if (latestSeasonNumber && latestSeasonNumber > 0) {
            // Get season name for YouTube search
            try {
              const seasonRes = await fetch(`${TMDB_BASE_URL}/tv/${title.tmdb_id}/season/${latestSeasonNumber}?api_key=${TMDB_API_KEY}`);
              if (seasonRes.ok) {
                const seasonData = await seasonRes.json();
                seasonName = seasonData.name || `Season ${latestSeasonNumber}`;
              }
            } catch (e) {
              seasonName = `Season ${latestSeasonNumber}`;
            }
            
            console.log(`Fetching season ${latestSeasonNumber} trailer for ${title.name} (${title.tmdb_id})`);
            const seasonVideosRes = await fetch(
              `${TMDB_BASE_URL}/tv/${title.tmdb_id}/season/${latestSeasonNumber}/videos?api_key=${TMDB_API_KEY}`
            );
            if (seasonVideosRes.ok) {
              const seasonVideosData = await seasonVideosRes.json();
              const seasonTrailer = seasonVideosData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
              if (seasonTrailer) {
                trailerUrl = `https://www.youtube.com/watch?v=${seasonTrailer.key}`;
                isTmdbTrailer = true;
                console.log(`Found season ${latestSeasonNumber} trailer: ${trailerUrl}`);
              }
            }
          }
        }

        // Fallback: Try series/movie level TMDB trailer
        if (!trailerUrl) {
          console.log(`Fetching ${title.title_type} level TMDB trailer for ${title.name} (${title.tmdb_id})`);
          const tmdbVideosRes = await fetch(
            `${TMDB_BASE_URL}/${endpoint}/${title.tmdb_id}/videos?api_key=${TMDB_API_KEY}`
          );

          if (tmdbVideosRes.ok) {
            const videosData = await tmdbVideosRes.json();
            const trailer = videosData.results?.find((v: any) => 
              v.type === 'Trailer' && v.site === 'YouTube'
            );

            if (trailer) {
              trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
              isTmdbTrailer = true;
              console.log(`Found TMDB trailer: ${trailerUrl}`);
            }
          }
        }

        // Fallback to YouTube search if no TMDB trailer - search official channels only
        if (!trailerUrl) {
          const titleLang = title.original_language || 'en';
          console.log(`No TMDB trailer, searching YouTube official channels for: ${title.name} (lang: ${titleLang})`);
          
          // Get official channel names for this language + global channels
          const relevantChannels = (officialChannels || []).filter(c => 
            c.language_code === titleLang || c.language_code === 'global' || c.language_code === 'en'
          ).map(c => c.channel_name.toLowerCase());
          
          // For TV series with season info, search for season-specific trailer (e.g., "Delhi Crime Season 3")
          const searchQuery = title.title_type === 'tv' && seasonName 
            ? `${title.name} ${seasonName} official trailer`
            : `${title.name} ${releaseYear || ''} official trailer`;
          const youtubeSearchRes = await fetch(
            `${YOUTUBE_SEARCH_URL}?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`
          );

          if (youtubeSearchRes.ok) {
            const searchData = await youtubeSearchRes.json();
            
            // First try to find a result from an official trailer channel (matched by name)
            const officialChannelTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
              return relevantChannels.some(officialName => channelTitle.includes(officialName.toLowerCase()));
            });

            if (officialChannelTrailer) {
              trailerUrl = `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`;
              isTmdbTrailer = false;
              console.log(`Found official channel trailer: ${trailerUrl} from ${officialChannelTrailer.snippet.channelTitle}`);
            } else {
              // Fallback: find results with "official trailer" in title from verified-looking channels
              const verifiedTrailer = searchData.items?.find((item: any) => {
                const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
                const videoTitle = item.snippet.title?.toLowerCase() || '';
                
                // Must have "official trailer" in video title
                const hasOfficialInTitle = videoTitle.includes('official trailer');
                
                // Channel should look official (studio name, "trailers", "movies", etc.)
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
                trailerUrl = `https://www.youtube.com/watch?v=${verifiedTrailer.id.videoId}`;
                isTmdbTrailer = false;
                console.log(`Found verified channel trailer: ${trailerUrl} from ${verifiedTrailer.snippet.channelTitle}`);
              }
            }
          }
        }

        // Update title with trailer info
        if (trailerUrl) {
          const { error: updateError } = await supabase
            .from('titles')
            .update({ trailer_url: trailerUrl, is_tmdb_trailer: isTmdbTrailer })
            .eq('id', title.id);

          if (updateError) {
            console.error(`Failed to update title ${title.id}:`, updateError);
            failed++;
          } else {
            enriched++;
            console.log(`✓ Updated ${title.name} with trailer`);
          }
        } else {
          console.log(`No trailer found for ${title.name}`);
        }

        processed++;

        // Increment job counter atomically every 10 titles
        if (jobId && processed % 10 === 0) {
          await supabase.rpc('increment_job_titles', {
            p_job_type: 'enrich_trailers',
            p_increment: 10
          });
        }

      } catch (titleError) {
        console.error(`Error processing title ${title.id}:`, titleError);
        failed++;
        processed++;
      }
    }

    // Final increment for remaining titles
    if (jobId && processed % 10 !== 0) {
      await supabase.rpc('increment_job_titles', {
        p_job_type: 'enrich_trailers',
        p_increment: processed % 10
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
    
    console.log(`Trailer enrichment completed: ${enriched} enriched, ${failed} failed, ${processed} processed in ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed: processed,
        enriched,
        failed,
        duration,
        message: `Trailer enrichment completed: ${enriched} titles enriched, ${failed} failed`
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
