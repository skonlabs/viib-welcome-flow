// supabase/functions/classify-title-emotions/index.ts
// ========================================================================
// ViiB — Optimized Emotional Batch Classification (Balanced Option B)
// ========================================================================
// Behavior:
// - maxConcurrent = 3 OpenAI calls at a time
// - default batchSize = 15 titles
// - IF trailer_transcript exists → PRIMARY emotional signal (~80% weight)
// - IF transcript missing → fallback to overview + genres + title + language
// - Works for both movies and series (series-level tone)
// - Writes to title_emotional_signatures_staging with source='ai'
// - Skips titles already staged by AI (source='ai')
//
// Required env vars:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - OPENAI_API_KEY
// ========================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);
const openai = new OpenAI({ apiKey: openaiKey });

const DEFAULT_BATCH_SIZE = 15;
const DEFAULT_MAX_CONCURRENT = 3;
const MAX_TRANSCRIPT_CHARS = 4000;

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
// Simple concurrency pool
// ---------------------------------------------------------------------
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  async function next(): Promise<void> {
    const index = i++;
    if (index >= items.length) return;
    results[index] = await worker(items[index], index);
    await next();
  }

  const workers: Promise<void>[] = [];
  const workerCount = Math.min(limit, items.length);
  for (let w = 0; w < workerCount; w++) {
    workers.push(next());
  }

  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------
// Prompt builders — transcript primary when present (Option 1)
// ---------------------------------------------------------------------
function buildSystemPrompt(emotionLabels: string[]): string {
  return `
You are an expert in emotional content modeling for movies and TV series.

Goal:
Estimate which EMOTIONS a typical viewer is likely to experience while watching
this title, and how strongly (1–10).

Input you may receive:
- Basic metadata (title, type, language)
- Plot overview (sometimes missing or short)
- Trailer transcript (sometimes missing)
- Genres

IMPORTANT WEIGHTING LOGIC:
- IF a trailer transcript is provided and not empty:
  • Treat the transcript as the PRIMARY emotional signal (~80% weight).
  • The overview and genres are only secondary, supporting context.
- IF NO trailer transcript is provided:
  • Infer emotions from overview, genres, title, and implied tone.

For TV SERIES:
- Model the overall series-level emotional tone, not just a single episode.

Emotional Vocabulary (USE THESE ONLY):
${emotionLabels.join(", ")}

Output rules:
- Always return a SINGLE JSON object.
- Use 3–15 distinct emotions.
- intensity_level must be an INTEGER between 1 and 10.
- DO NOT invent emotion labels outside the given vocabulary.
- DO NOT output any explanation text. Only JSON.
`;
}

function buildUserPrompt(t: TitleRow): string {
  const hasTranscript = !!t.trailer_transcript && t.trailer_transcript.trim().length > 0;

  const overviewText = t.overview?.trim().length ? t.overview : "(no overview provided)";

  const transcriptText = hasTranscript
    ? t.trailer_transcript!.slice(0, MAX_TRANSCRIPT_CHARS)
    : "(no trailer transcript available)";

  const genres = Array.isArray(t.title_genres) ? t.title_genres.filter(Boolean) : [];
  const genreText = genres.length ? genres.join(", ") : "(no genres available)";

  const typeLabel = t.title_type === "tv" ? "TV SERIES (series-level tone)" : "MOVIE";

  const transcriptInstruction = hasTranscript
    ? `A trailer transcript IS provided and should be treated as the PRIMARY emotional signal (~80% weight). Use overview and genres only as secondary refinement.`
    : `NO trailer transcript is available. You MUST infer emotions from overview, genres, title, language, and implied tone.`;

  return `
Title Type: ${typeLabel}
Title: ${t.name ?? "(unknown)"}
Original Name: ${t.original_name ?? "(unknown)"}
Original Language: ${t.original_language ?? "(unknown)"}
Genres: ${genreText}

Instructions regarding transcript:
${transcriptInstruction}

Overview (secondary if transcript exists; primary if transcript missing):
${overviewText}

Trailer Transcript:
${transcriptText}

Return ONLY a JSON object like:
{
  "title": "<title text>",
  "emotions": [
    { "emotion_label": "<allowed label>", "intensity_level": <1-10> },
    ...
  ]
}
`;
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
    if (!raw) {
      console.error("No content in AI response for title:", title.id);
      return null;
    }

    return JSON.parse(raw) as ModelResponse;
  } catch (err) {
    console.error("AI error for title:", title.id, err);
    return null;
  }
}

