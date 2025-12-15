// ============================================================================
// ViiB — Promote AI Classifications (Emotions + Intents from Staging → Final)
// ============================================================================
// WHAT THIS FUNCTION DOES:
// 1. Reads rows from title_emotional_signatures_staging where source='ai'
// 2. Reads rows from viib_intent_classified_titles_staging where source='ai'
// 3. Takes up to N distinct title_ids (batch mode)
// 4. Promotes emotions: delete old -> insert new -> delete staging
// 5. Promotes intents: delete old -> insert new -> delete staging
// 6. Returns a JSON summary
//
// EFFICIENT: Combines both promotion jobs into one to reduce overhead
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const DEFAULT_BATCH_SIZE = 50;
const JOB_TYPE = "promote_ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// JSON helpers
// ============================================================================
function jsonOk(obj: any) {
  return new Response(JSON.stringify(obj, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// ============================================================================
// Job status helpers
// ============================================================================
async function getJobStatus(): Promise<string | null> {
  const { data } = await supabase
    .from("jobs")
    .select("status")
    .eq("job_type", JOB_TYPE)
    .maybeSingle();
  return data?.status || null;
}

async function updateJobProgress(titlesProcessed: number) {
  await supabase.rpc("increment_job_titles", {
    p_job_type: JOB_TYPE,
    p_increment: titlesProcessed
  });
}

async function markJobComplete() {
  await supabase
    .from("jobs")
    .update({
      status: "idle",
      error_message: null
    })
    .eq("job_type", JOB_TYPE);
}

async function markJobError(message: string) {
  await supabase
    .from("jobs")
    .update({
      status: "failed",
      error_message: message
    })
    .eq("job_type", JOB_TYPE);
}

// ============================================================================
// EDGE FUNCTION START
// ============================================================================
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize: number = body.batchSize ?? DEFAULT_BATCH_SIZE;

  console.log(`\n▶ promote-title-ai — START (batchSize=${batchSize})`);

  // Check if job was stopped
  const jobStatus = await getJobStatus();
  if (jobStatus === "stopped") {
    console.log("Job stopped, exiting.");
    return jsonOk({ message: "Job stopped by user" });
  }

  let emotionsPromoted = 0;
  let intentsPromoted = 0;
  let emotionRowsInserted = 0;
  let intentRowsInserted = 0;

  // ------------------------------------------------------------------------
  // PART 1: PROMOTE EMOTIONS
  // ------------------------------------------------------------------------
  const { data: emotionTitles, error: emotionErr } = await supabase
    .from("title_emotional_signatures_staging")
    .select("title_id")
    .eq("source", "ai")
    .limit(batchSize);

  if (emotionErr) {
    console.error("Error loading emotion staging titles:", emotionErr);
  }

  if (emotionTitles && emotionTitles.length > 0) {
    const emotionTitleIds = [...new Set(emotionTitles.map((r: any) => r.title_id))];
    console.log(`Promoting ${emotionTitleIds.length} emotion titles...`);

    // Fetch staging rows
    const { data: emotionRows, error: stagingErr } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id, emotion_id, intensity_level, source")
      .in("title_id", emotionTitleIds)
      .eq("source", "ai");

    if (!stagingErr && emotionRows && emotionRows.length > 0) {
      // Map to final format
      const finalEmotionRows = emotionRows.map((r: any) => ({
        title_id: r.title_id,
        emotion_id: r.emotion_id,
        intensity_level: r.intensity_level,
        source: "ai"
      }));

      // Delete old emotions
      await supabase
        .from("title_emotional_signatures")
        .delete()
        .in("title_id", emotionTitleIds);

      // Insert new emotions
      const { error: insertErr } = await supabase
        .from("title_emotional_signatures")
        .insert(finalEmotionRows);

      if (!insertErr) {
        emotionRowsInserted = finalEmotionRows.length;
        emotionsPromoted = emotionTitleIds.length;

        // Delete staging rows
        await supabase
          .from("title_emotional_signatures_staging")
          .delete()
          .in("title_id", emotionTitleIds)
          .eq("source", "ai");
      } else {
        console.error("Failed to insert emotions:", insertErr);
      }
    }
  }

  // ------------------------------------------------------------------------
  // PART 2: PROMOTE INTENTS
  // ------------------------------------------------------------------------
  const { data: intentTitles, error: intentErr } = await supabase
    .from("viib_intent_classified_titles_staging")
    .select("title_id")
    .eq("source", "ai")
    .limit(batchSize);

  if (intentErr) {
    console.error("Error loading intent staging titles:", intentErr);
  }

  if (intentTitles && intentTitles.length > 0) {
    const intentTitleIds = [...new Set(intentTitles.map((r: any) => r.title_id))];
    console.log(`Promoting ${intentTitleIds.length} intent titles...`);

    // Fetch staging rows
    const { data: intentRows, error: stagingErr } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id, intent_type, confidence_score, source")
      .in("title_id", intentTitleIds)
      .eq("source", "ai");

    if (!stagingErr && intentRows && intentRows.length > 0) {
      // Map to final format
      const finalIntentRows = intentRows.map((r: any) => ({
        title_id: r.title_id,
        intent_type: r.intent_type,
        confidence_score: r.confidence_score,
        source: "ai"
      }));

      // Delete old intents
      await supabase
        .from("viib_intent_classified_titles")
        .delete()
        .in("title_id", intentTitleIds);

      // Insert new intents
      const { error: insertErr } = await supabase
        .from("viib_intent_classified_titles")
        .insert(finalIntentRows);

      if (!insertErr) {
        intentRowsInserted = finalIntentRows.length;
        intentsPromoted = intentTitleIds.length;

        // Delete staging rows
        await supabase
          .from("viib_intent_classified_titles_staging")
          .delete()
          .in("title_id", intentTitleIds)
          .eq("source", "ai");
      } else {
        console.error("Failed to insert intents:", insertErr);
      }
    }
  }

  // Update job progress
  const totalPromoted = Math.max(emotionsPromoted, intentsPromoted);
  if (totalPromoted > 0) {
    await updateJobProgress(totalPromoted);
  }

  // ------------------------------------------------------------------------
  // CHECK IF MORE WORK REMAINS
  // ------------------------------------------------------------------------
  const { count: remainingEmotions } = await supabase
    .from("title_emotional_signatures_staging")
    .select("*", { count: "exact", head: true })
    .eq("source", "ai");

  const { count: remainingIntents } = await supabase
    .from("viib_intent_classified_titles_staging")
    .select("*", { count: "exact", head: true })
    .eq("source", "ai");

  const hasMoreWork = (remainingEmotions && remainingEmotions > 0) || 
                      (remainingIntents && remainingIntents > 0);

  if (hasMoreWork) {
    console.log(`Remaining: ${remainingEmotions || 0} emotions, ${remainingIntents || 0} intents. Self-invoking...`);
    
    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/promote-title-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ batchSize }),
      }).catch((err) => console.error("Self-invoke failed:", err))
    );

    return jsonOk({
      message: "Batch complete, continuing...",
      emotions_promoted: emotionsPromoted,
      intents_promoted: intentsPromoted,
      emotion_rows_inserted: emotionRowsInserted,
      intent_rows_inserted: intentRowsInserted,
      remaining_emotions: remainingEmotions || 0,
      remaining_intents: remainingIntents || 0
    });
  }

  // Mark complete
  await markJobComplete();
  console.log("▶ promote-title-ai — COMPLETE\n");

  return jsonOk({
    message: "Promotion complete.",
    emotions_promoted: emotionsPromoted,
    intents_promoted: intentsPromoted,
    emotion_rows_inserted: emotionRowsInserted,
    intent_rows_inserted: intentRowsInserted
  });
});
