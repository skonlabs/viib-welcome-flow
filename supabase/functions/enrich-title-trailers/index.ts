import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

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

const MAX_RUNTIME_MS = 85000; // 85 seconds (leave buffer)
const BATCH_SIZE = 20; // Process 20 records per batch

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { jobId } = await req.json();

    console.log(`Starting trailer enrichment job: ${jobId}`);

    if (!TMDB_API_KEY || !YOUTUBE_API_KEY) {
      throw new Error('API keys not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if job is still running (respect stop commands)
    if (jobId) {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', jobId)
        .single();
      
      if (jobData?.status !== 'running') {
        console.log(`Job ${jobId} status is "${jobData?.status}", not running. Exiting.`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Job stopped (status: ${jobData?.status})`,
            skipped: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch official trailer channels from database
    const { data: officialChannels } = await supabase
      .from('official_trailer_channels')
      .select('channel_name, language_code, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    console.log(`Loaded ${officialChannels?.length || 0} official trailer channels`);

    let totalProcessed = 0;
    let titlesEnriched = 0;
    let seasonsEnriched = 0;
    let failed = 0;

    // Helper function to check if we should continue
    function shouldContinue(): boolean {
      return (Date.now() - startTime) < MAX_RUNTIME_MS;
    }

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
    // Keep fetching batches until no more records or time runs out
    // ==========================================
    console.log('=== PHASE 1: Enriching titles with missing trailers ===');
    
    let hasMoreTitles = true;
    
    while (hasMoreTitles && shouldContinue()) {
      const { data: titlesWithoutTrailers, error: titlesError } = await supabase
        .from('titles')
        .select('id, tmdb_id, name, release_date, first_air_date, title_type, original_language')
        .not('tmdb_id', 'is', null)
        .is('trailer_url', null)
        .limit(BATCH_SIZE);

      if (titlesError) {
        console.error('Error fetching titles:', titlesError);
        break;
      }

      if (!titlesWithoutTrailers || titlesWithoutTrailers.length === 0) {
        console.log('No more titles to process');
        hasMoreTitles = false;
        break;
      }

      console.log(`Processing batch of ${titlesWithoutTrailers.length} titles`);

      for (const title of titlesWithoutTrailers) {
        if (!shouldContinue()) {
          console.log('Time limit approaching, stopping title processing');
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

          // Always update the title - either with trailer URL or empty string to mark as "checked"
          const { error: updateError } = await supabase
            .from('titles')
            .update({ 
              trailer_url: trailerUrl || '', // Empty string means "checked, no trailer found"
              is_tmdb_trailer: trailerUrl ? isTmdbTrailer : false 
            })
            .eq('id', title.id);

          if (updateError) {
            console.error(`Failed to update title ${title.id}:`, updateError);
            failed++;
          } else if (trailerUrl) {
            titlesEnriched++;
            console.log(`✓ Title: ${title.name} (${title.title_type}) - ${isTmdbTrailer ? 'TMDB' : 'YouTube'}`);
          } else {
            console.log(`○ No trailer found: ${title.name} (marked as checked)`);
          }

          totalProcessed++;
        } catch (titleError) {
          console.error(`Error processing title ${title.id}:`, titleError);
          failed++;
          totalProcessed++;
        }
      }
      // All processed titles are now updated (either with URL or empty string)
      // so next query will fetch fresh titles with null trailer_url
    }

    // ==========================================
    // PHASE 2: Enrich SEASONS with null trailer_url
    // ==========================================
    if (shouldContinue()) {
      console.log('=== PHASE 2: Enriching seasons with missing trailers ===');
      
      let hasMoreSeasons = true;
      
      while (hasMoreSeasons && shouldContinue()) {
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
          .limit(BATCH_SIZE);

        if (seasonsError) {
          console.error('Error fetching seasons:', seasonsError);
          break;
        }

        if (!seasonsWithoutTrailers || seasonsWithoutTrailers.length === 0) {
          console.log('No more seasons to process');
          hasMoreSeasons = false;
          break;
        }

        console.log(`Processing batch of ${seasonsWithoutTrailers.length} seasons`);

        for (const season of seasonsWithoutTrailers) {
          if (!shouldContinue()) {
            console.log('Time limit approaching, stopping season processing');
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

            // Always update the season - either with trailer URL or empty string to mark as "checked"
            const { error: updateError } = await supabase
              .from('seasons')
              .update({ 
                trailer_url: trailerUrl || '', // Empty string means "checked, no trailer found"
                is_tmdb_trailer: trailerUrl ? isTmdbTrailer : false 
              })
              .eq('id', season.id);

            if (updateError) {
              console.error(`Failed to update season ${season.id}:`, updateError);
              failed++;
            } else if (trailerUrl) {
              seasonsEnriched++;
              console.log(`✓ Season: ${titleName} S${season.season_number} - ${isTmdbTrailer ? 'TMDB' : 'YouTube'}`);
            } else {
              console.log(`○ No trailer found: ${titleName} S${season.season_number} (marked as checked)`);
            }

            totalProcessed++;
          } catch (seasonError) {
            console.error(`Error processing season ${season.id}:`, seasonError);
            failed++;
            totalProcessed++;
          }
        }
      }
    }

    // Update job counter
    if (jobId && totalProcessed > 0) {
      await supabase.rpc('increment_job_titles', {
        p_job_type: 'enrich_trailers',
        p_increment: totalProcessed
      });
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    // Check remaining work
    const { data: remainingCounts } = await supabase.rpc('get_trailer_enrichment_remaining');
    
    // Fallback if RPC doesn't exist
    let remainingTitles = 0;
    let remainingSeasons = 0;
    
    const { count: titleCount } = await supabase
      .from('titles')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .is('trailer_url', null);
    
    const { count: seasonCount } = await supabase
      .from('seasons')
      .select('*', { count: 'exact', head: true })
      .is('trailer_url', null)
      .gt('season_number', 0);
    
    remainingTitles = titleCount || 0;
    remainingSeasons = seasonCount || 0;
    
    const isComplete = remainingTitles === 0 && remainingSeasons === 0;
    
    console.log(`Trailer enrichment batch completed: ${titlesEnriched} titles, ${seasonsEnriched} seasons enriched, ${failed} failed in ${duration}s`);
    console.log(`Remaining: ${remainingTitles} titles, ${remainingSeasons} seasons`);

    // Update job - but respect stop commands (don't override status if stopped)
    if (jobId) {
      // Check current status before updating
      const { data: currentJob } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', jobId)
        .single();
      
      const wasStoppedByUser = currentJob?.status !== 'running';
      
      if (wasStoppedByUser) {
        console.log(`Job was stopped by user (status: ${currentJob?.status}). Not restarting.`);
        // Only update stats, don't change status
        await supabase
          .from('jobs')
          .update({
            last_run_at: new Date().toISOString(),
            last_run_duration_seconds: duration
          })
          .eq('id', jobId);
      } else {
        // Job is still running, update normally
        const newStatus = isComplete ? 'completed' : 'running';
        await supabase
          .from('jobs')
          .update({
            status: newStatus,
            last_run_at: new Date().toISOString(),
            last_run_duration_seconds: duration,
            ...(isComplete ? { error_message: null } : {})
          })
          .eq('id', jobId);
      }
      
      // Only schedule next batch if job is still running and not complete
      if (!isComplete && !wasStoppedByUser) {
        console.log('More work remaining, scheduling next batch via EdgeRuntime.waitUntil...');
        
        const invokeNextBatch = async () => {
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich-title-trailers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({ jobId })
            });
            
            if (!response.ok) {
              console.error(`Next batch invocation returned status ${response.status}`);
            } else {
              console.log('Next batch invocation succeeded');
            }
          } catch (err) {
            console.error('Next batch invocation error:', err);
          }
        };
        
        // Use EdgeRuntime.waitUntil for reliable background execution
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          EdgeRuntime.waitUntil(invokeNextBatch());
          console.log('Next batch scheduled via EdgeRuntime.waitUntil');
        } else {
          // Fallback: still try the fetch but don't wait
          invokeNextBatch();
          console.log('Next batch dispatched (no EdgeRuntime available)');
        }
      } else if (wasStoppedByUser) {
        console.log('Job was stopped by user, not scheduling next batch');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        titlesEnriched,
        seasonsEnriched,
        failed,
        duration,
        remainingTitles,
        remainingSeasons,
        isComplete,
        message: isComplete 
          ? `Enrichment complete! ${titlesEnriched} titles and ${seasonsEnriched} seasons enriched`
          : `Batch done: ${titlesEnriched} titles, ${seasonsEnriched} seasons. ${remainingTitles + remainingSeasons} remaining...`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trailer enrichment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
