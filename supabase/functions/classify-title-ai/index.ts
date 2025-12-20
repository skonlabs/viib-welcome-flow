// ============================================================================
// ViiB — Combined AI Classification (Emotions + Intents in ONE API call)
// ============================================================================
// Uses efficient SQL function to fetch ONLY titles needing classification
// Eliminates wasteful "check 30 to find 1-4" pattern - direct query returns work
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);
const openai = new OpenAI({ apiKey: openaiKey });

const JOB_TYPE = "classify_ai";
const CONCURRENT_AI_CALLS = 5;   // Process 5 titles in parallel with OpenAI
const MAX_TRANSCRIPT_CHARS = 4000;
const MAX_RUNTIME_MS = 50000;    // Keep under 60s edge function limit

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
// Main processing logic
// Fetches ALL titles needing classification, then processes them
// ---------------------------------------------------------------------
async function processClassificationBatch(): Promise<void> {
  const startTime = Date.now();
  const timings: { step: string; ms: number }[] = [];
  
  const logTiming = (step: string, stepStart: number) => {
    const elapsed = Date.now() - stepStart;
    timings.push({ step, ms: elapsed });
    console.log(`⏱️ ${step}: ${elapsed}ms`);
  };

  // Step 1: Check job status
  let stepStart = Date.now();
  const { status } = await getJobConfig();
  logTiming("1. getJobConfig", stepStart);
  
  if (status !== "running") {
    console.log("Job not running, exiting.");
    return;
  }

  // Step 2: Get total count (for progress tracking)
  stepStart = Date.now();
  const { count: totalTitles } = await supabase
    .from("titles")
    .select("id", { count: "exact", head: true });
  logTiming("2. Count total titles", stepStart);

  console.log(`Total titles in catalog: ${totalTitles}`);

  // Step 3: Load emotion vocabulary
  stepStart = Date.now();
  const { data: emotions, error: emoErr } = await supabase
    .from("emotion_master")
    .select("id, emotion_label")
    .eq("category", "content_state");
  logTiming("3. Load emotion_master", stepStart);

  if (emoErr || !emotions?.length) {
    console.error("Failed to load emotion_master:", emoErr);
    return;
  }

  const emotionLabelToId = new Map<string, string>();
  const emotionLabels: string[] = [];
  for (const e of emotions as EmotionRow[]) {
    emotionLabels.push(e.emotion_label);
    emotionLabelToId.set(e.emotion_label, e.id);
  }

  let totalProcessed = 0;

  // Step 4: Fetch ALL titles needing classification (single RPC call, no limit)
  stepStart = Date.now();
  const { data: allTitles, error: fetchError } = await supabase
    .rpc("get_titles_needing_classification", {
      p_cursor: null,
      p_limit: null  // Fetch ALL titles at once
    });
  logTiming("4. get_titles_needing_classification RPC", stepStart);

  if (fetchError) {
    console.error("Error fetching titles:", fetchError);
    return;
  }

  if (!allTitles || allTitles.length === 0) {
    console.log("No more titles to classify!");
    await markJobComplete();
    return;
  }

  console.log(`Got ${allTitles.length} titles to classify`);

  // Step 5: Re-check job status before processing
  stepStart = Date.now();
  const jobStatus = await getJobConfig();
  logTiming("5. Re-check job status", stepStart);
  
  if (jobStatus?.status !== "running") {
    console.log("Job stopped by user, aborting.");
    return;
  }

  console.log(`Processing ${allTitles.length} titles with CONCURRENT_AI_CALLS=${CONCURRENT_AI_CALLS}...`);
  let batchProcessed = 0;

  // Step 6: Process all titles with AI (concurrent)
  stepStart = Date.now();
  await runWithConcurrency(allTitles as TitleRow[], CONCURRENT_AI_CALLS, async (title) => {
    const label = title.name ?? title.id;
    const titleStart = Date.now();

    try {
      // AI call timing
      const aiStart = Date.now();
      const result = await classifyWithAI(title, emotionLabels);
      console.log(`  ⏱️ AI call for ${label}: ${Date.now() - aiStart}ms`);
      
      if (!result) return;

      let emotionsSaved = 0;
      let intentsSaved = 0;

      // Emotion insert timing
      if (result.emotions?.length) {
        const cleanedEmotions = result.emotions
          .filter((e) => emotionLabels.includes(e.emotion_label))
          .map((e) => ({
            emotion_label: e.emotion_label,
            intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
          }));

        if (cleanedEmotions.length) {
          const insertStart = Date.now();
          emotionsSaved = await insertEmotionStagingRows(title.id, cleanedEmotions, emotionLabelToId);
          console.log(`  ⏱️ Insert emotions for ${label}: ${Date.now() - insertStart}ms`);
        }
      }

      // Intent insert timing
      if (result.intents?.length) {
        const cleanedIntents = result.intents
          .filter((i) => INTENT_TYPES.includes(i.intent_type))
          .map((i) => ({
            intent_type: i.intent_type,
            confidence_score: Math.min(1.0, Math.max(0.0, i.confidence_score)),
          }));

        if (cleanedIntents.length) {
          const insertStart = Date.now();
          intentsSaved = await insertIntentStagingRows(title.id, cleanedIntents);
          console.log(`  ⏱️ Insert intents for ${label}: ${Date.now() - insertStart}ms`);
        }
      }

      if (emotionsSaved > 0 || intentsSaved > 0) {
        batchProcessed++;
        console.log(`✓ ${title.id}: ${emotionsSaved} emotions, ${intentsSaved} intents (total: ${Date.now() - titleStart}ms)`);
      }
    } catch (err) {
      console.error("Error processing title:", title.id, err);
    }
  });
  logTiming("6. Process all titles (AI + inserts)", stepStart);

  // Step 7: Increment job counter
  if (batchProcessed > 0) {
    stepStart = Date.now();
    await incrementJobTitles(batchProcessed);
    logTiming("7. incrementJobTitles", stepStart);
    totalProcessed += batchProcessed;
  }

  // Print timing summary
  console.log("\n📊 TIMING SUMMARY:");
  console.log("─".repeat(40));
  for (const t of timings) {
    console.log(`${t.step.padEnd(35)} ${t.ms}ms`);
  }
  console.log("─".repeat(40));
  console.log(`TOTAL: ${Date.now() - startTime}ms`);
  console.log(`Processed: ${totalProcessed} titles`);

  // All titles processed - mark job complete
  console.log("All titles classified, marking job complete.");
  await markJobComplete();
}

// ---------------------------------------------------------------------
// Main handler - Responds immediately, processes in background
// ---------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  console.log(`▶ classify-title-ai invoked`);
  
  // Run processing in background - don't await
  EdgeRuntime.waitUntil(
    processClassificationBatch().catch((err) => {
      console.error("Error in background classification:", err);
      // Save error to job for visibility
      supabase
        .from("jobs")
        .update({ error_message: err?.message || "Unknown error", status: "failed" })
        .eq("job_type", JOB_TYPE);
    })
  );

  // Respond immediately
  return new Response(
    JSON.stringify({ 
      message: "Classification job started in background",
      status: "processing"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
