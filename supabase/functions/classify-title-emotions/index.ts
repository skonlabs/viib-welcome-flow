// supabase/functions/classify-title-emotions/index.ts
// ========================================================================
// ViiB – Emotional Batch Classification (Movies + Series + Trailer Transcript)
// ========================================================================
// Uses trailer_transcript column for accurate emotional modeling
// Supports movies AND series with single series-level classification
// Populates title_emotional_signatures table
// Filters out previously classified titles
// ========================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface TitleRow {
  id: string;
  title_type: string | null;
  name: string | null;
  original_name: string | null;
  overview: string | null;
  trailer_transcript: string | null;
  original_language: string | null;
}

interface EmotionMaster {
  id: string;
  emotion_label: string;
}

interface ModelEmotion {
  emotion_label: string;
  intensity_level: number;
}

interface ModelResponse {
  title: string;
  emotions: ModelEmotion[];
}

// ----------------------------------------------------------------------------
// Prompt builders
// ----------------------------------------------------------------------------

function buildSystemPrompt(emotionLabels: string[]): string {
  return `
You are an expert in emotional content modeling for movies and TV series.

Your task:
Given title metadata + overview + trailer transcript,
identify which emotions the audience is MOST LIKELY to experience.

Emotional Vocabulary (USE THESE ONLY):
${emotionLabels.join(", ")}

Rules:
1. Always return JSON.
2. Pick 3–15 emotional states.
3. intensity_level is 1–10.
4. NEVER invent emotion labels.
5. Trailer transcript should heavily influence emotional prediction.
6. For series: trailer emotion should reflect the series-level tone.
7. Return JSON only. No explanation.
`;
}

function buildUserPrompt(t: TitleRow): string {
  return `
Title Type: ${(t.title_type || 'movie').toUpperCase()}
Title: ${t.name ?? "(unknown)"}
Original Title: ${t.original_name ?? "(unknown)"}
Original Language: ${t.original_language ?? "(unknown)"}

Overview:
${t.overview ?? "(none)"}

Trailer Transcript (most important signal):
${t.trailer_transcript?.slice(0, 5000) ?? "(none provided)"}

Return ONLY JSON:
{
  "title": "...",
  "emotions": [
    { "emotion_label": "...", "intensity_level": <1-10> },
    ...
  ]
}
`;
}

// ----------------------------------------------------------------------------
// AI classifier
// ----------------------------------------------------------------------------

