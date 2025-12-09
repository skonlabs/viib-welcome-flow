// supabase/functions/classify-title-emotions/index.ts
// ========================================================================
// ViiB — Emotional Batch Classification (Movies + Series + Transcript-aware)
// ========================================================================
// Behavior (Option 1):
// - IF trailer_transcript exists → it is the PRIMARY emotional signal.
// - IF trailer_transcript is missing/empty → fall back to overview/title/etc.
// - Supports both movies and series (series-level emotional tone).
// - Writes results to title_emotional_signatures_staging with source = 'ai'.
// - Skips titles that already have AI staging rows.
//
// Required env vars (set in Supabase project):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - OPENAI_API_KEY
// ========================================================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

interface TitleRow {
  id: string;
  title_type: "movie" | "series";
  name: string | null;
  original_name: string | null;
  overview: string | null;
  trailer_transcript: string | null;
  original_language: string | null;
}

interface EmotionRow {
  label: string;
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
// Prompt builders
// ---------------------------------------------------------------------

/**
 * System prompt defines the global rules and how to use transcript vs overview.
 * Option 1: transcript is primary when available.
 */
function buildSystemPrompt(emotionLabels: string[]): string {
  return `
You are an expert in emotional content modeling for movies and TV series.

Goal:
Estimate which EMOTIONS a typical viewer is likely to experience while watching
this title, and how strongly (1-10).

You will be given:
- Basic metadata (title, type)
- Plot overview (may be missing or short)
- Trailer transcript (may or may not be present)

VERY IMPORTANT RULES (Option 1 behavior):
- IF a trailer transcript is provided and not empty:
  - Treat it as the PRIMARY emotional signal (~80% weight).
  - Use the overview only to supplement or refine.
- IF NO trailer transcript is provided:
  - Infer emotions from the overview, title, language, and implicit genre cues.
- For SERIES: model the overall emotional tone of the series,
  as implied by the description/transcript, not just one episode.

Emotional Vocabulary (USE THESE ONLY):
${emotionLabels.join(", ")}

Output:
- Always return VALID JSON.
- Use 3–15 emotions.
- intensity_level must be an integer 1–10.
- DO NOT invent new emotion labels.
- DO NOT output any explanation text, only the JSON object.
`;
}

/**
 * User prompt is built per title. It explicitly indicates whether
 * transcript is present or missing, and how the model should treat that.
 */
function buildUserPrompt(t: TitleRow): string {
  const hasTranscript = !!t.trailer_transcript && t.trailer_transcript.trim().length > 0;
  const overviewText = t.overview ?? "(no overview provided)";
  const transcriptText = hasTranscript
    ? t.trailer_transcript!.slice(0, 5000) // safety cap
    : "(no trailer transcript available)";

  const typeLabel = t.title_type === "series" ? "TV SERIES (series-level tone)" : "MOVIE";

  const transcriptInstruction = hasTranscript
    ? `A trailer transcript IS provided below. Treat it as the PRIMARY emotional signal (~80% weight).`
    : `NO trailer transcript is available. You MUST infer emotions from the overview, title, type, and any implied genre cues.`;

  return `
Title Type: ${typeLabel}
Title: ${t.name ?? "(unknown)"}
Original Title: ${t.original_name ?? "(unknown)"}
Original Language: ${t.original_language ?? "(unknown)"}

Instructions about transcript:
${transcriptInstruction}

Overview (secondary signal, if transcript exists; primary if transcript missing):
${overviewText}

Trailer Transcript:
${transcriptText}

Return ONLY a JSON object in this shape:
{
  "title": "<title text>",
  "emotions": [
    { "emotion_label": "<one of allowed labels>", "intensity_level": <1-10> },
    ...
  ]
}
`;
}

// ---------------------------------------------------------------------
// AI classifier
// ---------------------------------------------------------------------

async function classifyWithAI(title: TitleRow, emotionLabels: string[]): Promise<ModelResponse | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: buildSystemPrompt(emotionLabels) },
          { role: 'user', content: buildUserPrompt(title) },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      console.error("No content in AI response for title:", title.id);
      return null;
    }

    return JSON.parse(raw) as ModelResponse;
  } catch (err) {
    console.error("AI Error for title:", title.id, err);
    return null;
  }
}

