// ============================================================================
// ViiB — Combined AI Classification (Emotions + Intents in ONE API call)
// ============================================================================
// Processes in batches with self-invocation to handle large catalogs
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);
const openai = new OpenAI({ apiKey: openaiKey });

const JOB_TYPE = "classify_ai";
const BATCH_SIZE = 50;           // Process 50 titles per invocation
const CONCURRENT_AI_CALLS = 10;  // 10 parallel OpenAI calls
const MAX_TRANSCRIPT_CHARS = 4000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid intent types from the enum
const INTENT_TYPES = [
  'adrenaline_rush',
  'background_passive',
  'comfort_escape',
  'deep_thought',
  'discovery',
  'emotional_release',
  'family_bonding',
  'light_entertainment'
] as const;

type IntentType = typeof INTENT_TYPES[number];

interface TitleRow {
  id: string;
  title_type: "movie" | "tv" | string | null;
  name: string | null;
  overview: string | null;
  trailer_transcript: string | null;
  original_language: string | null;
  title_genres?: string[] | null;
}

interface EmotionRow {
  id: string;
  emotion_label: string;
}

interface ModelEmotion {
  emotion_label: string;
  intensity_level: number;
}

interface ModelIntent {
  intent_type: IntentType;
  confidence_score: number;
}

interface ModelResponse {
  title: string;
  emotions: ModelEmotion[];
  intents: ModelIntent[];
}

interface JobConfig {
  last_processed_id?: string | null;
}

// ---------------------------------------------------------------------
// Job helpers
// ---------------------------------------------------------------------
async function getJobConfig(): Promise<{ status: string; config: JobConfig }> {
  const { data } = await supabase
    .from("jobs")
    .select("status, configuration")
    .eq("job_type", JOB_TYPE)
    .single();
  return {
    status: data?.status ?? "idle",
    config: (data?.configuration as JobConfig) ?? {}
  };
}

async function incrementJobTitles(count: number): Promise<void> {
  await supabase.rpc("increment_job_titles", {
    p_job_type: JOB_TYPE,
    p_increment: count,
  });
}

async function markJobComplete(): Promise<void> {
  await supabase
    .from("jobs")
    .update({ status: "idle", error_message: null, configuration: {} })
    .eq("job_type", JOB_TYPE);
}

async function saveCursor(cursor: string): Promise<void> {
  await supabase
    .from("jobs")
    .update({ configuration: { last_processed_id: cursor } })
    .eq("job_type", JOB_TYPE);
}

// ---------------------------------------------------------------------
// Simple concurrency pool
// ---------------------------------------------------------------------
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  async function next(): Promise<void> {
    const index = i++;
    if (index >= items.length) return;
    results[index] = await worker(items[index]);
    await next();
  }

  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(limit, items.length); w++) {
    workers.push(next());
  }

  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------
// Combined Prompt builders (Emotions + Intents in ONE call)
// ---------------------------------------------------------------------
function buildSystemPrompt(emotionLabels: string[]): string {
  return `You are an expert in emotional content modeling and viewer intent analysis for movies and TV series.

You will provide TWO classifications in a SINGLE response:

1. EMOTIONS: Estimate which emotions a viewer experiences while watching, with intensity (1-10).
2. INTENTS: Classify what viewing intent the title satisfies - WHY someone would watch this.

IMPORTANT WEIGHTING:
- IF trailer transcript provided: treat as PRIMARY signal (~80% weight)
- IF NO transcript: infer from overview, genres, title, tone

EMOTION VOCABULARY (use ONLY these):
${emotionLabels.join(", ")}

INTENT TYPES (use ONLY these exact labels):
- adrenaline_rush: Action-packed, exciting, heart-pounding content
- background_passive: Light content suitable for background watching
- comfort_escape: Familiar, cozy content for relaxation
- deep_thought: Intellectually stimulating content
- discovery: Educational or eye-opening content
- emotional_release: Content for cathartic emotional expression
- family_bonding: Appropriate for family viewing together
- light_entertainment: Fun, easy-to-watch casual content

Output: SINGLE JSON object with:
- "emotions": array of 3-15 emotions with emotion_label and intensity_level (1-10)
- "intents": array of 1-3 intents with intent_type and confidence_score (0.0-1.0)

DO NOT invent labels. NO explanation text. Only JSON.`;
}

