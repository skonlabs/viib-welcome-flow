// ============================================================================
// ViiB — Combined AI Classification (Emotions + Intents) - FIXED
// ============================================================================
// FIXES:
// - Cursor only advances when titles are successfully classified
// - Job fails if entire batch fails (not silent)
// - Better error handling and logging
// - Self-invoke with proper error handling
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
const BATCH_SIZE = 50;
const CONCURRENT_AI_CALLS = 20;
const MAX_TRANSCRIPT_CHARS = 6000;
const AI_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTENT_TYPES = [
  "adrenaline_rush",
  "background_passive",
  "comfort_escape",
  "deep_thought",
  "discovery",
  "emotional_release",
  "family_bonding",
  "light_entertainment",
] as const;

type IntentType = (typeof INTENT_TYPES)[number];

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

interface ProcessedResult {
  titleId: string;
  emotions: Array<{ title_id: string; emotion_id: string; intensity_level: number; source: string }>;
  intents: Array<{ title_id: string; intent_type: IntentType; confidence_score: number; source: string }>;
}

let emotionVocabularyCache: {
  labels: string[];
  labelToId: Map<string, string>;
  timestamp: number;
} | null = null;

const EMOTION_CACHE_TTL = 60 * 60 * 1000;

// ---------------------------------------------------------------------
// Job helpers
// ---------------------------------------------------------------------
async function getJobConfig(): Promise<{ status: string; config: JobConfig }> {
  const { data } = await supabase.from("jobs").select("status, configuration").eq("job_type", JOB_TYPE).single();
  return {
    status: data?.status ?? "idle",
    config: (data?.configuration as JobConfig) ?? {},
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
  
  // Trigger promote job when classification is complete
  console.log("🔄 Classification complete, triggering promote-title-ai...");
  try {
    await supabase.functions.invoke("promote-title-ai", { body: {} });
    console.log("✅ Promote job triggered successfully");
  } catch (err) {
    console.error("⚠️ Failed to trigger promote job:", err);
  }
}

async function markJobFailed(error: string): Promise<void> {
  await supabase
    .from("jobs")
    .update({ status: "failed", error_message: error })
    .eq("job_type", JOB_TYPE);
}

// FIXED: Only save cursor when we have successfully processed titles
async function saveCursor(cursor: string): Promise<void> {
  console.log(`💾 Saving cursor: ${cursor}`);
  await supabase
    .from("jobs")
    .update({ configuration: { last_processed_id: cursor } })
    .eq("job_type", JOB_TYPE);
}

async function getEmotionVocabulary(): Promise<{
  labels: string[];
  labelToId: Map<string, string>;
}> {
  const now = Date.now();

  if (emotionVocabularyCache && now - emotionVocabularyCache.timestamp < EMOTION_CACHE_TTL) {
    console.log("✅ Using cached emotion vocabulary");
    return {
      labels: emotionVocabularyCache.labels,
      labelToId: emotionVocabularyCache.labelToId,
    };
  }

  console.log("🔄 Loading emotion vocabulary from DB...");
  const { data: emotions, error: emoErr } = await supabase
    .from("emotion_master")
    .select("id, emotion_label")
    .eq("category", "content_state");

  if (emoErr || !emotions?.length) {
    console.error("Failed to load emotion_master:", emoErr);
    throw new Error("Failed to load emotion vocabulary");
  }

  const labelToId = new Map<string, string>();
  const labels: string[] = [];

  for (const e of emotions as EmotionRow[]) {
    labels.push(e.emotion_label);
    labelToId.set(e.emotion_label, e.id);
  }

  emotionVocabularyCache = { labels, labelToId, timestamp: now };

  return { labels, labelToId };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.allSettled(chunk.map((item) => worker(item)));
    results.push(...chunkResults);
  }

  return results;
}

// ---------------------------------------------------------------------
// Combined Prompt builders
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
${hasTranscript ? t.trailer_transcript!.slice(0, MAX_TRANSCRIPT_CHARS) : t.overview || "(no overview)"}

