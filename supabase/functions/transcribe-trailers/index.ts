import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to check if URL is a YouTube URL
function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/|youtu\.be\/)/.test(url);
}

// Function to check if URL is valid and not empty
function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  
  // Must start with http:// or https://
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  
  return true;
}

// Function to check if URL is a direct video file we can download
function isDownloadableVideoUrl(url: string): boolean {
  // Only YouTube URLs are currently supported for transcription
  // TMDB video links and other streaming URLs cannot be downloaded directly
  return isYouTubeUrl(url);
}

// Function to detect if text is in English
async function isEnglish(text: string): Promise<boolean> {
  if (typeof text !== 'string' || !text || text.trim().length === 0) {
    console.warn('Invalid text input for language detection, assuming English');
    return true;
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, assuming English');
    return true;
  }

  try {
    const textSample = text.substring(0, 500);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Detect the language of the text. Respond with ONLY "english" or "other". No explanations.'
          },
          {
            role: 'user',
            content: textSample
          }
        ],
        max_tokens: 10
      }),
    });

    if (!response.ok) {
      console.warn('Language detection failed, assuming English');
      return true;
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim().toLowerCase();
    return result === 'english';
  } catch (error) {
    console.error(`Language detection error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

// Function to translate non-English text to English
async function translateToEnglish(transcript: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, skipping translation');
    return transcript;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Translate the following text to English. Return ONLY the translated text with no explanations or additional commentary.'
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI translation API error: ${errorText}`);
      return transcript;
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();
    
    if (!translatedText) {
      console.warn('No translation result from OpenAI');
      return transcript;
    }

    console.log(`✓ Transcript translated to English (${transcript.length} → ${translatedText.length} chars)`);
    return translatedText;
  } catch (error) {
    console.error(`Translation error: ${error instanceof Error ? error.message : String(error)}`);
    return transcript;
  }
}

// Function to ensure transcript is in English
async function ensureEnglishTranscript(transcript: string): Promise<string> {
  const alreadyEnglish = await isEnglish(transcript);
  
  if (alreadyEnglish) {
    console.log(`✓ Transcript already in English, skipping translation`);
    return transcript;
  }
  
  console.log(`⚠ Non-English transcript detected, translating...`);
  return await translateToEnglish(transcript);
}

// Track if we hit API limit to stop processing
let supadataLimitExceeded = false;