function buildUserPrompt(t: TitleRow): string {
  const hasTranscript = !!t.trailer_transcript?.trim();
  const genres = Array.isArray(t.title_genres) ? t.title_genres.filter(Boolean) : [];

  return `
Title Type: ${t.title_type === "tv" ? "TV SERIES" : "MOVIE"}
Title: ${t.name ?? "(unknown)"}
Language: ${t.original_language ?? "(unknown)"}
Genres: ${genres.length ? genres.join(", ") : "(none)"}

${hasTranscript ? "Transcript (PRIMARY):" : "Overview:"}
${hasTranscript ? t.trailer_transcript!.slice(0, MAX_TRANSCRIPT_CHARS) : (t.overview || "(no overview)")}

Return ONLY JSON: { "title": "...", "emotions": [...], "intents": [...] }`;
}

// ---------------------------------------------------------------------
// AI classification (COMBINED - both emotions and intents)
// ---------------------------------------------------------------------
async function classifyWithAI(title: TitleRow, emotionLabels: string[]): Promise<ModelResponse | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: buildSystemPrompt(emotionLabels) },
        { role: "user", content: buildUserPrompt(title) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content;
    return raw ? JSON.parse(raw) as ModelResponse : null;
  } catch (err) {
    console.error("AI error for title:", title.id, err);
    return null;
  }
}

// ---------------------------------------------------------------------
// Insert staging rows for emotions
// ---------------------------------------------------------------------
async function insertEmotionStagingRows(titleId: string, emotions: ModelEmotion[], emotionLabelToId: Map<string, string>) {
  const payload = emotions
    .filter((e) => emotionLabelToId.has(e.emotion_label))
    .map((e) => ({
      title_id: titleId,
      emotion_id: emotionLabelToId.get(e.emotion_label)!,
      intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
      source: "ai",
    }));

  if (!payload.length) return 0;

  const { error } = await supabase
    .from("title_emotional_signatures_staging")
    .upsert(payload, { onConflict: "title_id,emotion_id", ignoreDuplicates: true });
  if (error) throw error;
  return payload.length;
}

// ---------------------------------------------------------------------
// Insert staging rows for intents
// ---------------------------------------------------------------------
async function insertIntentStagingRows(titleId: string, intents: ModelIntent[]) {
  const payload = intents
    .filter((i) => INTENT_TYPES.includes(i.intent_type))
    .map((i) => ({
      title_id: titleId,
      intent_type: i.intent_type,
      confidence_score: Math.min(1.0, Math.max(0.0, i.confidence_score)),
      source: "ai",
    }));

  if (!payload.length) return 0;

  const { error } = await supabase
    .from("viib_intent_classified_titles_staging")
    .upsert(payload, { onConflict: "title_id,intent_type", ignoreDuplicates: true });
  if (error) throw error;
  return payload.length;
}

// ---------------------------------------------------------------------
// Self-invoke for next batch
// ---------------------------------------------------------------------
async function invokeNextBatch(): Promise<void> {
  try {
    console.log("🔄 Self-invoking for next batch...");
    await supabase.functions.invoke("classify-title-ai", {
      body: { continuation: true }
    });
  } catch (err) {
    console.error("Failed to self-invoke:", err);
  }
}

