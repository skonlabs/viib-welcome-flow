// supabase/functions/classify-title-emotions/index.ts
// ========================================================================
// ViiB — Emotional Batch Classification (Backend Job Pattern)
// ========================================================================
// Uses CURSOR-BASED pagination (id > last_id) for O(1) performance
// instead of offset-based which times out at high offsets
// ========================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);
const openai = new OpenAI({ apiKey: openaiKey });

const JOB_TYPE = "classify_emotions";
const BATCH_SIZE = 10;
const MAX_CONCURRENT = 3;
const MAX_TRANSCRIPT_CHARS = 4000;
const MAX_RUNTIME_MS = 85000;
// Note: We skip ALL titles that already have staging data (not time-based)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TitleRow {
  id: string;
  title_type: "movie" | "tv" | string | null;
  name: string | null;
  original_name: string | null;
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

interface ModelResponse {
  title: string;
  emotions: ModelEmotion[];
}

interface JobConfig {
  last_processed_id?: string | null; // Cursor-based: store last ID instead of offset
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
// Prompt builders
// ---------------------------------------------------------------------
function buildSystemPrompt(emotionLabels: string[]): string {
  return `You are an expert in emotional content modeling for movies and TV series.

Goal: Estimate which EMOTIONS a viewer experiences while watching, and intensity (1–10).

IMPORTANT WEIGHTING:
- IF trailer transcript provided: treat as PRIMARY signal (~80% weight)
- IF NO transcript: infer from overview, genres, title, tone

Emotional Vocabulary (USE THESE ONLY):
${emotionLabels.join(", ")}

Output: SINGLE JSON object, 3–15 emotions, intensity_level INTEGER 1-10.
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

Return ONLY JSON: { "title": "...", "emotions": [{ "emotion_label": "...", "intensity_level": N }, ...] }`;
}

// ---------------------------------------------------------------------
// AI classification
// ---------------------------------------------------------------------
async function classifyWithAI(title: TitleRow, emotionLabels: string[]): Promise<ModelResponse | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
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
// Insert staging rows (upsert to ignore duplicates)
// ---------------------------------------------------------------------
async function insertStagingRows(titleId: string, rows: ModelEmotion[], emotionLabelToId: Map<string, string>) {
  const payload = rows
    .filter((e) => emotionLabelToId.has(e.emotion_label))
    .map((e) => ({
      title_id: titleId,
      emotion_id: emotionLabelToId.get(e.emotion_label)!,
      intensity_level: e.intensity_level,
      source: "ai",
    }));

  if (!payload.length) return;

  const { error } = await supabase
    .from("title_emotional_signatures_staging")
    .upsert(payload, { onConflict: "title_id,emotion_id", ignoreDuplicates: true });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Background processing logic - staging table IS source of truth
// ---------------------------------------------------------------------
async function processClassificationBatch(): Promise<void> {
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
  
  const { count: stagedCount } = await supabase
    .from("title_emotional_signatures_staging")
    .select("title_id", { count: "exact", head: true });

  console.log(`Total titles: ${totalTitles}, Already staged: ${stagedCount}, Remaining: ${(totalTitles || 0) - (stagedCount || 0)}`);

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

  // Continuous batch processing within time limit
  while (Date.now() - startTime < MAX_RUNTIME_MS) {
    // Check job status each batch
    const jobStatus = await getJobConfig();
    if (jobStatus?.status !== "running") {
      console.log("Job stopped by user, aborting.");
      return;
    }

    // Fetch titles that DO NOT exist in staging table
    // This is the ONLY correct way - staging IS the source of truth
    const { data: batch, error: fetchError } = await supabase
      .from("titles")
      .select("id, name, overview, trailer_transcript")
      .not("id", "in", `(SELECT title_id FROM title_emotional_signatures_staging)`)
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("Error fetching unclassified titles:", fetchError);
      return;
    }

    // No more unprocessed titles - we're done!
    if (!batch || batch.length === 0) {
      console.log("All titles have been classified!");
      await markJobComplete();
      return;
    }

    console.log(`Processing batch of ${batch.length} unclassified titles...`);
    let batchProcessed = 0;

    await runWithConcurrency(batch as TitleRow[], MAX_CONCURRENT, async (title) => {
      const label = title.name ?? title.id;
      console.log(`→ Classifying ${label}`);

      try {
        const result = await classifyWithAI(title, emotionLabels);
        if (!result?.emotions?.length) return;

        const cleaned = result.emotions
          .filter((e) => emotionLabels.includes(e.emotion_label))
          .map((e) => ({
            emotion_label: e.emotion_label,
            intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
          }));

        if (cleaned.length) {
          await insertStagingRows(title.id, cleaned, emotionLabelToId);
          batchProcessed++;
          console.log(`✓ Saved ${cleaned.length} emotions for ${title.id}`);
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

  console.log(`Batch complete. Processed: ${totalProcessed} titles.`);

  // Self-invoke for next batch if more work remains
  const { status: finalStatus } = await getJobConfig();
  if (finalStatus === "running") {
    console.log(`Self-invoking next batch...`);
    
    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/classify-title-emotions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ continuation: true }),
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
    
    // Continuation call - just continue processing
    if (body.continuation) {
      EdgeRuntime.waitUntil(processClassificationBatch());
      return new Response(
        JSON.stringify({ message: "Continuation batch started" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initial call - start fresh
    console.log("▶ classify-title-emotions job started (fresh run)");
    
    EdgeRuntime.waitUntil(processClassificationBatch());

    return new Response(
      JSON.stringify({ 
        message: "Classification job started in background",
        status: "running"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error starting classify-title-emotions:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
