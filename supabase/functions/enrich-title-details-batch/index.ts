import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

import { getCorsHeaders } from '../_shared/cors.ts';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const MAX_RUNTIME_MS = 55000; // 55 seconds
const BATCH_SIZE = 30;

// Helper to check if a string is empty/null/whitespace or placeholder
function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

function isPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === '' || v === '[no-trailer]' || v === '[no-overview]' || v === '[no-poster]';
}

function hasValidTrailer(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  return v !== '' && v !== '[no-trailer]' && (v.includes('youtube.com') || v.includes('youtu.be'));
}

// Comprehensive list of official studio and distributor channels
const OFFICIAL_CHANNELS = [
  'Universal Pictures', 'Warner Bros. Pictures', 'Warner Bros.', 'WB Pictures',
  'Sony Pictures Entertainment', 'Sony Pictures', 'Columbia Pictures',
  'Paramount Pictures', 'Paramount', '20th Century Studios', '20th Century Fox',
  'Walt Disney Studios', 'Disney', 'Marvel Entertainment', 'Marvel Studios',
  'DC', 'Lionsgate Movies', 'Lionsgate', 'MGM', 'Metro-Goldwyn-Mayer',
  'A24', 'Searchlight Pictures', 'Fox Searchlight', 'Focus Features',
  'Sony Pictures Classics', 'NEON', 'Magnolia Pictures', 'IFC Films',
  'STXfilms', 'STX Entertainment', 'Entertainment One', 'eOne Films',
  'Bleecker Street', 'Annapurna Pictures', 'Roadside Attractions',
  'Netflix', 'Netflix Film', 'Amazon Prime Video', 'Prime Video',
  'Apple TV', 'Apple TV+', 'HBO', 'HBO Max', 'Max', 'Hulu',
  'Peacock', 'Peacock TV', 'Disney+', 'Disney Plus', 'DisneyPlus Hotstar',
  'DreamWorks', 'Amblin', 'New Line Cinema', 'Miramax', 'Relativity Media',
  'Screen Gems', 'TriStar Pictures', 'Summit Entertainment',
  'Blumhouse', 'A24 Films', 'Shudder', 'National Geographic', 'PBS', 'Sundance',
  'T-Series', 'TSeries', 'Dharma Productions', 'Red Chillies Entertainment',
  'Yash Raj Films', 'YRF', 'Zee Studios', 'Eros Now', 'Tips Official',
  'Sun Pictures', 'Lyca Productions', 'Hombale Films', 'Geetha Arts',
  'CJ ENM', 'Showbox', 'NEW', 'Lotte Entertainment',
  'Toho Movie Channel', 'Warner Bros Japan', 'Toei Animation', 'Aniplex',
  'Crunchyroll', 'Funimation', 'Studio Ghibli',
  'Tencent Video', 'iQIYI', 'Youku', 'Bilibili',
  'Allociné', 'Pathé', 'Gaumont', 'StudioCanal',
  'KinoCheck', 'Constantin Film', 'FilmIsNow Trailer',
  'Telecine', 'Netflix Brasil', 'Globo Filmes',
  'Film4', 'Working Title', 'Legendary Entertainment'
];