// ---------------------------------------------------------------------
// Main processing logic - processes one batch then self-invokes
// ---------------------------------------------------------------------
async function processClassificationBatch(): Promise<{ processed: number; hasMore: boolean }> {
  const startTime = Date.now();

  // Step 1: Check job status
  const { status, config } = await getJobConfig();
  
  if (status !== "running") {
    console.log("Job not running, exiting.");
    return { processed: 0, hasMore: false };
  }

  const cursor = config.last_processed_id || null;
  console.log(`Starting batch with cursor: ${cursor || "(none)"}`);

  // Step 2: Load emotion vocabulary
  const { data: emotions, error: emoErr } = await supabase
    .from("emotion_master")
    .select("id, emotion_label")
    .eq("category", "content_state");

  if (emoErr || !emotions?.length) {
    console.error("Failed to load emotion_master:", emoErr);
    return { processed: 0, hasMore: false };
  }

  const emotionLabelToId = new Map<string, string>();
  const emotionLabels: string[] = [];
  for (const e of emotions as EmotionRow[]) {
    emotionLabels.push(e.emotion_label);
    emotionLabelToId.set(e.emotion_label, e.id);
  }

  // Step 3: Fetch batch of titles needing classification
  const { data: batch, error: fetchError } = await supabase
    .rpc("get_titles_needing_classification", {
      p_cursor: cursor,
      p_limit: BATCH_SIZE
    });

  if (fetchError) {
    console.error("Error fetching titles:", fetchError);
    return { processed: 0, hasMore: false };
  }

  if (!batch || batch.length === 0) {
    console.log("No more titles to classify!");
    await markJobComplete();
    return { processed: 0, hasMore: false };
  }

  console.log(`Got ${batch.length} titles to classify`);

  // Step 4: Re-check job status before processing
  const jobStatus = await getJobConfig();
  if (jobStatus?.status !== "running") {
    console.log("Job stopped by user, aborting.");
    return { processed: 0, hasMore: false };
  }

  // Step 5: Process batch with AI (concurrent)
  let batchProcessed = 0;
  let lastProcessedId = cursor;

  await runWithConcurrency(batch as TitleRow[], CONCURRENT_AI_CALLS, async (title) => {
    const label = title.name ?? title.id;

    try {
      const aiStart = Date.now();
      const result = await classifyWithAI(title, emotionLabels);
      console.log(`⏱️ AI: ${label} (${Date.now() - aiStart}ms)`);
      
      if (!result) return;

      let emotionsSaved = 0;
      let intentsSaved = 0;

      // Insert emotions
      if (result.emotions?.length) {
        const cleanedEmotions = result.emotions
          .filter((e) => emotionLabels.includes(e.emotion_label))
          .map((e) => ({
            emotion_label: e.emotion_label,
            intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
          }));

        if (cleanedEmotions.length) {
          emotionsSaved = await insertEmotionStagingRows(title.id, cleanedEmotions, emotionLabelToId);
        }
      }

      // Insert intents
      if (result.intents?.length) {
        const cleanedIntents = result.intents
          .filter((i) => INTENT_TYPES.includes(i.intent_type))
          .map((i) => ({
            intent_type: i.intent_type,
            confidence_score: Math.min(1.0, Math.max(0.0, i.confidence_score)),
          }));

        if (cleanedIntents.length) {
          intentsSaved = await insertIntentStagingRows(title.id, cleanedIntents);
        }
      }

      if (emotionsSaved > 0 || intentsSaved > 0) {
        batchProcessed++;
        console.log(`✓ ${title.id}: ${emotionsSaved}e, ${intentsSaved}i`);
      }

      // Track last processed for cursor
      lastProcessedId = title.id;
    } catch (err) {
      console.error("Error processing title:", title.id, err);
    }
  });

  // Step 6: Update job progress
  if (batchProcessed > 0) {
    await incrementJobTitles(batchProcessed);
  }

  // Step 7: Save cursor for next batch
  if (lastProcessedId) {
    await saveCursor(lastProcessedId);
  }

  const elapsed = Date.now() - startTime;
  const hasMore = batch.length === BATCH_SIZE;
  
  console.log(`📊 Batch done: ${batchProcessed} titles in ${elapsed}ms. Has more: ${hasMore}`);

  return { processed: batchProcessed, hasMore };
}

// ---------------------------------------------------------------------
// Main handler - processes batch then chains to next
// ---------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  console.log(`▶ classify-title-ai invoked`);

  try {
    // Process one batch
    const { processed, hasMore } = await processClassificationBatch();

    // If there's more work, self-invoke for next batch
    if (hasMore) {
      // Don't await - let it chain asynchronously
      invokeNextBatch();
    }

    return new Response(
      JSON.stringify({ 
        message: hasMore ? `Processed ${processed}, continuing...` : `Completed (${processed} in final batch)`,
        processed,
        hasMore,
        status: "ok"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error in classify-title-ai:", err);
    await supabase
      .from("jobs")
      .update({ error_message: err?.message || "Unknown error", status: "failed" })
      .eq("job_type", JOB_TYPE);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
