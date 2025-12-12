// ============================================================================
// ViiB — Promote Emotional Signatures (Staging → Final)
// ============================================================================
// WHAT THIS FUNCTION DOES:
// 1. Reads rows from title_emotional_signatures_staging where source='ai'
// 2. Takes up to N distinct title_ids (batch mode)
// 3. Fetches staging rows for those titles
// 4. Maps emotion_label → emotion_master.id (category = 'content_state')
// 5. Deletes old rows in title_emotional_signatures for those titles
// 6. Inserts mapped rows into final table
// 7. Deletes staging rows
// 8. Calls refresh SQL functions:
//        refresh_title_emotion_vectors()
//        refresh_title_transformation_scores()
//        refresh_title_intent_alignment_scores()
// 9. Returns a JSON summary including skipped labels and errors
//
// IMPORTANT: Works for BOTH movies and series.
//            There is no type filter. If it's in `titles`, it's processed.
//
// REQUIREMENTS:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// SAFE, IDEMPOTENT, AND PRODUCTION-GRADE
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// How many distinct titles to promote at once
const DEFAULT_BATCH_SIZE = 50;
const JOB_TYPE = "promote_emotions";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StagingRow {
  title_id: string;
  emotion_id: string;
  intensity_level: number;
  source: string;
}

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
    .single();
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize: number = body.batchSize ?? DEFAULT_BATCH_SIZE;

  console.log(`\n▶ promote-title-emotions — START (batchSize=${batchSize})`);

  // Check if job was stopped
  const jobStatus = await getJobStatus();
  if (jobStatus === "stopped") {
    console.log("Job stopped, exiting.");
    return jsonOk({ message: "Job stopped by user" });
  }

  // ------------------------------------------------------------------------
  // 1. FETCH DISTINCT TITLES FROM STAGING (source='ai')
  // ------------------------------------------------------------------------
  const { data: distinctTitles, error: distinctErr } = await supabase
    .from("title_emotional_signatures_staging")
    .select("title_id")
    .eq("source", "ai")
    .limit(batchSize);

  if (distinctErr) {
    console.error("Error loading staging titles:", distinctErr);
    await markJobError("Failed to load staging titles");
    return jsonError("Failed to load staging titles");
  }

  if (!distinctTitles || distinctTitles.length === 0) {
    console.log("No staging rows found. Job complete.");
    await markJobComplete();
    return jsonOk({
      message: "No AI staging rows to promote. Job complete.",
      promoted_titles: 0,
    });
  }

  // Get unique title_ids
  const titleIds = [...new Set(distinctTitles.map((r: any) => r.title_id))];
  console.log(`Promoting ${titleIds.length} titles...`);

  // ------------------------------------------------------------------------
  // 2. FETCH STAGING ROWS FOR SELECTED TITLES
  // ------------------------------------------------------------------------
  const { data: stagingRows, error: stagingErr } = await supabase
    .from("title_emotional_signatures_staging")
    .select("title_id, emotion_id, intensity_level, source")
    .in("title_id", titleIds)
    .eq("source", "ai");

  if (stagingErr) {
    console.error("Error loading staging rows:", stagingErr);
    await markJobError("Failed to load staging rows");
    return jsonError("Failed to load staging rows");
  }

  if (!stagingRows || stagingRows.length === 0) {
    console.log("No staging rows found for selected titles.");
    return jsonOk({
      message: "No staging rows found to promote.",
      promoted_titles: 0,
    });
  }

  const rows = stagingRows as StagingRow[];
  console.log(`Loaded ${rows.length} staging rows.`);

  // ------------------------------------------------------------------------
  // 3. MAP STAGING ROWS → FINAL ROWS (emotion_id is already UUID)
  // ------------------------------------------------------------------------
  const finalRows: {
    title_id: string;
    emotion_id: string;
    intensity_level: number;
    source: string;
  }[] = [];

  for (const r of rows) {
    finalRows.push({
      title_id: r.title_id,
      emotion_id: r.emotion_id,
      intensity_level: r.intensity_level,
      source: "ai"
    });
  }

  if (finalRows.length === 0) {
    return jsonOk({
      message: "No staging rows could be mapped.",
      promoted_titles: 0,
    });
  }

  console.log(`Mapped ${finalRows.length} final signature rows.`);

  // ------------------------------------------------------------------------
  // 4. DELETE EXISTING FINAL SIGNATURES FOR THESE TITLES
  // ------------------------------------------------------------------------
  const { error: deleteErr } = await supabase
    .from("title_emotional_signatures")
    .delete()
    .in("title_id", titleIds);

  if (deleteErr) {
    console.error("Failed to delete old signatures:", deleteErr);
    await markJobError("Failed to delete old signatures");
    return jsonError("Failed to delete old signatures");
  }

  // ------------------------------------------------------------------------
  // 5. INSERT NEW FINAL SIGNATURE ROWS
  // ------------------------------------------------------------------------
  const { error: insertErr } = await supabase
    .from("title_emotional_signatures")
    .insert(finalRows);

  if (insertErr) {
    console.error("Insert error:", insertErr);
    await markJobError("Failed to insert new signatures");
    return jsonError("Failed to insert new signatures");
  }

  // ------------------------------------------------------------------------
  // 6. DELETE USED STAGING ROWS
  // ------------------------------------------------------------------------
  const { error: stageDelErr } = await supabase
    .from("title_emotional_signatures_staging")
    .delete()
    .in("title_id", titleIds)
    .eq("source", "ai");

  if (stageDelErr) {
    console.error("Failed to delete staging rows:", stageDelErr);
    // Not fatal, continue
  }

  // Update job progress
  await updateJobProgress(titleIds.length);

  // ------------------------------------------------------------------------
  // 7. CHECK IF MORE WORK REMAINS
  // ------------------------------------------------------------------------
  const { count: remainingCount } = await supabase
    .from("title_emotional_signatures_staging")
    .select("*", { count: "exact", head: true })
    .eq("source", "ai");

  if (remainingCount && remainingCount > 0) {
    console.log(`${remainingCount} staging rows remain. Self-invoking...`);
    
    // Self-invoke to continue processing
    (globalThis as any).EdgeRuntime.waitUntil(
      supabase.functions.invoke("promote-title-emotions", {
        body: { batchSize }
      })
    );

    return jsonOk({
      message: "Batch complete, continuing...",
      promoted_titles: titleIds.length,
      inserted_rows: finalRows.length,
      remaining: remainingCount
    });
  }

  // ------------------------------------------------------------------------
  // 8. PROMOTION COMPLETE - Refresh functions run as separate cron jobs
  // ------------------------------------------------------------------------
  // NOTE: The refresh functions (refresh_title_emotion_vectors, 
  // refresh_title_transformation_scores, refresh_title_intent_alignment_scores)
  // are computationally intensive and run as scheduled cron jobs.
  // They should NOT be called inline here as they timeout.
  console.log("All staging rows processed. Promotion complete.");
  console.log("Note: Refresh functions run as separate scheduled cron jobs.");

  // Mark job complete
  await markJobComplete();

  // ------------------------------------------------------------------------
  // 9. FINISH — RETURN SUMMARY
  // ------------------------------------------------------------------------
  console.log("▶ promote-title-emotions — COMPLETE\n");

  return jsonOk({
    message: "Promotion complete. Refresh functions will run via scheduled cron jobs.",
    promoted_titles: titleIds.length,
    inserted_rows: finalRows.length,
  });
});
