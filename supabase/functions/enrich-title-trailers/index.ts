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

    // Fetch titles that need trailer enrichment (movies without trailers OR tv shows that need season trailers)
    const { data: titles, error: fetchError } = await supabase
      .from('titles')
      .select('id, tmdb_id, name, release_date, first_air_date, title_type, original_language')
      .not('tmdb_id', 'is', null)
      .is('trailer_url', null)
      .range(startOffset, startOffset + batchSize - 1);

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
    let seasonsEnriched = 0;

    // Helper function to search YouTube for trailers
    async function searchYouTubeTrailer(
      titleName: string,
      titleLang: string,
      releaseYear: number | null,
      seasonName?: string
    ): Promise<{ url: string | null; isTmdbTrailer: false } | null> {
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

    // Helper function to fetch TV show details (for seasons)
    async function fetchTvDetails(tmdbId: number) {
      try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.error(`Error fetching TV details for ${tmdbId}:`, e);
      }
      return null;
    }

    for (const title of titles) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log('Approaching time limit, stopping gracefully');
        break;
      }

      try {
        const titleLang = title.original_language || 'en';
        const dateStr = title.title_type === 'movie' ? title.release_date : title.first_air_date;
        const releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;

        if (title.title_type === 'movie') {
          // ==========================================
          // MOVIE TRAILER ENRICHMENT
          // ==========================================
          let trailerUrl: string | null = null;
          let isTmdbTrailer = true;

          // Try TMDB first
          trailerUrl = await fetchTmdbTrailer(title.tmdb_id, 'movie');

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
              console.error(`Failed to update movie ${title.id}:`, updateError);
              failed++;
            } else {
              enriched++;
              console.log(`✓ Movie: ${title.name} - ${isTmdbTrailer ? 'TMDB' : 'YouTube'} trailer`);
            }
          } else {
            console.log(`No trailer found for movie: ${title.name}`);
          }

        } else if (title.title_type === 'tv') {
          // ==========================================
          // TV SERIES TRAILER ENRICHMENT (Per Season)
          // ==========================================
          const details = await fetchTvDetails(title.tmdb_id);
          
          if (!details?.seasons) {
            console.log(`No seasons found for TV show: ${title.name}`);
            processed++;
            continue;
          }

          const seasons = details.seasons.filter((s: any) => s.season_number > 0);
          let seriesTrailerUrl: string | null = null;
          let seriesIsTmdbTrailer = true;

          // Process each season
          for (const season of seasons) {
            let seasonTrailerUrl: string | null = null;
            let seasonIsTmdbTrailer = true;

            // Try TMDB season-level trailer
            seasonTrailerUrl = await fetchTmdbTrailer(title.tmdb_id, 'tv', season.season_number);

            // If no season trailer, try series-level TMDB
            if (!seasonTrailerUrl) {
              const seriesTrailer = await fetchTmdbTrailer(title.tmdb_id, 'tv');
              if (seriesTrailer) {
                seasonTrailerUrl = seriesTrailer;
                seasonIsTmdbTrailer = true;
              }
            }

            // Fallback to YouTube for season-specific search
            if (!seasonTrailerUrl) {
              const seasonName = season.name || `Season ${season.season_number}`;
              const ytResult = await searchYouTubeTrailer(title.name, titleLang, releaseYear, seasonName);
              if (ytResult) {
                seasonTrailerUrl = ytResult.url;
                seasonIsTmdbTrailer = false;
              }
            }

            // Update or insert season with trailer
            if (seasonTrailerUrl) {
              const { error: seasonError } = await supabase
                .from('seasons')
                .upsert({
                  title_id: title.id,
                  season_number: season.season_number,
                  episode_count: season.episode_count,
                  air_date: season.air_date || null,
                  name: season.name,
                  overview: season.overview,
                  poster_path: season.poster_path,
                  trailer_url: seasonTrailerUrl,
                  is_tmdb_trailer: seasonIsTmdbTrailer
                }, { onConflict: 'title_id,season_number' });

              if (seasonError) {
                console.error(`Failed to update season ${season.season_number} for ${title.name}:`, seasonError);
              } else {
                seasonsEnriched++;
                console.log(`✓ TV Season: ${title.name} S${season.season_number} - ${seasonIsTmdbTrailer ? 'TMDB' : 'YouTube'} trailer`);
              }

              // Use latest season's trailer for the series-level trailer
              if (season.season_number === Math.max(...seasons.map((s: any) => s.season_number))) {
                seriesTrailerUrl = seasonTrailerUrl;
                seriesIsTmdbTrailer = seasonIsTmdbTrailer;
              }
            }
          }

          // Update the titles table with the latest season's trailer (or series-level fallback)
          if (seriesTrailerUrl) {
            const { error: updateError } = await supabase
              .from('titles')
              .update({ trailer_url: seriesTrailerUrl, is_tmdb_trailer: seriesIsTmdbTrailer })
              .eq('id', title.id);

            if (updateError) {
              console.error(`Failed to update TV series ${title.id}:`, updateError);
              failed++;
            } else {
              enriched++;
              console.log(`✓ TV Series: ${title.name} - latest season trailer applied`);
            }
          } else {
            console.log(`No trailer found for TV series: ${title.name}`);
          }
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
    
    console.log(`Trailer enrichment completed: ${enriched} titles enriched, ${seasonsEnriched} seasons enriched, ${failed} failed, ${processed} processed in ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed: processed,
        enriched,
        seasonsEnriched,
        failed,
        duration,
        message: `Trailer enrichment completed: ${enriched} titles, ${seasonsEnriched} seasons enriched, ${failed} failed`
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