// ---------------------------------------------------------------------
// Insert staging rows - need to map emotion_label to emotion_id
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

  if (!payload.length) {
    console.warn("No valid emotion mappings for title:", titleId);
    return;
  }

  const { error } = await supabase.from("title_emotional_signatures_staging").insert(payload);

  if (error) {
    console.error("Error inserting staging rows for title:", titleId, error);
    throw error;
  }
}

// ---------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const batchSize: number = body.batchSize ?? DEFAULT_BATCH_SIZE;
    const maxConcurrent: number = body.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;

    console.log(`▶ classify-title-emotions (optimized) — batchSize=${batchSize}, maxConcurrent=${maxConcurrent}`);

    // 1) Load emotion_master (content_state only) - need both id and label
    const { data: emotions, error: emoErr } = await supabase
      .from("emotion_master")
      .select("id, emotion_label")
      .eq("category", "content_state");

    if (emoErr || !emotions || emotions.length === 0) {
      console.error("Failed to load emotion_master:", emoErr);
      return new Response(JSON.stringify({ error: "Failed to load emotion_master" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emotionLabelToId = new Map<string, string>();
    const emotionLabels: string[] = [];
    for (const e of emotions as EmotionRow[]) {
      emotionLabels.push(e.emotion_label);
      emotionLabelToId.set(e.emotion_label, e.id);
    }
    console.log(`Loaded ${emotionLabels.length} content_state emotions.`);

    // 2) Load candidate titles (movies + series) with genres
    const { data: titles, error: titleErr } = await supabase
      .from("titles")
      .select(
        `
        id,
        title_type,
        name,
        original_name,
        overview,
        trailer_transcript,
        original_language,
        title_genres
      `,
      )
      .order("created_at", { ascending: false })
      .limit(batchSize * 4);

    if (titleErr || !titles || titles.length === 0) {
      console.error("Failed to load titles or none found:", titleErr);
      return new Response(JSON.stringify({ error: "Failed to load titles or none found" }), { status: 500 });
    }

    const candidateIds = (titles as TitleRow[]).map((t) => t.id);

    // 3) Find titles already classified by AI in staging
    const { data: staged, error: stagedErr } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id")
      .in("title_id", candidateIds)
      .eq("source", "ai");

    if (stagedErr) {
      console.error("Failed to load staging info:", stagedErr);
      return new Response(JSON.stringify({ error: "Failed to load staging info" }), { status: 500 });
    }

    const stagedIds = new Set((staged ?? []).map((s: any) => s.title_id));

    // 4) Filter to titles without AI staging yet
    const filtered: TitleRow[] = (titles as TitleRow[]).filter((t) => !stagedIds.has(t.id));

    if (!filtered.length) {
      console.log("No new titles to classify. All candidates already staged.");
      return new Response(
        JSON.stringify({
          message: "No new titles to classify.",
          processed: 0,
          errors: {},
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const batch: TitleRow[] = filtered.slice(0, batchSize);
    console.log(`Found ${filtered.length} candidates, processing batch of ${batch.length}.`);

    let processed = 0;
    const errors: Record<string, string> = {};

    // 5) Process titles with limited concurrency
    await runWithConcurrency(batch, maxConcurrent, async (title) => {
      const label = title.name ?? title.original_name ?? `${title.id} (${title.title_type ?? "unknown"})`;

      console.log(
        `→ Classifying [${title.title_type}] ${label} — transcript: ${
          title.trailer_transcript && title.trailer_transcript.trim().length ? "YES" : "NO"
        }`,
      );

      try {
        const result = await classifyWithAI(title, emotionLabels);

        if (!result || !Array.isArray(result.emotions)) {
          const msg = "Invalid or empty AI response";
          console.error(msg, "for title:", title.id);
          errors[title.id] = msg;
          return;
        }

        const cleaned: ModelEmotion[] = result.emotions
          .filter((e) => emotionLabels.includes(e.emotion_label))
          .map((e) => ({
            emotion_label: e.emotion_label,
            intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
          }));

        if (!cleaned.length) {
          const msg = "No valid emotions after mapping to emotion_master vocabulary";
          console.error(msg, "for title:", title.id);
          errors[title.id] = msg;
          return;
        }

        await insertStagingRows(title.id, cleaned, emotionLabelToId);
        processed++;
        console.log(`✓ Saved ${cleaned.length} emotion rows for title_id=${title.id}`);
      } catch (err: any) {
        const msg = err?.message ?? "Unknown error";
        console.error("Error processing title:", title.id, err);
        errors[title.id] = msg;
      }
    });

    // 6) Return summary
    return new Response(
      JSON.stringify(
        {
          message: "Optimized emotional classification batch complete",
          processed,
          errors,
        },
        null,
        2,
      ),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("Unhandled error in classify-title-emotions:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