async function classifyWithAI(
  title: TitleRow,
  emotionLabels: string[]
): Promise<ModelResponse | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: buildSystemPrompt(emotionLabels) },
          { role: "user", content: buildUserPrompt(title) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    return JSON.parse(raw);
  } catch (err) {
    console.error("AI Error:", err);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Insert emotional signatures
// ----------------------------------------------------------------------------

async function insertEmotionalSignatures(
  titleId: string, 
  emotions: ModelEmotion[],
  emotionMasterMap: Map<string, string>
) {
  const data = emotions
    .filter(e => emotionMasterMap.has(e.emotion_label))
    .map((e) => ({
      title_id: titleId,
      emotion_id: emotionMasterMap.get(e.emotion_label)!,
      intensity_level: e.intensity_level,
    }));

  if (data.length === 0) return;

  const { error } = await supabase
    .from("title_emotional_signatures")
    .upsert(data, { onConflict: 'title_id,emotion_id' });

  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Update job progress
// ----------------------------------------------------------------------------

async function updateJobProgress(jobId: string, increment: number) {
  if (!jobId) return;
  
  try {
    await supabase.rpc('increment_job_titles', { 
      p_job_type: 'classify_emotions',
      p_increment: increment 
    });
  } catch (error) {
    console.error('Failed to update job progress:', error);
  }
}

// ----------------------------------------------------------------------------
// Check job status
// ----------------------------------------------------------------------------

async function checkJobStatus(jobId: string): Promise<boolean> {
  if (!jobId) return true;
  
  const { data } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .maybeSingle();
  
  return data?.status === 'running';
}

// ----------------------------------------------------------------------------
// MAIN EDGE FUNCTION
// ----------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { batchSize = 10, jobId } = await req.json().catch(() => ({}));
    
    console.log(`Starting emotion classification batch. Size: ${batchSize}, JobId: ${jobId || 'none'}`);

    // Check if job is still running
    if (jobId && !(await checkJobStatus(jobId))) {
      console.log('Job was stopped, aborting...');
      return new Response(
        JSON.stringify({ message: 'Job was stopped', processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load content_state emotions from emotion_master
    const { data: emotions, error: emotionsError } = await supabase
      .from("emotion_master")
      .select("id, emotion_label")
      .eq("category", "content_state");

    if (emotionsError) {
      console.error('Error loading emotions:', emotionsError);
      throw new Error('Failed to load emotion vocabulary');
    }

    const emotionLabels = emotions?.map((e) => e.emotion_label) ?? [];
    const emotionMasterMap = new Map<string, string>(
      emotions?.map(e => [e.emotion_label, e.id]) ?? []
    );

    if (emotionLabels.length === 0) {
      return new Response(
        JSON.stringify({ message: "No content_state emotions found in emotion_master", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Loaded ${emotionLabels.length} emotion labels`);

    // 2. Load candidate titles (movies + series) that haven't been classified yet
    const { data: titles, error: titlesError } = await supabase
      .from("titles")
      .select("id, title_type, name, original_name, overview, trailer_transcript, original_language")
      .not('title_emotional_signatures', 'is', null) // This won't work - need different approach
      .order("created_at", { ascending: false })
      .limit(batchSize * 3);

    // Actually, let's get all titles and filter by those not in title_emotional_signatures
    const { data: allTitles, error: allTitlesError } = await supabase
      .from("titles")
      .select("id, title_type, name, original_name, overview, trailer_transcript, original_language")
      .not('trailer_transcript', 'is', null)
      .order("created_at", { ascending: false })
      .limit(batchSize * 3);

    if (allTitlesError) {
      console.error('Error loading titles:', allTitlesError);
      throw new Error('Failed to load titles');
    }

    if (!allTitles || allTitles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No titles with trailer transcripts found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check which titles already have emotional signatures
    const titleIds = allTitles.map((t) => t.id);

    const { data: existingSignatures } = await supabase
      .from("title_emotional_signatures")
      .select("title_id")
      .in("title_id", titleIds);

    const classifiedIds = new Set(existingSignatures?.map((s) => s.title_id) ?? []);
    const candidates = allTitles.filter((t) => !classifiedIds.has(t.id)).slice(0, batchSize);

    console.log(`Found ${candidates.length} unclassified titles with transcripts`);

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ message: "All titles with transcripts are already classified", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    const errors: Record<string, string> = {};

    for (const title of candidates) {
      // Check job status before each title
      if (jobId && !(await checkJobStatus(jobId))) {
        console.log('Job was stopped, aborting mid-batch...');
        break;
      }

      try {
        console.log(`Classifying: ${title.name || title.id}`);
        
        const result = await classifyWithAI(title as TitleRow, emotionLabels);

        if (!result || !Array.isArray(result.emotions)) {
          errors[title.id] = "Invalid AI response";
          console.log(`Invalid AI response for ${title.id}`);
          continue;
        }

        // Validate against vocabulary
        const cleaned = result.emotions
          .filter((e) => emotionLabels.includes(e.emotion_label))
          .map((e) => ({
            emotion_label: e.emotion_label,
            intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
          }));

        if (!cleaned.length) {
          errors[title.id] = "No valid emotions survived cleanup";
          console.log(`No valid emotions for ${title.id}`);
          continue;
        }

        await insertEmotionalSignatures(title.id, cleaned, emotionMasterMap);
        processed++;
        
        // Update job progress
        await updateJobProgress(jobId, 1);
        
        console.log(`Classified ${title.name || title.id} with ${cleaned.length} emotions`);
      } catch (err: any) {
        errors[title.id] = err?.message ?? "Unknown error";
        console.error(`Error classifying ${title.id}:`, err);
      }
    }

    // Check if there's more work to do and self-invoke
    const hasMoreWork = candidates.length === batchSize;
    
    if (hasMoreWork && jobId && (await checkJobStatus(jobId))) {
      console.log('More work available, scheduling next batch...');
      
      // Self-invoke for next batch using waitUntil
      const selfInvoke = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
        try {
          await fetch(`${supabaseUrl}/functions/v1/classify-title-emotions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ batchSize, jobId }),
          });
        } catch (error) {
          console.error('Failed to self-invoke:', error);
        }
      };
      
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined') {
        // @ts-ignore
        EdgeRuntime.waitUntil(selfInvoke());
      } else {
        // Fallback for environments without EdgeRuntime
        selfInvoke();
      }
    } else if (!hasMoreWork && jobId) {
      // Mark job as completed
      await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          error_message: Object.keys(errors).length > 0 
            ? `Completed with ${Object.keys(errors).length} errors` 
            : null
        })
        .eq('id', jobId);
    }

    return new Response(
      JSON.stringify({
        message: "Batch emotional classification complete",
        processed,
        remaining: hasMoreWork ? 'more batches scheduled' : 'all done',
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
