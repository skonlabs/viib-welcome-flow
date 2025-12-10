// supabase/functions/classify-title-emotions/index.ts
// ========================================================================
// ViiB — Emotional Batch Classification (Backend Job Pattern)
// ========================================================================
// Uses EdgeRuntime.waitUntil() for background processing
// Frontend invokes once, polls jobs table for status
// Self-invokes if more work remains
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
const MAX_RUNTIME_MS = 85000; // 85 seconds, leave buffer before 90s limit

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

// ---------------------------------------------------------------------
// Check if job is still running
// ---------------------------------------------------------------------
async function isJobRunning(): Promise<boolean> {
  const { data } = await supabase
    .from("jobs")
    .select("status")
    .eq("job_type", JOB_TYPE)
    .single();
  return data?.status === "running";
}

// ---------------------------------------------------------------------
// Update job progress
// ---------------------------------------------------------------------
async function incrementJobTitles(count: number): Promise<void> {
  await supabase.rpc("increment_job_titles", {
    p_job_type: JOB_TYPE,
    p_increment: count,
  });
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
// Insert staging rows
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

  const { error } = await supabase.from("title_emotional_signatures_staging").insert(payload);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Background processing logic
// ---------------------------------------------------------------------
async function processClassificationBatch(): Promise<void> {
  const startTime = Date.now();
  
  // Check job status
  if (!await isJobRunning()) {
    console.log("Job stopped by admin, exiting.");
    return;
  }

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
  console.log(`Loaded ${emotionLabels.length} content_state emotions.`);

  let totalProcessed = 0;

  // Continuous batch processing within time limit
  while (Date.now() - startTime < MAX_RUNTIME_MS) {
    // Check job status each batch
    if (!await isJobRunning()) {
      console.log("Job stopped, exiting batch loop.");
      break;
    }

    // Load candidate titles not yet classified
    const { data: titles, error: titleErr } = await supabase
      .from("titles")
      .select("id, title_type, name, original_name, overview, trailer_transcript, original_language, title_genres")
      .order("created_at", { ascending: false })
      .limit(BATCH_SIZE * 4);

    if (titleErr || !titles?.length) {
      console.log("No titles found or error:", titleErr);
      break;
    }

    const candidateIds = (titles as TitleRow[]).map((t) => t.id);

    // Find already staged
    const { data: staged } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id")
      .in("title_id", candidateIds)
      .eq("source", "ai");

    const stagedIds = new Set((staged ?? []).map((s: any) => s.title_id));
    const batch = (titles as TitleRow[]).filter((t) => !stagedIds.has(t.id)).slice(0, BATCH_SIZE);

    if (!batch.length) {
      console.log("No unclassified titles remaining in this batch.");
      break;
    }

    console.log(`Processing batch of ${batch.length} titles...`);
    let batchProcessed = 0;

    await runWithConcurrency(batch, MAX_CONCURRENT, async (title) => {
      const label = title.name ?? title.original_name ?? title.id;
      console.log(`→ Classifying [${title.title_type}] ${label}`);

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
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`Batch complete. Total processed: ${totalProcessed}`);

  // Check if more work exists and job still running
  if (await isJobRunning()) {
    const { count } = await supabase
      .from("titles")
      .select("id", { count: "exact", head: true });

    const { count: stagedCount } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id", { count: "exact", head: true })
      .eq("source", "ai");

    const remaining = (count ?? 0) - (stagedCount ?? 0);
    
    if (remaining > 0) {
      console.log(`${remaining} titles remaining. Self-invoking next batch...`);
      
      // Self-invoke for next batch
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
    } else {
      console.log("All titles classified. Job complete.");
      // Mark job as idle
      await supabase
        .from("jobs")
        .update({ status: "idle", error_message: null })
        .eq("job_type", JOB_TYPE);
    }
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
    
    // If this is a continuation call, just process
    if (body.continuation) {
      EdgeRuntime.waitUntil(processClassificationBatch());
      return new Response(
        JSON.stringify({ message: "Continuation batch started" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initial call - start background processing
    console.log("▶ classify-title-emotions job started");
    
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
