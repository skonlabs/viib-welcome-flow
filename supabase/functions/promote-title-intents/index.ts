// ============================================================================
// ViiB — Promote Intent Classifications (Staging → Final)
// ============================================================================
// WHAT THIS FUNCTION DOES:
// 1. Reads rows from viib_intent_classified_titles_staging where source='ai'
// 2. Takes up to N distinct title_ids (batch mode)
// 3. Deletes old rows in viib_intent_classified_titles for those titles
// 4. Inserts new rows into final table
// 5. Deletes staging rows
// 6. Returns a JSON summary
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const DEFAULT_BATCH_SIZE = 50;
const JOB_TYPE = "promote_intents";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StagingRow {
  title_id: string;
  intent_type: string;
  confidence_score: number;
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

  console.log(`\n▶ promote-title-intents — START (batchSize=${batchSize})`);

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
    .from("viib_intent_classified_titles_staging")
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
    .from("viib_intent_classified_titles_staging")
    .select("title_id, intent_type, confidence_score, source")
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
  // 3. MAP STAGING ROWS → FINAL ROWS
  // ------------------------------------------------------------------------
  const finalRows: {
    title_id: string;
    intent_type: string;
    confidence_score: number;
    source: string;
  }[] = [];

  for (const r of rows) {
    finalRows.push({
      title_id: r.title_id,
      intent_type: r.intent_type,
      confidence_score: r.confidence_score,
      source: "ai"
    });
  }

  if (finalRows.length === 0) {
    return jsonOk({
      message: "No staging rows could be mapped.",
      promoted_titles: 0,
    });
  }

  console.log(`Mapped ${finalRows.length} final intent rows.`);

  // ------------------------------------------------------------------------
  // 4. DELETE EXISTING FINAL INTENTS FOR THESE TITLES
  // ------------------------------------------------------------------------
  const { error: deleteErr } = await supabase
    .from("viib_intent_classified_titles")
    .delete()
    .in("title_id", titleIds);

  if (deleteErr) {
    console.error("Failed to delete old intents:", deleteErr);
    await markJobError("Failed to delete old intents");
    return jsonError("Failed to delete old intents");
  }

  // ------------------------------------------------------------------------
  // 5. INSERT NEW FINAL INTENT ROWS
  // ------------------------------------------------------------------------
  const { error: insertErr } = await supabase
    .from("viib_intent_classified_titles")
    .insert(finalRows);

  if (insertErr) {
    console.error("Insert error:", insertErr);
    await markJobError("Failed to insert new intents");
    return jsonError("Failed to insert new intents");
  }

  // ------------------------------------------------------------------------
  // 6. DELETE USED STAGING ROWS
  // ------------------------------------------------------------------------
  const { error: stageDelErr } = await supabase
    .from("viib_intent_classified_titles_staging")
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
    .from("viib_intent_classified_titles_staging")
    .select("*", { count: "exact", head: true })
    .eq("source", "ai");

  if (remainingCount && remainingCount > 0) {
    console.log(`${remainingCount} staging rows remain. Self-invoking...`);
    
    // Self-invoke to continue processing
    (globalThis as any).EdgeRuntime.waitUntil(
      supabase.functions.invoke("promote-title-intents", {
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
  // 8. PROMOTION COMPLETE
  // ------------------------------------------------------------------------
  console.log("All staging rows processed. Promotion complete.");
  await markJobComplete();

  console.log("▶ promote-title-intents — COMPLETE\n");

  return jsonOk({
    message: "Intent promotion complete.",
    promoted_titles: titleIds.length,
    inserted_rows: finalRows.length,
  });
});