const OFFICIAL_KEYWORDS = ['official', 'trailer', 'studios', 'pictures', 'entertainment', 'films', 'productions'];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
  const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
  const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY');
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing required environment variables' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Track API quota states
  let youtubeQuotaExceeded = false;
  let supadataLimitExceeded = false;

  // Helper: Search YouTube for official trailers
  async function searchYouTubeTrailer(
    titleName: string,
    contentType: 'movie' | 'tv',
    releaseYear: number | null,
    seasonName?: string
  ): Promise<string | null> {
    if (!YOUTUBE_API_KEY || youtubeQuotaExceeded) return null;

    let searchQuery: string;
    if (seasonName) {
      searchQuery = `${titleName} ${seasonName} official trailer`;
    } else {
      const typeLabel = contentType === 'movie' ? 'movie' : 'tv series';
      searchQuery = releaseYear
        ? `${titleName} ${typeLabel} official trailer ${releaseYear}`
        : `${titleName} ${typeLabel} official trailer`;
    }

    try {
      const youtubeResponse = await fetch(
        `${YOUTUBE_SEARCH_URL}?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoDefinition=high&order=relevance&maxResults=10&key=${YOUTUBE_API_KEY}`
      );

      if (!youtubeResponse.ok) {
        const errorText = await youtubeResponse.text();
        if (youtubeResponse.status === 403 && errorText.includes('quotaExceeded')) {
          console.error('YouTube API quota exceeded');
          youtubeQuotaExceeded = true;
        }
        return null;
      }

      const youtubeData = await youtubeResponse.json();
      if (!youtubeData.items || youtubeData.items.length === 0) return null;

      for (const item of youtubeData.items) {
        const channelTitle = item.snippet.channelTitle?.toLowerCase() || '';
        const videoTitle = item.snippet.title?.toLowerCase() || '';

        const isOfficialChannel = OFFICIAL_CHANNELS.some(official =>
          channelTitle.includes(official.toLowerCase()) || official.toLowerCase().includes(channelTitle)
        );
        const isOfficialVideo = videoTitle.includes('official trailer') || videoTitle.includes('official teaser');
        const hasOfficialKeywords = OFFICIAL_KEYWORDS.some(keyword => channelTitle.includes(keyword));

        if (isOfficialChannel || (isOfficialVideo && hasOfficialKeywords)) {
          return `https://www.youtube.com/watch?v=${item.id.videoId}`;
        }
      }
      return null;
    } catch (e) {
      console.error(`YouTube search error for ${titleName}:`, e);
      return null;
    }
  }

  // Helper: Translate text to English
  async function translateToEnglish(transcript: string): Promise<string> {
    if (!OPENAI_API_KEY) return transcript;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Translate the following text to English. Return ONLY the translated text.' },
            { role: 'user', content: transcript }
          ],
          max_tokens: 4000
        }),
      });
      if (!response.ok) return transcript;
      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || transcript;
    } catch {
      return transcript;
    }
  }

  // Helper: Get YouTube transcript via Supadata
  async function getYouTubeTranscript(videoUrl: string): Promise<string | null> {
    if (!SUPADATA_API_KEY || supadataLimitExceeded) return null;
    if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) return null;

    try {
      const supadataResponse = await fetch(
        `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(videoUrl)}&text=true&lang=en-US`,
        { headers: { 'x-api-key': SUPADATA_API_KEY } }
      );

      if (!supadataResponse.ok) {
        const errorText = await supadataResponse.text();
        if (errorText.includes('limit-exceeded') || errorText.includes('Limit Exceeded') || errorText.includes('quota')) {
          console.error('  ⚠ Supadata API limit exceeded');
          supadataLimitExceeded = true;
        }
        return null;
      }

      const supadataData = await supadataResponse.json();
      const { content, lang } = supadataData;
      if (!content || content.trim().length === 0) return null;

      const isEnglishLang = lang && (lang === 'en' || lang.toLowerCase().startsWith('en-'));
      if (isEnglishLang) {
        return content;
      } else {
        return await translateToEnglish(content);
      }
    } catch (error) {
      console.error(`Supadata error:`, error);
      return null;
    }
  }

  // Helper: Fetch Rotten Tomatoes scores using OpenAI
  interface RottenTomatoesData {
    rt_cscore: number | null;
    rt_ascore: number | null;
    rt_ccount: number | null;
    rt_acount: number | null;
  }

  async function fetchRottenTomatoesScores(
    titleName: string,
    titleType: 'movie' | 'tv',
    releaseYear: number | null
  ): Promise<RottenTomatoesData | null> {
    if (!OPENAI_API_KEY) return null;

    const prompt = `You are a movie review data assistant.

Task:
Provide the most current Rotten Tomatoes review information for the given movie or TV series.

Input:
- Title: ${titleName}
- Type: ${titleType === 'movie' ? 'movie' : 'series'}
- Release year (if known): ${releaseYear || 'null'}

Requirements:
- Use the latest available Rotten Tomatoes data
- If multiple versions exist, select the most recent or most relevant one
- If exact data is unavailable, return null values instead of guessing

Return ONLY a valid JSON object with the following fields:
- "title" (string)
- "critic_score" (number | null)       // Rotten Tomatoes Tomatometer %
- "audience_score" (number | null)     // Rotten Tomatoes Audience Score %
- "critic_count" (number | null)
- "audience_count" (number | null)

Formatting Rules:
- No explanations
- No markdown
- No extra text
- No comments
- Output must be valid JSON only

Example Output:
{
  "title": "Movie Name",
  "critic_score": 87,
  "audience_score": 91,
  "critic_count": 245,
  "audience_count": 10000
}

Begin now.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${OPENAI_API_KEY}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.1  // Low temperature for factual data
        }),
      });

      if (!response.ok) {
        console.error(`OpenAI API error for RT lookup: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();
      
      if (!content) return null;

      // Parse JSON response
      const parsed = JSON.parse(content);
      
      return {
        rt_cscore: typeof parsed.critic_score === 'number' ? parsed.critic_score : null,
        rt_ascore: typeof parsed.audience_score === 'number' ? parsed.audience_score : null,
        rt_ccount: typeof parsed.critic_count === 'number' ? parsed.critic_count : null,
        rt_acount: typeof parsed.audience_count === 'number' ? parsed.audience_count : null,
      };
    } catch (error) {
      console.error(`Error fetching RT scores for ${titleName}:`, error);
      return null;
    }
  }

  try {
    let jobId: string | null = null;
    try {
      const body = await req.json();
      jobId = body.jobId || null;
    } catch { /* No body */ }

    const startTime = Date.now();

    // Check if job was stopped
    if (jobId) {
      const { data: jobCheck } = await supabase
        .from('jobs')
        .select('status, is_active')
        .eq('id', jobId)
        .single();

      if (jobCheck?.status === 'stopped' || jobCheck?.status === 'idle' || jobCheck?.status === 'failed' || !jobCheck?.is_active) {
        return new Response(
          JSON.stringify({ success: true, message: 'Job stopped by user', processed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update job status to running
    if (jobId) {
      const { data: updateResult } = await supabase
        .from('jobs')
        .update({ status: 'running', last_run_at: new Date().toISOString(), error_message: null })
        .eq('id', jobId)
        .eq('status', 'running')
        .select('status');

      if (!updateResult || updateResult.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'Job was stopped', processed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== PHASE 1: TITLES (Movies & Series) ==========

    // Prioritize titles with missing poster/overview/trailer (can always be fetched from TMDB)
    // Split into separate queries to avoid complex OR that causes timeouts
    let titlesWithMissingBasics: any[] = [];
    
    // Query 1: Missing poster (simpler, faster query)
    const { data: missingPoster, error: err1 } = await supabase
      .from('titles')
      .select('id, tmdb_id, title_type, name, overview, poster_path, trailer_url, trailer_transcript, backdrop_path, release_date, first_air_date, rt_cscore, rt_ascore')
      .not('tmdb_id', 'is', null)
      .or('poster_path.is.null,poster_path.eq.')
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(BATCH_SIZE);
    
    if (err1) {
      console.error('Error fetching missing poster titles:', err1.message);
    } else if (missingPoster) {
      titlesWithMissingBasics = [...missingPoster];
    }

    // Query 2: Missing overview (if we need more)
    if (titlesWithMissingBasics.length < BATCH_SIZE) {
      const existingIds = new Set(titlesWithMissingBasics.map(t => t.id));
      const { data: missingOverview, error: err2 } = await supabase
        .from('titles')
        .select('id, tmdb_id, title_type, name, overview, poster_path, trailer_url, trailer_transcript, backdrop_path, release_date, first_air_date, rt_cscore, rt_ascore')
        .not('tmdb_id', 'is', null)
        .or('overview.is.null,overview.eq.')
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(BATCH_SIZE - titlesWithMissingBasics.length);
      
      if (!err2 && missingOverview) {
        for (const t of missingOverview) {
          if (!existingIds.has(t.id)) {
            titlesWithMissingBasics.push(t);
            existingIds.add(t.id);
          }
        }
      }
    }

    // Query 3: Missing trailer (if we need more)
    if (titlesWithMissingBasics.length < BATCH_SIZE) {
      const existingIds = new Set(titlesWithMissingBasics.map(t => t.id));
      const { data: missingTrailer, error: err3 } = await supabase
        .from('titles')
        .select('id, tmdb_id, title_type, name, overview, poster_path, trailer_url, trailer_transcript, backdrop_path, release_date, first_air_date, rt_cscore, rt_ascore')
        .not('tmdb_id', 'is', null)
        .or('trailer_url.is.null,trailer_url.eq.')
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(BATCH_SIZE - titlesWithMissingBasics.length);
      
      if (!err3 && missingTrailer) {
        for (const t of missingTrailer) {
          if (!existingIds.has(t.id)) {
            titlesWithMissingBasics.push(t);
          }
        }
      }
    }

    // Fill remaining slots with titles only needing transcripts (if we have capacity)
    let titlesNeedingEnrichment = titlesWithMissingBasics || [];
    let remainingSlots = BATCH_SIZE - titlesNeedingEnrichment.length;
    
    if (remainingSlots > 0 && !supadataLimitExceeded) {
      const existingIds = new Set(titlesNeedingEnrichment.map(t => t.id));
      const { data: titlesNeedingTranscript } = await supabase
        .from('titles')
        .select('id, tmdb_id, title_type, name, overview, poster_path, trailer_url, trailer_transcript, backdrop_path, release_date, first_air_date, rt_cscore, rt_ascore')
        .not('tmdb_id', 'is', null)
        .not('poster_path', 'is', null).neq('poster_path', '')
        .not('overview', 'is', null).neq('overview', '')
        .not('trailer_url', 'is', null).neq('trailer_url', '').neq('trailer_url', '[no-trailer]')
        .or('trailer_transcript.is.null,trailer_transcript.eq.')
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(remainingSlots);
      
      if (titlesNeedingTranscript) {
        // Add only titles not already in the list
        for (const t of titlesNeedingTranscript) {
          if (!existingIds.has(t.id)) {
            titlesNeedingEnrichment.push(t);
          }
        }
      }
    }

    // Query 5: Fill remaining with titles needing RT scores
    remainingSlots = BATCH_SIZE - titlesNeedingEnrichment.length;
    if (remainingSlots > 0 && OPENAI_API_KEY) {
      const existingIds = new Set(titlesNeedingEnrichment.map(t => t.id));
      const { data: titlesNeedingRT } = await supabase
        .from('titles')
        .select('id, tmdb_id, title_type, name, overview, poster_path, trailer_url, trailer_transcript, backdrop_path, release_date, first_air_date, rt_cscore, rt_ascore')
        .not('tmdb_id', 'is', null)
        .not('poster_path', 'is', null).neq('poster_path', '')
        .not('overview', 'is', null).neq('overview', '')
        .is('rt_cscore', null)
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(remainingSlots);
      
      if (titlesNeedingRT) {
        for (const t of titlesNeedingRT) {
          if (!existingIds.has(t.id)) {
            titlesNeedingEnrichment.push(t);
          }
        }
      }
    }

    let titlesProcessed = 0;
    let titlesUpdated = 0;
    let trailersEnriched = 0;
    let transcriptsEnriched = 0;
    let errors = 0;
    let wasStoppedByUser = false;

    for (const title of (titlesNeedingEnrichment || [])) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        break;
      }

      // Check if job was stopped mid-batch
      if (jobId && titlesProcessed % 10 === 0 && titlesProcessed > 0) {
        const { data: jobStatus } = await supabase.from('jobs').select('status').eq('id', jobId).single();
        if (jobStatus?.status === 'stopped' || jobStatus?.status === 'idle') {
          wasStoppedByUser = true;
          break;
        }
      }

      try {
        const endpoint = title.title_type === 'movie' ? 'movie' : 'tv';
        const updateData: Record<string, any> = {};
        const updates: string[] = [];

        // Ensure tmdb_id is an integer (handles scientific notation from DB)
        const tmdbIdInt = Math.floor(Number(title.tmdb_id));
        if (!tmdbIdInt || isNaN(tmdbIdInt)) {
          console.error(`Invalid tmdb_id for ${title.name}: ${title.tmdb_id}`);
          errors++;
          titlesProcessed++;
          continue;
        }

        // Fetch details from TMDB
        const tmdbUrl = `${TMDB_BASE_URL}/${endpoint}/${tmdbIdInt}?api_key=${TMDB_API_KEY}&append_to_response=videos`;
        const detailsRes = await fetch(tmdbUrl);

        if (!detailsRes.ok) {
          // 404 means content was deleted from TMDB - mark with placeholder to skip future attempts
          if (detailsRes.status === 404) {
            await supabase.from('titles').update({
              overview: title.overview || '[tmdb-unavailable]',
              poster_path: title.poster_path || '[tmdb-unavailable]',
              trailer_url: title.trailer_url || '[tmdb-unavailable]',
              updated_at: new Date().toISOString()
            }).eq('id', title.id);
            titlesProcessed++;
            continue;
          }
          console.error(`TMDB API error for ${title.name}: ${detailsRes.status}`);
          errors++;
          titlesProcessed++;
          continue;
        }

        const details = await detailsRes.json();

        // Update overview if missing (NULL or empty string)
        if (isEmpty(title.overview)) {
          if (details.overview) {
            updateData.overview = details.overview;
            updates.push('overview');
          } else {
            // Mark as checked with placeholder so we don't keep retrying
            updateData.overview = '[no-overview]';
            updates.push('overview-empty');
          }
        }

        // Update poster if missing (NULL or empty string)
        if (isEmpty(title.poster_path)) {
          if (details.poster_path) {
            updateData.poster_path = details.poster_path;
            updates.push('poster');
          } else {
            // Mark as checked with placeholder so we don't keep retrying
            updateData.poster_path = '[no-poster]';
            updates.push('poster-empty');
          }
        }

        // Update backdrop if missing
        if (!title.backdrop_path && details.backdrop_path) {
          updateData.backdrop_path = details.backdrop_path;
        }

        // Update runtime
        if (title.title_type === 'movie' && details.runtime) {
          updateData.runtime = details.runtime;
        }
        if (title.title_type === 'tv' && details.episode_run_time?.length > 0) {
          updateData.episode_run_time = details.episode_run_time;
        }

        // Handle trailer enrichment
        if (isEmpty(title.trailer_url)) {
          // Try TMDB first
          const tmdbTrailer = details.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

          if (tmdbTrailer) {
            updateData.trailer_url = `https://www.youtube.com/watch?v=${tmdbTrailer.key}`;
            updateData.is_tmdb_trailer = true;
            updates.push('trailer-tmdb');
            trailersEnriched++;
          } else if (!youtubeQuotaExceeded) {
            // Fallback to YouTube search
            const dateStr = title.title_type === 'movie' ? title.release_date : title.first_air_date;
            const releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;
            const contentType = title.title_type === 'movie' ? 'movie' : 'tv';

            const ytTrailer = await searchYouTubeTrailer(title.name, contentType, releaseYear);
            if (ytTrailer) {
              updateData.trailer_url = ytTrailer;
              updateData.is_tmdb_trailer = false;
              updates.push('trailer-youtube');
              trailersEnriched++;
            } else {
              updateData.trailer_url = '[no-trailer]';
              updateData.is_tmdb_trailer = null;
              updates.push('trailer-placeholder');
            }
          } else {
            updateData.trailer_url = '[no-trailer]';
            updateData.is_tmdb_trailer = null;
            updates.push('trailer-placeholder');
          }
        }

        // Handle transcript enrichment - check for NULL or empty string
        const trailerUrlForTranscript = updateData.trailer_url || title.trailer_url;
        const needsTranscript = title.trailer_transcript === null || title.trailer_transcript === '';
        if (needsTranscript && hasValidTrailer(trailerUrlForTranscript) && !supadataLimitExceeded) {
          const transcript = await getYouTubeTranscript(trailerUrlForTranscript);
          if (transcript) {
            updateData.trailer_transcript = transcript;
            updates.push('transcript');
            transcriptsEnriched++;
          } else {
            // Mark as checked so we don't retry endlessly
            updateData.trailer_transcript = '[no-transcript]';
            updates.push('transcript-unavailable');
          }
        }

        // Fetch Rotten Tomatoes scores if missing (check for NULL only, not 0)
        const needsRTScores = title.rt_cscore === null || title.rt_cscore === undefined;
        if (needsRTScores && OPENAI_API_KEY) {
          const dateStr = title.title_type === 'movie' ? title.release_date : title.first_air_date;
          const releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;
          const rtData = await fetchRottenTomatoesScores(
            title.name, 
            title.title_type === 'movie' ? 'movie' : 'tv', 
            releaseYear
          );
          
          if (rtData) {
            if (rtData.rt_cscore !== null) updateData.rt_cscore = rtData.rt_cscore;
            if (rtData.rt_ascore !== null) updateData.rt_ascore = rtData.rt_ascore;
            if (rtData.rt_ccount !== null) updateData.rt_ccount = rtData.rt_ccount;
            if (rtData.rt_acount !== null) updateData.rt_acount = rtData.rt_acount;
            
            if (rtData.rt_cscore !== null || rtData.rt_ascore !== null) {
              updates.push(`rt(c:${rtData.rt_cscore},a:${rtData.rt_ascore})`);
            }
          }
        }

        // Apply updates
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          const { error: updateError } = await supabase.from('titles').update(updateData).eq('id', title.id);
          if (updateError) {
            console.error(`Error updating ${title.name}:`, updateError);
            errors++;
          } else {
            titlesUpdated++;
          }
        }

        titlesProcessed++;
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error processing ${title.name}:`, err);
        errors++;
        titlesProcessed++;
      }
    }

    // ========== PHASE 2: SEASONS ==========
    let seasonsProcessed = 0;
    let seasonsUpdated = 0;

    if (!wasStoppedByUser && Date.now() - startTime < MAX_RUNTIME_MS) {
      const { data: seasonsToEnrich } = await supabase
        .from('seasons')
        .select('id, title_id, season_number, name, trailer_url, trailer_transcript, rt_cscore, rt_ascore, titles!inner(tmdb_id, name)')
        .or('trailer_url.is.null,trailer_url.eq.,trailer_transcript.is.null,rt_cscore.is.null')
        .gt('season_number', 0)
        .limit(BATCH_SIZE);

      const seasonsNeedingEnrichment = (seasonsToEnrich || []).filter(season =>
        isEmpty(season.trailer_url) || 
        (season.trailer_transcript === null && hasValidTrailer(season.trailer_url)) ||
        (season.rt_cscore === null && OPENAI_API_KEY)
      );

      for (const season of seasonsNeedingEnrichment) {
        if (Date.now() - startTime > MAX_RUNTIME_MS || wasStoppedByUser) break;

        try {
          const titleInfo = season.titles as any;
          const tmdbId = titleInfo?.tmdb_id;
          const titleName = titleInfo?.name;
          if (!tmdbId || !titleName) continue;

          // Ensure tmdb_id is an integer
          const tmdbIdInt = Math.floor(Number(tmdbId));
          if (!tmdbIdInt || isNaN(tmdbIdInt)) {
            console.error(`Invalid tmdb_id for season of ${titleName}: ${tmdbId}`);
            continue;
          }

          const updateData: Record<string, any> = {};
          const updates: string[] = [];

          // Handle trailer enrichment for season
          if (isEmpty(season.trailer_url)) {
            // Try TMDB season-specific trailer
            let trailerUrl: string | null = null;
            let isTmdbTrailer = true;

            try {
              const seasonVideosRes = await fetch(`${TMDB_BASE_URL}/tv/${tmdbIdInt}/season/${season.season_number}/videos?api_key=${TMDB_API_KEY}`);
              if (seasonVideosRes.ok) {
                const seasonVideos = await seasonVideosRes.json();
                const trailer = seasonVideos.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
                if (trailer) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
              }
            } catch { /* ignore */ }

            // Fallback to series-level TMDB trailer
            if (!trailerUrl) {
              try {
                const seriesVideosRes = await fetch(`${TMDB_BASE_URL}/tv/${tmdbIdInt}/videos?api_key=${TMDB_API_KEY}`);
                if (seriesVideosRes.ok) {
                  const seriesVideos = await seriesVideosRes.json();
                  const trailer = seriesVideos.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
                  if (trailer) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
                }
              } catch { /* ignore */ }
            }

            // Fallback to YouTube search
            if (!trailerUrl && !youtubeQuotaExceeded) {
              const seasonName = season.name || `Season ${season.season_number}`;
              trailerUrl = await searchYouTubeTrailer(titleName, 'tv', null, seasonName);
              if (trailerUrl) isTmdbTrailer = false;
            }

            if (trailerUrl) {
              updateData.trailer_url = trailerUrl;
              updateData.is_tmdb_trailer = isTmdbTrailer;
              updates.push(isTmdbTrailer ? 'trailer-tmdb' : 'trailer-youtube');
              trailersEnriched++;
            } else {
              updateData.trailer_url = '';
              updateData.is_tmdb_trailer = null;
              updates.push('trailer-empty');
            }
          }

          // Handle transcript enrichment for season - check for NULL or empty string
          const trailerUrlForTranscript = updateData.trailer_url || season.trailer_url;
          const needsTranscript = season.trailer_transcript === null || season.trailer_transcript === '';
          if (needsTranscript && hasValidTrailer(trailerUrlForTranscript) && !supadataLimitExceeded) {
            const transcript = await getYouTubeTranscript(trailerUrlForTranscript);
            if (transcript) {
              updateData.trailer_transcript = transcript;
              updates.push('transcript');
              transcriptsEnriched++;
            } else {
              // Mark as checked so we don't retry endlessly
              updateData.trailer_transcript = '[no-transcript]';
              updates.push('transcript-unavailable');
            }
          }

          // Fetch Rotten Tomatoes scores for season if missing
          const needsRTScores = season.rt_cscore === null || season.rt_cscore === undefined;
          if (needsRTScores && OPENAI_API_KEY) {
            const seasonName = season.name || `Season ${season.season_number}`;
            const rtData = await fetchRottenTomatoesScores(
              `${titleName} ${seasonName}`, 
              'tv', 
              null
            );
            
            if (rtData) {
              if (rtData.rt_cscore !== null) updateData.rt_cscore = rtData.rt_cscore;
              if (rtData.rt_ascore !== null) updateData.rt_ascore = rtData.rt_ascore;
              if (rtData.rt_ccount !== null) updateData.rt_ccount = rtData.rt_ccount;
              if (rtData.rt_acount !== null) updateData.rt_acount = rtData.rt_acount;
              
              if (rtData.rt_cscore !== null || rtData.rt_ascore !== null) {
                updates.push(`rt(c:${rtData.rt_cscore},a:${rtData.rt_ascore})`);
              }
            }
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase.from('seasons').update(updateData).eq('id', season.id);
            if (updateError) {
              console.error(`Error updating season ${season.id}:`, updateError);
              errors++;
            } else {
              seasonsUpdated++;
            }
          }

          seasonsProcessed++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error processing season:`, err);
          errors++;
          seasonsProcessed++;
        }
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const totalProcessed = titlesProcessed + seasonsProcessed;
    const totalUpdated = titlesUpdated + seasonsUpdated;

    // Check remaining work - TITLES (use simpler count query)
    const { count: remainingPoster } = await supabase
      .from('titles')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .or('poster_path.is.null,poster_path.eq.');

    const { count: remainingOverview } = await supabase
      .from('titles')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .or('overview.is.null,overview.eq.');

    const { count: remainingTrailer } = await supabase
      .from('titles')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .or('trailer_url.is.null,trailer_url.eq.');

    const remainingTitles = Math.max(remainingPoster || 0, remainingOverview || 0, remainingTrailer || 0);

    // Titles with missing transcript (NULL or empty)
    const { count: titlesMissingTranscripts } = await supabase
      .from('titles')
      .select('*', { count: 'exact', head: true })
      .or('trailer_transcript.is.null,trailer_transcript.eq.');

    // Seasons with missing transcript (NULL or empty)
    const { count: seasonsMissingTranscripts } = await supabase
      .from('seasons')
      .select('*', { count: 'exact', head: true })
      .or('trailer_transcript.is.null,trailer_transcript.eq.');

    const totalMissingTranscripts = (titlesMissingTranscripts || 0) + (seasonsMissingTranscripts || 0);
    const hasMoreWork = (remainingTitles || 0) > 0 || totalMissingTranscripts > 0;
    const isComplete = !hasMoreWork;

    // Update job status
    if (jobId) {
      await supabase
        .from('jobs')
        .update({
          status: (hasMoreWork && !wasStoppedByUser) ? 'running' : 'completed',
          last_run_duration_seconds: duration,
          ...((!hasMoreWork || wasStoppedByUser) ? { error_message: null } : {})
        })
        .eq('id', jobId);

      if (totalUpdated > 0) {
        await supabase.rpc('increment_job_titles', { p_job_type: 'enrich_details', p_increment: totalUpdated });
      }
    }

    // Schedule next batch if more work remains
    let shouldScheduleNext = hasMoreWork && !wasStoppedByUser && jobId;

    if (shouldScheduleNext && jobId) {
      const { data: finalJobCheck } = await supabase.from('jobs').select('status, is_active').eq('id', jobId).single();
      if (finalJobCheck?.status === 'stopped' || finalJobCheck?.status === 'idle' || !finalJobCheck?.is_active) {
        shouldScheduleNext = false;
      }
    }

    if (shouldScheduleNext && jobId) {
      const invokeNextBatch = async () => {
        try {
          const { data: preInvokeCheck } = await supabase.from('jobs').select('status, is_active').eq('id', jobId).single();
          if (preInvokeCheck?.status === 'stopped' || preInvokeCheck?.status === 'idle' || !preInvokeCheck?.is_active) return;

          await fetch(`${SUPABASE_URL}/functions/v1/enrich-title-details-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ jobId })
          });
        } catch (e) {
          console.error('Error invoking next batch:', e);
        }
      };

      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(invokeNextBatch());
      } else {
        invokeNextBatch();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        titlesProcessed,
        titlesUpdated,
        seasonsProcessed,
        seasonsUpdated,
        trailersEnriched,
        transcriptsEnriched,
        errors,
        duration_seconds: duration,
        remaining: remainingTitles || 0,
        missingTranscripts: totalMissingTranscripts,
        isComplete,
        youtubeQuotaExceeded,
        supadataLimitExceeded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enrich batch job error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase.from('jobs').update({ status: 'failed', error_message: errorMessage }).eq('job_type', 'enrich_details');

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
