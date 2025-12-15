// ============================================================================
// ViiB — Intent Batch Classification (Backend Job Pattern)
// ============================================================================
// Classifies titles into viewing intents using OpenAI
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

const JOB_TYPE = "classify_intents";
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

interface ModelIntent {
  intent_type: IntentType;
  confidence_score: number;
}

interface ModelResponse {
  title: string;
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
// Prompt builders
// ---------------------------------------------------------------------
function buildSystemPrompt(): string {
  return `You are an expert in understanding viewer intent and motivation for watching movies and TV series.

Goal: Classify what VIEWING INTENT a title satisfies. Determine WHY someone would choose to watch this content.

INTENT TYPES (use ONLY these exact labels):
- adrenaline_rush: Action-packed, exciting, heart-pounding content that provides thrill and excitement
- background_passive: Light content suitable for background watching while doing other tasks
- comfort_escape: Familiar, cozy content for relaxation and emotional comfort
- deep_thought: Intellectually stimulating content that provokes thinking and reflection
- discovery: Educational or eye-opening content that teaches something new
- emotional_release: Content that allows cathartic emotional expression (crying, feeling deeply)
- family_bonding: Appropriate and enjoyable for watching together with family
- light_entertainment: Fun, easy-to-watch content for casual enjoyment

IMPORTANT WEIGHTING:
- IF trailer transcript provided: treat as PRIMARY signal (~80% weight)
- IF NO transcript: infer from overview, genres, title, tone

Output: SINGLE JSON object with 1-3 intents, confidence_score between 0.0 and 1.0.
DO NOT invent labels. Use ONLY the exact intent types listed above.
NO explanation text. Only JSON.`;
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

Return ONLY JSON: { "title": "...", "intents": [{ "intent_type": "...", "confidence_score": 0.X }, ...] }`;
}

// ---------------------------------------------------------------------
// AI classification
// ---------------------------------------------------------------------
async function classifyWithAI(title: TitleRow): Promise<ModelResponse | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: buildSystemPrompt() },
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
async function insertStagingRows(titleId: string, intents: ModelIntent[]) {
  const payload = intents
    .filter((i) => INTENT_TYPES.includes(i.intent_type))
    .map((i) => ({
      title_id: titleId,
      intent_type: i.intent_type,
      confidence_score: Math.min(1.0, Math.max(0.0, i.confidence_score)),
      source: "ai",
    }));

  if (!payload.length) return;

  const { error } = await supabase
    .from("viib_intent_classified_titles_staging")
    .upsert(payload, { onConflict: "title_id,intent_type", ignoreDuplicates: true });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Background processing logic
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
  
  // Count titles already classified in primary table
  const { count: classifiedCount } = await supabase
    .from("viib_intent_classified_titles")
    .select("title_id", { count: "exact", head: true });

  console.log(`Total titles: ${totalTitles}, Already classified: ${classifiedCount}`);

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

    // Check PRIMARY table (viib_intent_classified_titles) for these titles
    const candidateIds = candidateTitles.map(t => t.id);
    const { data: classifiedRecords } = await supabase
      .from("viib_intent_classified_titles")
      .select("title_id")
      .in("title_id", candidateIds);

    // Build set of title_ids that are already classified
    const classifiedSet = new Set<string>();
    for (const rec of classifiedRecords || []) {
      classifiedSet.add(rec.title_id);
    }

    // Process titles that are NOT in the primary table
    const batch = candidateTitles.filter(t => !classifiedSet.has(t.id)).slice(0, BATCH_SIZE);
    
    // Update cursor to last candidate checked
    currentCursor = candidateTitles[candidateTitles.length - 1].id;

    console.log(`Checked ${candidateTitles.length}, already classified: ${classifiedSet.size}, processing: ${batch.length} (unclassified), cursor: ${currentCursor}`);

    // If this batch has nothing to process, continue to next cursor
    if (!batch || batch.length === 0) {
      console.log(`No titles to process in this range, continuing to next cursor...`);
      continue;
    }

    console.log(`Processing batch of ${batch.length} unclassified titles...`);
    let batchProcessed = 0;

    await runWithConcurrency(batch as TitleRow[], MAX_CONCURRENT, async (title) => {
      const label = title.name ?? title.id;
      console.log(`→ Classifying intents for ${label}`);

      try {
        const result = await classifyWithAI(title);
        if (!result?.intents?.length) return;

        const cleaned = result.intents
          .filter((i) => INTENT_TYPES.includes(i.intent_type))
          .map((i) => ({
            intent_type: i.intent_type,
            confidence_score: Math.min(1.0, Math.max(0.0, i.confidence_score)),
          }));

        if (cleaned.length) {
          await insertStagingRows(title.id, cleaned);
          batchProcessed++;
          console.log(`✓ Saved ${cleaned.length} intents for ${title.id}`);
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
      fetch(`${supabaseUrl}/functions/v1/classify-title-intents`, {
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
    
    // Continuation call - continue processing with cursor
    if (body.continuation) {
      EdgeRuntime.waitUntil(processClassificationBatch(body.cursor));
      return new Response(
        JSON.stringify({ message: "Continuation batch started", cursor: body.cursor }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initial call - start fresh
    console.log("▶ classify-title-intents job started (fresh run)");
    
    EdgeRuntime.waitUntil(processClassificationBatch());

    return new Response(
      JSON.stringify({ 
        message: "Intent classification job started in background",
        status: "running"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error starting classify-title-intents:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