// Function to get transcript for a YouTube URL
async function getYouTubeTranscript(videoUrl: string): Promise<string | null> {
  // If we already hit the limit, don't make more requests
  if (supadataLimitExceeded) {
    console.log('Supadata API limit already exceeded, skipping');
    return null;
  }

  const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY');
  if (!SUPADATA_API_KEY) {
    console.error('Supadata API key not configured');
    return null;
  }

  try {
    const supadataResponse = await fetch(
      `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(videoUrl)}&text=true&lang=en-US`,
      {
        headers: {
          'x-api-key': SUPADATA_API_KEY
        }
      }
    );

    if (!supadataResponse.ok) {
      const errorText = await supadataResponse.text();
      console.error(`Supadata API error: ${errorText}`);
      
      // Check if it's a rate limit or quota error
      if (errorText.includes('limit-exceeded') || errorText.includes('Limit Exceeded') || errorText.includes('quota')) {
        console.error('⚠ Supadata API limit exceeded - stopping YouTube transcriptions');
        supadataLimitExceeded = true;
      }
      
      return null;
    }

    const supadataData = await supadataResponse.json();
    const { content, lang } = supadataData;
    
    if (!content || content.trim().length === 0) {
      console.log('No transcript available from Supadata');
      return null;
    }

    console.log(`✓ Supadata transcript extracted: ${content.length} characters, language: ${lang}`);
    
    // If language is English, use content directly, otherwise translate
    const isEnglishLang = lang && (lang === 'en' || lang.toLowerCase().startsWith('en-'));
    if (isEnglishLang) {
      return content;
    } else {
      console.log(`⚠ Non-English transcript (${lang}), translating to English...`);
      return await translateToEnglish(content);
    }
  } catch (error) {
    console.error(`Supadata error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Main transcription function - only supports YouTube URLs
async function transcribeVideo(videoUrl: string): Promise<string | null> {
  // Validate URL first
  if (!isValidUrl(videoUrl)) {
    console.log(`⚠ Invalid or empty URL, skipping`);
    return null;
  }

  // Only YouTube URLs are supported for transcription
  if (isYouTubeUrl(videoUrl)) {
    console.log(`YouTube URL detected, using Supadata.ai API`);
    return await getYouTubeTranscript(videoUrl);
  } else {
    // Non-YouTube URLs (like TMDB direct links) cannot be transcribed
    console.log(`⚠ Non-YouTube URL detected (${videoUrl.substring(0, 50)}...), skipping - only YouTube supported`);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_RUNTIME_MS = 85000; // 85 seconds safety margin
  const BATCH_SIZE = 10;

  // Reset limit flag at start of each invocation
  supadataLimitExceeded = false;

  try {
    const body = await req.json();
    const jobId = body.jobId;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if job is still running
    if (jobId) {
      const { data: job } = await supabase
        .from('jobs')
        .select('status, error_message')
        .eq('id', jobId)
        .single();

      if (job?.status !== 'running') {
        console.log(`Job ${jobId} is no longer running (status: ${job?.status}). Stopping.`);
        return new Response(
          JSON.stringify({ message: 'Job stopped', processed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let totalTitlesProcessed = 0;
    let totalSeasonsProcessed = 0;
    let hasMoreWork = true;

    // Continuous batch processing loop
    while (hasMoreWork && (Date.now() - startTime) < MAX_RUNTIME_MS && !supadataLimitExceeded) {
      // Check job status periodically
      if (jobId && totalTitlesProcessed % 20 === 0 && totalTitlesProcessed > 0) {
        const { data: job } = await supabase
          .from('jobs')
          .select('status')
          .eq('id', jobId)
          .single();

        if (job?.status !== 'running') {
          console.log(`Job stopped during processing. Exiting.`);
          break;
        }
      }

      // ========== PHASE 1: Process titles (movies + series) ==========
      // Filter for YouTube URLs only (contains 'youtube.com' or 'youtu.be')
      const { data: titles, error: titlesError } = await supabase
        .from('titles')
        .select('id, name, trailer_url, title_type')
        .not('trailer_url', 'is', null)
        .neq('trailer_url', '') // Exclude empty strings
        .is('trailer_transcript', null)
        .or('trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%') // Only YouTube URLs
        .limit(BATCH_SIZE);

      if (titlesError) {
        console.error('Error fetching titles:', titlesError);
        break;
      }

      if (titles && titles.length > 0) {
        for (const title of titles) {
          if ((Date.now() - startTime) >= MAX_RUNTIME_MS) break;
          if (supadataLimitExceeded) break;

          // Double-check URL validity
          if (!isValidUrl(title.trailer_url)) {
            console.log(`⚠ Skipping title ${title.name} - invalid URL`);
            await supabase
              .from('titles')
              .update({ trailer_transcript: '' })
              .eq('id', title.id);
            continue;
          }

          console.log(`Processing title: ${title.name} (${title.title_type})`);
          
          const transcript = await transcribeVideo(title.trailer_url!);
          
          if (transcript) {
            const { error: updateError } = await supabase
              .from('titles')
              .update({ trailer_transcript: transcript })
              .eq('id', title.id);

            if (updateError) {
              console.error(`Failed to update title ${title.id}:`, updateError);
            } else {
              console.log(`✓ Updated title ${title.name} with transcript (${transcript.length} chars)`);
              totalTitlesProcessed++;
            }
          } else {
            // Mark as processed with empty string to skip in future runs
            await supabase
              .from('titles')
              .update({ trailer_transcript: '' })
              .eq('id', title.id);
            console.log(`✗ No transcript available for ${title.name}, marked as processed`);
          }
        }
      }

      // Stop if Supadata limit was hit
      if (supadataLimitExceeded) {
        console.log('Stopping due to Supadata API limit');
        break;
      }

      // ========== PHASE 2: Process seasons ==========
      const { data: seasons, error: seasonsError } = await supabase
        .from('seasons')
        .select('id, name, season_number, trailer_url, title_id')
        .not('trailer_url', 'is', null)
        .neq('trailer_url', '') // Exclude empty strings
        .is('trailer_transcript', null)
        .or('trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%') // Only YouTube URLs
        .limit(BATCH_SIZE);

      if (seasonsError) {
        console.error('Error fetching seasons:', seasonsError);
        break;
      }

      if (seasons && seasons.length > 0) {
        // Get parent title names for logging
        const titleIds = [...new Set(seasons.map(s => s.title_id))];
        const { data: parentTitles } = await supabase
          .from('titles')
          .select('id, name')
          .in('id', titleIds);
        
        const titleNameMap = new Map(parentTitles?.map(t => [t.id, t.name]) || []);

        for (const season of seasons) {
          if ((Date.now() - startTime) >= MAX_RUNTIME_MS) break;
          if (supadataLimitExceeded) break;

          // Double-check URL validity
          if (!isValidUrl(season.trailer_url)) {
            console.log(`⚠ Skipping season - invalid URL`);
            await supabase
              .from('seasons')
              .update({ trailer_transcript: '' })
              .eq('id', season.id);
            continue;
          }

          const titleName = titleNameMap.get(season.title_id) || 'Unknown';
          console.log(`Processing season: ${titleName} - ${season.name || `Season ${season.season_number}`}`);
          
          const transcript = await transcribeVideo(season.trailer_url!);
          
          if (transcript) {
            const { error: updateError } = await supabase
              .from('seasons')
              .update({ trailer_transcript: transcript })
              .eq('id', season.id);

            if (updateError) {
              console.error(`Failed to update season ${season.id}:`, updateError);
            } else {
              console.log(`✓ Updated ${titleName} Season ${season.season_number} with transcript (${transcript.length} chars)`);
              totalSeasonsProcessed++;
            }
          } else {
            // Mark as processed with empty string
            await supabase
              .from('seasons')
              .update({ trailer_transcript: '' })
              .eq('id', season.id);
            console.log(`✗ No transcript available for ${titleName} Season ${season.season_number}, marked as processed`);
          }
        }
      }

      // Check if there's more YouTube work to do
      const { count: remainingTitles } = await supabase
        .from('titles')
        .select('*', { count: 'exact', head: true })
        .not('trailer_url', 'is', null)
        .neq('trailer_url', '')
        .is('trailer_transcript', null)
        .or('trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%');

      const { count: remainingSeasons } = await supabase
        .from('seasons')
        .select('*', { count: 'exact', head: true })
        .not('trailer_url', 'is', null)
        .neq('trailer_url', '')
        .is('trailer_transcript', null)
        .or('trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%');

      hasMoreWork = (remainingTitles || 0) > 0 || (remainingSeasons || 0) > 0;

      if (!hasMoreWork) {
        console.log('No more YouTube items to transcribe');
        break;
      }

      // Update job progress
      if (jobId && (totalTitlesProcessed + totalSeasonsProcessed) > 0) {
        await supabase.rpc('increment_job_titles', {
          p_job_type: 'transcribe_trailers',
          p_increment: totalTitlesProcessed + totalSeasonsProcessed
        });
      }
    }

    // Mark non-YouTube URLs as processed (set to empty string so they're skipped)
    console.log('Marking non-YouTube trailer URLs as processed...');
    
    // Mark non-YouTube title trailers
    await supabase
      .from('titles')
      .update({ trailer_transcript: '' })
      .not('trailer_url', 'is', null)
      .neq('trailer_url', '')
      .is('trailer_transcript', null)
      .not('trailer_url', 'ilike', '%youtube.com%')
      .not('trailer_url', 'ilike', '%youtu.be%');

    // Mark non-YouTube season trailers
    await supabase
      .from('seasons')
      .update({ trailer_transcript: '' })
      .not('trailer_url', 'is', null)
      .neq('trailer_url', '')
      .is('trailer_transcript', null)
      .not('trailer_url', 'ilike', '%youtube.com%')
      .not('trailer_url', 'ilike', '%youtu.be%');

    // Final job update
    if (jobId) {
      const { count: remainingTitles } = await supabase
        .from('titles')
        .select('*', { count: 'exact', head: true })
        .not('trailer_url', 'is', null)
        .neq('trailer_url', '')
        .is('trailer_transcript', null)
        .or('trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%');

      const { count: remainingSeasons } = await supabase
        .from('seasons')
        .select('*', { count: 'exact', head: true })
        .not('trailer_url', 'is', null)
        .neq('trailer_url', '')
        .is('trailer_transcript', null)
        .or('trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%');

      const hasMoreWork = (remainingTitles || 0) > 0 || (remainingSeasons || 0) > 0;

      if (supadataLimitExceeded) {
        // API limit hit - stop job with message
        await supabase
          .from('jobs')
          .update({ 
            status: 'stopped',
            error_message: 'Supadata API limit exceeded. Job paused until quota resets.'
          })
          .eq('id', jobId);
        console.log('Job stopped - Supadata API limit exceeded');
      } else if (!hasMoreWork) {
        // All done - mark job as completed
        const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
        await supabase
          .from('jobs')
          .update({ 
            status: 'completed',
            last_run_duration_seconds: durationSeconds,
            error_message: null
          })
          .eq('id', jobId);
        console.log('Job completed - all transcripts processed');
      } else {
        // More work remains - self-invoke to continue using EdgeRuntime.waitUntil
        console.log(`Time limit reached. Remaining: ${remainingTitles} titles, ${remainingSeasons} seasons. Self-invoking...`);
        
        const selfInvoke = async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            const response = await fetch(
              `${supabaseUrl}/functions/v1/transcribe-trailers`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({ jobId }),
              }
            );
            console.log(`Self-invocation response: ${response.status}`);
          } catch (error) {
            console.error('Self-invoke failed:', error);
          }
        };
        
        // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
        EdgeRuntime.waitUntil(selfInvoke());
      }
    }

    const totalProcessed = totalTitlesProcessed + totalSeasonsProcessed;
    return new Response(
      JSON.stringify({ 
        message: `Processed ${totalProcessed} items (${totalTitlesProcessed} titles, ${totalSeasonsProcessed} seasons)`,
        titlesProcessed: totalTitlesProcessed,
        seasonsProcessed: totalSeasonsProcessed,
        supadataLimitExceeded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