// ---------------------------------------------------------------------
// Insert rows into staging
// ---------------------------------------------------------------------

async function insertStagingRows(titleId: string, rows: ModelEmotion[]) {
  const payload = rows.map((e) => ({
    title_id: titleId,
    emotion_label: e.emotion_label,
    intensity_level: e.intensity_level,
    source: "ai",
  }));

  const { error } = await supabase.from("title_emotional_signatures").insert(payload);

  if (error) {
    console.error("Error inserting staging rows for title:", titleId, error);
    throw error;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const batchSize: number = body.batchSize ?? 10;

    console.log(`▶ classify-title-emotions: batchSize=${batchSize}`);

    // 1) Load emotion_master (content_tone only)
    const { data: emotions, error: emoErr } = await supabase
      .from("emotion_master")
      .select("emotion_label")
      .eq("category", "content_tone");

    if (emoErr || !emotions || emotions.length === 0) {
      console.error("Failed to load emotion_master:", emoErr);
      return new Response(JSON.stringify({ error: "Failed to load emotion_master" }), { status: 500, headers: corsHeaders });
    }

    const emotionLabels = emotions.map((e: any) => e.emotion_label);
    console.log(`Loaded ${emotionLabels.length} content_tone emotions.`);

    // 2) Load candidate titles (movies + series)
    const { data: titles, error: titleErr } = await supabase
      .from("titles")
      .select(
        "id, title_type, name, original_name, overview, trailer_transcript, original_language, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(batchSize * 3);

    if (titleErr || !titles || titles.length === 0) {
      console.error("Failed to load titles or none found:", titleErr);
      return new Response(JSON.stringify({ error: "Failed to load titles or none found" }), { status: 500, headers: corsHeaders });
    }

    const ids = titles.map((t: any) => t.id);

    // 3) Skip titles that already have rows
    const { data: staged, error: stagedErr } = await supabase
      .from("title_emotional_signatures")
      .select("title_id")
      .in("title_id", ids);

    if (stagedErr) {
      console.error("Failed to load existing signatures:", stagedErr);
      return new Response(JSON.stringify({ error: "Failed to load existing signatures" }), { status: 500, headers: corsHeaders });
    }

    const stagedIds = new Set((staged ?? []).map((s: any) => s.title_id));
    const candidates: TitleRow[] = (titles as TitleRow[]).filter((t) => !stagedIds.has(t.id)).slice(0, batchSize);

    console.log(`Found ${candidates.length} new titles to classify (movies + series).`);

    let processed = 0;
    const errors: Record<string, string> = {};

    // 4) Sequentially classify each candidate title
    for (const title of candidates) {
      try {
        console.log(
          `→ Classifying [${title.title_type}] ${title.name ?? title.id} — transcript: ${
            title.trailer_transcript ? "YES" : "NO"
          }`,
        );
        const result = await classifyWithAI(title, emotionLabels);

        if (!result || !Array.isArray(result.emotions)) {
          errors[title.id] = "Invalid or empty AI response";
          continue;
        }

        // 5) Clean and validate model output
        const cleaned: ModelEmotion[] = result.emotions
          .filter((e) => emotionLabels.includes(e.emotion_label))
          .map((e) => ({
            emotion_label: e.emotion_label,
            intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
          }));

        if (!cleaned.length) {
          errors[title.id] = "No valid emotions survived mapping to emotion_master";
          continue;
        }

        await insertStagingRows(title.id, cleaned);
        processed++;
        console.log(`✓ Saved ${cleaned.length} emotion rows for title_id=${title.id}`);
      } catch (err: any) {
        console.error("Error processing title:", title.id, err);
        errors[title.id] = err?.message ?? "Unknown error";
      }
    }

    // 6) Return summary
    return new Response(
      JSON.stringify({
        message: "Batch emotional classification complete",
        processed,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