Return ONLY JSON: { "title": "...", "emotions": [...], "intents": [...] }`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI call timeout")), timeoutMs)),
  ]);
}

async function classifyWithRetry(
  title: TitleRow,
  emotionLabels: string[],
  retries = MAX_RETRIES,
): Promise<ModelResponse | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(classifyWithAI(title, emotionLabels), AI_TIMEOUT_MS);
    } catch (err) {
      if (attempt === retries) {
        console.error(`❌ AI failed after ${retries + 1} attempts:`, title.id, err);
        return null;
      }
      console.warn(`⚠️ AI retry ${attempt + 1}/${retries} for:`, title.id);
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  return null;
}

async function classifyWithAI(title: TitleRow, emotionLabels: string[]): Promise<ModelResponse | null> {
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
  return raw ? (JSON.parse(raw) as ModelResponse) : null;
}

function prepareInsertData(
  titleId: string,
  result: ModelResponse,
  emotionLabelToId: Map<string, string>,
  emotionLabels: string[],
): ProcessedResult {
  const emotions: ProcessedResult["emotions"] = [];
  const intents: ProcessedResult["intents"] = [];

  if (result.emotions?.length) {
    for (const e of result.emotions) {
      if (emotionLabels.includes(e.emotion_label)) {
        const emotionId = emotionLabelToId.get(e.emotion_label);
        if (emotionId) {
          emotions.push({
            title_id: titleId,
            emotion_id: emotionId,
            intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
            source: "ai",
          });
        }
      }
    }
  }

  if (result.intents?.length) {
    for (const i of result.intents) {
      if (INTENT_TYPES.includes(i.intent_type)) {
        intents.push({
          title_id: titleId,
          intent_type: i.intent_type,
          confidence_score: Math.min(1.0, Math.max(0.0, i.confidence_score)),
          source: "ai",
        });
      }
    }
  }

  return { titleId, emotions, intents };
}

async function bulkInsertEmotions(emotionRows: ProcessedResult["emotions"]): Promise<number> {
  if (!emotionRows.length) return 0;

  const { error, count } = await supabase
    .from("viib_emotion_classified_titles_staging")
    .upsert(emotionRows, { onConflict: "title_id,emotion_id", ignoreDuplicates: true, count: "exact" });

  if (error) {
    console.error("Error bulk inserting emotions:", error);
    throw error;
  }

  return count || emotionRows.length;
}

async function bulkInsertIntents(intentRows: ProcessedResult["intents"]): Promise<number> {
  if (!intentRows.length) return 0;

  const { error, count } = await supabase
    .from("viib_intent_classified_titles_staging")
    .upsert(intentRows, { onConflict: "title_id,intent_type", ignoreDuplicates: true, count: "exact" });

  if (error) {
    console.error("Error bulk inserting intents:", error);
    throw error;
  }

  return count || intentRows.length;
}

// FIXED: Self-invoke with proper error handling
async function invokeNextBatch(): Promise<boolean> {
  try {
    console.log("🔄 Self-invoking for next batch...");
    const response = await supabase.functions.invoke("classify-title-ai", {
      body: { continuation: true },
    });
    
    if (response.error) {
      console.error("Self-invoke returned error:", response.error);
      return false;
    }
    
    console.log("✅ Self-invoke successful");
    return true;
  } catch (err) {
    console.error("Failed to self-invoke:", err);
    return false;
  }
}

// ---------------------------------------------------------------------
// Main processing logic - FIXED
// ---------------------------------------------------------------------
async function processClassificationBatch(): Promise<{ processed: number; hasMore: boolean; error?: string }> {
  const startTime = Date.now();

  // Step 1: Check job status
  const { status, config } = await getJobConfig();

  if (status !== "running") {
    console.log(`Job status is '${status}', exiting.`);
    return { processed: 0, hasMore: false };
  }

  const cursor = config.last_processed_id || null;
  console.log(`📦 Starting batch with cursor: ${cursor || "(none)"}`);

  // Step 2: Load emotion vocabulary (CACHED)
  const { labels: emotionLabels, labelToId: emotionLabelToId } = await getEmotionVocabulary();

  // Step 3: Fetch batch of titles needing classification
  const { data: batch, error: fetchError } = await supabase.rpc("get_titles_needing_classification", {
    p_cursor: cursor,
    p_limit: BATCH_SIZE,
  });

  if (fetchError) {
    console.error("Error fetching titles:", fetchError);
    return { processed: 0, hasMore: false, error: `Fetch error: ${fetchError.message}` };
  }

  if (!batch || batch.length === 0) {
    console.log("✅ No more titles to classify!");
    await markJobComplete();
    return { processed: 0, hasMore: false };
  }

  console.log(`📊 Processing ${batch.length} titles with ${CONCURRENT_AI_CALLS} concurrent AI calls...`);

  // Step 4: Re-check job status before processing
  const jobStatus = await getJobConfig();
  if (jobStatus?.status !== "running") {
    console.log("⚠️ Job stopped by user, aborting.");
    return { processed: 0, hasMore: false };
  }

  // Step 5: Process batch with AI
  const aiStartTime = Date.now();
  let aiFailures = 0;
  let emptyResults = 0;

  const results = await runWithConcurrency(batch as TitleRow[], CONCURRENT_AI_CALLS, async (title) => {
    const result = await classifyWithRetry(title, emotionLabels);
    if (!result) {
      console.warn(`⚠️ AI returned null for: ${title.id} (${title.name || 'no name'})`);
      throw new Error(`AI classification failed for ${title.id}`);
    }
    if ((!result.emotions || result.emotions.length === 0) && (!result.intents || result.intents.length === 0)) {
      console.warn(`⚠️ AI returned empty for: ${title.id} (${title.name || 'no name'}) - overview: ${(title.overview || '').slice(0, 50) || '(empty)'}`);
    }
    return { title, result };
  });

  const aiDuration = Date.now() - aiStartTime;
  console.log(`⏱️ AI calls completed in ${aiDuration}ms (${Math.round(aiDuration / batch.length)}ms avg)`);

  // Step 6: Process results and prepare bulk insert data
  const allEmotions: ProcessedResult["emotions"] = [];
  const allIntents: ProcessedResult["intents"] = [];
  let successCount = 0;
  const processedTitleIds: string[] = [];
  const successfulTitleIds: string[] = []; // FIXED: Track only successful ones for cursor

  for (const settledResult of results) {
    if (settledResult.status === "fulfilled") {
      const { title, result } = settledResult.value;
      const processed = prepareInsertData(title.id, result, emotionLabelToId, emotionLabels);

      if (processed.emotions.length > 0 || processed.intents.length > 0) {
        allEmotions.push(...processed.emotions);
        allIntents.push(...processed.intents);
        successCount++;
        successfulTitleIds.push(title.id);
      } else {
        emptyResults++;
        console.log(`📝 Marking ${title.id} (${title.name}) as processed despite empty AI result`);
      }
      processedTitleIds.push(title.id);
    } else {
      aiFailures++;
      console.error("❌ Processing failed:", settledResult.reason);
    }
  }

  console.log(`📊 Batch stats: ${successCount} success, ${emptyResults} empty, ${aiFailures} failures`);

  // FIXED: If ALL titles failed, report error instead of silently continuing
  if (successCount === 0 && emptyResults === 0) {
    const errorMsg = `Entire batch failed: ${aiFailures} AI failures out of ${batch.length} titles`;
    console.error(`❌ ${errorMsg}`);
    await markJobFailed(errorMsg);
    return { processed: 0, hasMore: false, error: errorMsg };
  }

  // Step 6b: Mark empty-result titles as classified
  if (emptyResults > 0) {
    const emptyTitleIds = processedTitleIds.filter(id => 
      !allEmotions.some(e => e.title_id === id) && !allIntents.some(i => i.title_id === id)
    );
    
    if (emptyTitleIds.length > 0) {
      const placeholderEmotions = emptyTitleIds.map(titleId => ({
        title_id: titleId,
        emotion_id: emotionLabelToId.get(emotionLabels[0])!,
        intensity_level: 1,
        source: "ai_empty",
      }));
      
      const placeholderIntents = emptyTitleIds.map(titleId => ({
        title_id: titleId,
        intent_type: "light_entertainment" as IntentType,
        confidence_score: 0.5,
        source: "ai_empty",
      }));
      
      await Promise.all([
        supabase
          .from("viib_emotion_classified_titles_staging")
          .upsert(placeholderEmotions, { onConflict: "title_id,emotion_id", ignoreDuplicates: true }),
        supabase
          .from("viib_intent_classified_titles_staging")
          .upsert(placeholderIntents, { onConflict: "title_id,intent_type", ignoreDuplicates: true }),
      ]);
      
      console.log(`📝 Inserted ${emptyTitleIds.length} placeholder records for empty AI results`);
    }
  }

  // Step 7: Bulk insert all data in PARALLEL
  if (allEmotions.length > 0 || allIntents.length > 0) {
    const dbStartTime = Date.now();

    const [emotionCount, intentCount] = await Promise.all([
      bulkInsertEmotions(allEmotions),
      bulkInsertIntents(allIntents),
    ]);

    const dbDuration = Date.now() - dbStartTime;
    console.log(`💾 DB inserts: ${emotionCount} emotions + ${intentCount} intents in ${dbDuration}ms`);
  }

  // FIXED: Get the last title ID from the batch for cursor (not just successful ones)
  // This ensures we move past the batch even if some failed
  const lastBatchId = (batch as TitleRow[])[batch.length - 1]?.id;

  // Step 8: Update job progress and cursor
  const actualProcessed = successCount + emptyResults; // Count empty as processed too
  if (actualProcessed > 0 && lastBatchId) {
    await Promise.all([
      incrementJobTitles(actualProcessed),
      saveCursor(lastBatchId),
    ]);
  }

  const totalDuration = Date.now() - startTime;
  const hasMore = batch.length === BATCH_SIZE;

  console.log(`✅ Batch complete: ${actualProcessed}/${batch.length} titles in ${totalDuration}ms. Has more: ${hasMore}`);
  console.log(`   📈 Throughput: ${Math.round((actualProcessed / totalDuration) * 1000)} titles/sec`);

  return { processed: actualProcessed, hasMore };
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

  console.log(`▶️ classify-title-ai invoked`);

  try {
    const { processed, hasMore, error } = await processClassificationBatch();

    if (error) {
      return new Response(
        JSON.stringify({ error, processed, status: "failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // FIXED: Self-invoke with proper await and error handling
    if (hasMore) {
      const invokeSuccess = await invokeNextBatch();
      if (!invokeSuccess) {
        console.warn("⚠️ Self-invoke failed, job will need manual restart");
      }
    }

    return new Response(
      JSON.stringify({
        message: hasMore ? `Processed ${processed}, continuing...` : `Completed (${processed} in final batch)`,
        processed,
        hasMore,
        status: "ok",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("💥 Error in classify-title-ai:", err);
    await markJobFailed(err?.message || "Unknown error");
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
