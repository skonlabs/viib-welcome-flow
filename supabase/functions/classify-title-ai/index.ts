// ============================================================================
// ViiB — Combined AI Classification (Emotions + Intents in ONE API call)
// ============================================================================
// 50% cost savings: Input tokens sent once, both classifications returned
// Uses CURSOR-BASED pagination (id > last_id) for O(1) performance
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
const BATCH_SIZE = 10;
const MAX_CONCURRENT = 3;
const MAX_TRANSCRIPT_CHARS = 4000;
const MAX_RUNTIME_MS = 85000;

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
    .update({ status: "idle", error_message: null })
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
// Background processing logic
// Classifies titles NOT in EITHER primary table
// ---------------------------------------------------------------------
async function processClassificationBatch(cursor?: string): Promise<void> {
  const startTime = Date.now();
  
  // Check job status
  const { status } = await getJobConfig();
  if (status !== "running") {
    console.log("Job not running, exiting.");
    return;
  }

  // Get counts for progress tracking
  const { count: totalTitles } = await supabase
    .from("titles")
    .select("id", { count: "exact", head: true });

  console.log(`Total titles in catalog: ${totalTitles}`);

  // Load emotion vocabulary
  const { data: emotions, error: emoErr } = await supabase
    .from("emotion_master")
    .select("id, emotion_label")
    .eq("category", "content_state");

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
  let currentCursor: string | null = cursor || null;

  // Continuous batch processing within time limit
  while (Date.now() - startTime < MAX_RUNTIME_MS) {
    // Check job status each batch
    const jobStatus = await getJobConfig();
    if (jobStatus?.status !== "running") {
      console.log("Job stopped by user, aborting.");
      return;
    }

    // Get a batch of titles starting from cursor
    let query = supabase
      .from("titles")
      .select("id, name, title_type, overview, trailer_transcript, original_language, title_genres")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE * 3);

    if (currentCursor) {
      query = query.gt("id", currentCursor);
    }

    const { data: candidateTitles, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching titles:", fetchError);
      return;
    }

    if (!candidateTitles || candidateTitles.length === 0) {
      console.log("No more titles to check!");
      await markJobComplete();
      return;
    }

    // Check PRIMARY tables with updated_at to detect stale classifications (> 7 days old)
    const candidateIds = candidateTitles.map(t => t.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Check emotion primary table with updated_at
    const { data: emotionClassified } = await supabase
      .from("title_emotional_signatures")
      .select("title_id, updated_at")
      .in("title_id", candidateIds);
    
    // Check intent primary table with updated_at
    const { data: intentClassified } = await supabase
      .from("viib_intent_classified_titles")
      .select("title_id, updated_at")
      .in("title_id", candidateIds);

    // Build maps tracking both existence and staleness using updated_at
    const emotionDataMap = new Map<string, { exists: boolean; isStale: boolean }>();
    for (const r of (emotionClassified || [])) {
      const isStale = r.updated_at ? new Date(r.updated_at) < new Date(sevenDaysAgo) : false;
      emotionDataMap.set(r.title_id, { exists: true, isStale });
    }
    
    const intentDataMap = new Map<string, { exists: boolean; isStale: boolean }>();
    for (const r of (intentClassified || [])) {
      const isStale = r.updated_at ? new Date(r.updated_at) < new Date(sevenDaysAgo) : false;
      intentDataMap.set(r.title_id, { exists: true, isStale });
    }

    // A title needs processing if:
    // 1. Missing from emotion table OR missing from intent table, OR
    // 2. Either emotion OR intent classification is older than 7 days
    const needsProcessing = candidateTitles.filter(t => {
      const emotionData = emotionDataMap.get(t.id);
      const intentData = intentDataMap.get(t.id);
      
      const hasEmotion = emotionData?.exists ?? false;
      const hasIntent = intentData?.exists ?? false;
      const emotionIsStale = emotionData?.isStale ?? false;
      const intentIsStale = intentData?.isStale ?? false;
      
      // Process if missing from either table OR if either is stale
      return !hasEmotion || !hasIntent || emotionIsStale || intentIsStale;
    });

    const batch = needsProcessing.slice(0, BATCH_SIZE);
    
    // Update cursor to last candidate checked
    currentCursor = candidateTitles[candidateTitles.length - 1].id;

    console.log(`Checked ${candidateTitles.length}, needs processing: ${needsProcessing.length}, batch: ${batch.length}, cursor: ${currentCursor}`);

    // If this batch has nothing to process, continue to next cursor
    if (!batch || batch.length === 0) {
      console.log(`No titles to process in this range, continuing...`);
      continue;
    }

    console.log(`Processing batch of ${batch.length} titles with COMBINED AI call...`);
    let batchProcessed = 0;

    await runWithConcurrency(batch as TitleRow[], MAX_CONCURRENT, async (title) => {
      const label = title.name ?? title.id;
      console.log(`→ Classifying ${label} (emotions + intents)`);

      try {
        const result = await classifyWithAI(title, emotionLabels);
        if (!result) return;

        let emotionsSaved = 0;
        let intentsSaved = 0;

        // ALWAYS save BOTH to staging - promote job handles deduplication via primary table check
        // This ensures no title is missed for either classification
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
          console.log(`✓ ${title.id}: ${emotionsSaved} emotions, ${intentsSaved} intents saved`);
        }
      } catch (err) {
        console.error("Error processing title:", title.id, err);
      }
    });

    if (batchProcessed > 0) {
      await incrementJobTitles(batchProcessed);
      totalProcessed += batchProcessed;
    }

    // Small delay between batches
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Batch complete. Processed: ${totalProcessed}, cursor: ${currentCursor}`);

  // Self-invoke for next batch if more work remains
  const { status: finalStatus } = await getJobConfig();
  if (finalStatus === "running") {
    console.log(`Self-invoking next batch with cursor ${currentCursor}...`);
    
    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/classify-title-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ continuation: true, cursor: currentCursor }),
      }).catch((err) => console.error("Self-invoke failed:", err))
    );
  }
}

// ---------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Continuation call
    if (body.continuation) {
      EdgeRuntime.waitUntil(processClassificationBatch(body.cursor));
      return new Response(
        JSON.stringify({ message: "Continuation batch started", cursor: body.cursor }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initial call - start fresh
    console.log("▶ classify-title-ai job started (combined emotions + intents)");
    
    EdgeRuntime.waitUntil(processClassificationBatch());

    return new Response(
      JSON.stringify({ 
        message: "Combined AI classification job started in background",
        status: "running"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error starting classify-title-ai:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
