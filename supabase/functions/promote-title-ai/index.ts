// ============================================================================
// ViiB — Promote AI Classifications (Intents from Staging → Final)
// ============================================================================
// FIXED: Reduced batch size to avoid URL length limits with .in() queries
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Smaller batch to avoid URL length limits with .in() queries (UUIDs are 36 chars each)
const BATCH_SIZE = 50;
const CHUNK_SIZE = 500;

// Helper to fetch data in smaller chunks to avoid URL length limits
async function fetchInChunks<T>(
  supabase: any,
  table: string,
  selectFields: string,
  titleIds: string[]
): Promise<T[]> {
  const results: T[] = [];
  const FETCH_CHUNK_SIZE = 50; // ~50 UUIDs per request to keep URL short
  
  for (let i = 0; i < titleIds.length; i += FETCH_CHUNK_SIZE) {
    const chunk = titleIds.slice(i, i + FETCH_CHUNK_SIZE);
    const { data, error } = await supabase
      .from(table)
      .select(selectFields)
      .in("title_id", chunk);
    
    if (error) throw new Error(`Failed to fetch from ${table}: ${error.message}`);
    if (data) results.push(...data);
  }
  
  return results;
}

// Helper to delete in chunks
async function deleteInChunks(
  supabase: any,
  table: string,
  titleIds: string[]
): Promise<void> {
  const DELETE_CHUNK_SIZE = 50;
  
  for (let i = 0; i < titleIds.length; i += DELETE_CHUNK_SIZE) {
    const chunk = titleIds.slice(i, i + DELETE_CHUNK_SIZE);
    const { error } = await supabase
      .from(table)
      .delete()
      .in("title_id", chunk);
    
    if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
  }
}

// Helper to update in chunks
async function updateInChunks(
  supabase: any,
  table: string,
  updateData: any,
  titleIds: string[]
): Promise<void> {
  const UPDATE_CHUNK_SIZE = 50;
  
  for (let i = 0; i < titleIds.length; i += UPDATE_CHUNK_SIZE) {
    const chunk = titleIds.slice(i, i + UPDATE_CHUNK_SIZE);
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .in("id", chunk);
    
    if (error) throw new Error(`Failed to update ${table}: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("POST only", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  let promotedEmotions = 0;
  let promotedIntents = 0;
  let titlesUpdated = 0;

  // Helper to update job status
  async function updateJobStatus(status: string, errorMessage: string | null = null) {
    try {
      const updateData: any = { status };
      if (errorMessage) updateData.error_message = errorMessage;
      if (status === 'running') {
        updateData.error_message = null;
        updateData.last_run_at = new Date().toISOString();
      }
      await supabase
        .from("jobs")
        .update(updateData)
        .eq("job_type", "promote_ai");
    } catch (e) {
      console.error("Failed to update job status:", e);
    }
  }

  // Helper to increment job counter
  async function incrementJobCounter(count: number) {
    try {
      await supabase.rpc("increment_job_titles", { 
        p_job_type: "promote_ai", 
        p_increment: count 
      });
    } catch (e) {
      console.error("Failed to increment job counter:", e);
    }
  }

  try {
    console.log("▶ promote-title-ai started");
    
    // Mark job as running
    await updateJobStatus("running");
    // --------------------------------------------------
    // 1. GET DISTINCT TITLE IDS FROM BOTH STAGING TABLES
    // --------------------------------------------------
    
    // Get title_ids from emotion staging (limit to manageable count)
    const { data: emotionTitles, error: emotionErr } = await supabase
      .from("viib_emotion_classified_titles_staging")
      .select("title_id")
      .limit(1000);
    
    if (emotionErr) throw new Error(`Failed to fetch emotion staging: ${emotionErr.message}`);
    
    const emotionStagingSet = new Set((emotionTitles ?? []).map(r => r.title_id));
    console.log(`Found ${emotionStagingSet.size} distinct titles with staged emotions`);
    
    // Get title_ids from intent staging
    const { data: intentTitles, error: intentErr } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id")
      .limit(1000);
    
    if (intentErr) throw new Error(`Failed to fetch intent staging: ${intentErr.message}`);
    
    const intentStagingSet = new Set((intentTitles ?? []).map(r => r.title_id));
    console.log(`Found ${intentStagingSet.size} distinct titles with staged intents`);
    
    // UNION of both staging tables - promote anything that has data in staging
    const allStagedTitleIds = new Set([...emotionStagingSet, ...intentStagingSet]);
    const promotableTitleIds = [...allStagedTitleIds].slice(0, BATCH_SIZE);
    
    if (promotableTitleIds.length === 0) {
      console.log("No titles in staging to promote");
      return new Response(
        JSON.stringify({ ok: true, promoted_titles: 0, message: "No titles ready" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Promoting ${promotableTitleIds.length} titles from staging`);

    // --------------------------------------------------
    // 2. FETCH STAGING DATA FOR PROMOTABLE TITLES (IN CHUNKS)
    // --------------------------------------------------

    interface EmotionRow {
      title_id: string;
      emotion_id: string;
      intensity_level: number;
      source: string | null;
      created_at: string;
    }

    interface IntentRow {
      title_id: string;
      intent_type: string;
      confidence_score: number;
      source: string | null;
      created_at: string;
    }

    const emotionRows = await fetchInChunks<EmotionRow>(
      supabase,
      "viib_emotion_classified_titles_staging",
      "title_id, emotion_id, intensity_level, source, created_at",
      promotableTitleIds
    );

    const intentRows = await fetchInChunks<IntentRow>(
      supabase,
      "viib_intent_classified_titles_staging",
      "title_id, intent_type, confidence_score, source, created_at",
      promotableTitleIds
    );

    console.log(`Loaded ${emotionRows.length} emotion rows and ${intentRows.length} intent rows`);

    // --------------------------------------------------
    // 3. PROMOTE EMOTIONS (ONLY IF WE HAVE STAGED EMOTIONS)
    // --------------------------------------------------

    if (emotionRows.length > 0) {
      const titleIdsWithEmotions = [...new Set(emotionRows.map(r => r.title_id))];
      
      // Delete existing emotions for these titles (in chunks)
      await deleteInChunks(supabase, "viib_emotion_classified_titles", titleIdsWithEmotions);

      // Insert new emotions in chunks
      const now = new Date().toISOString();
      const emotionInserts = emotionRows.map(r => ({
        title_id: r.title_id,
        emotion_id: r.emotion_id,
        intensity_level: r.intensity_level,
        source: r.source || "ai",
        created_at: r.created_at,
        updated_at: now,
      }));

      for (let i = 0; i < emotionInserts.length; i += CHUNK_SIZE) {
        const chunk = emotionInserts.slice(i, i + CHUNK_SIZE);
        const { error: insEmErr } = await supabase
          .from("viib_emotion_classified_titles")
          .insert(chunk);

        if (insEmErr) throw new Error(`Failed to insert emotions chunk ${i}: ${insEmErr.message}`);
      }
      promotedEmotions = emotionInserts.length;
      console.log(`Promoted ${promotedEmotions} emotion rows for ${titleIdsWithEmotions.length} titles`);
    }

    // --------------------------------------------------
    // 4. PROMOTE INTENTS (ONLY IF WE HAVE STAGED INTENTS)
    // --------------------------------------------------

    if (intentRows.length > 0) {
      const titleIdsWithIntents = [...new Set(intentRows.map(r => r.title_id))];
      
      // Delete existing intents for these titles (in chunks)
      await deleteInChunks(supabase, "viib_intent_classified_titles", titleIdsWithIntents);

      // Insert new intents in chunks
      const now = new Date().toISOString();
      const intentInserts = intentRows.map(r => ({
        title_id: r.title_id,
        intent_type: r.intent_type,
        confidence_score: r.confidence_score,
        source: r.source || "ai",
        created_at: r.created_at,
        updated_at: now,
      }));

      for (let i = 0; i < intentInserts.length; i += CHUNK_SIZE) {
        const chunk = intentInserts.slice(i, i + CHUNK_SIZE);
        const { error: insIntErr } = await supabase
          .from("viib_intent_classified_titles")
          .insert(chunk);

        if (insIntErr) throw new Error(`Failed to insert intents chunk ${i}: ${insIntErr.message}`);
      }
      promotedIntents = intentInserts.length;
      console.log(`Promoted ${promotedIntents} intent rows for ${titleIdsWithIntents.length} titles`);
    }

    // --------------------------------------------------
    // 5. UPDATE TITLE CLASSIFICATION STATUS (IN CHUNKS)
    // --------------------------------------------------

    await updateInChunks(
      supabase,
      "titles",
      {
        classification_status: "complete",
        last_classified_at: new Date().toISOString(),
      },
      promotableTitleIds
    );
    titlesUpdated = promotableTitleIds.length;

    console.log(`Updated ${titlesUpdated} titles to 'complete'`);
    
    // Update job counter with promoted titles
    await incrementJobCounter(titlesUpdated);

    // --------------------------------------------------
    // 6. CLEAN STAGING (ONLY AFTER SUCCESS, IN CHUNKS)
    // --------------------------------------------------

    try {
      await deleteInChunks(supabase, "viib_emotion_classified_titles_staging", promotableTitleIds);
      console.log("Cleaned emotion staging");
    } catch (cleanErr: any) {
      console.error("Warning: Failed to clean emotion staging:", cleanErr.message);
    }

    try {
      await deleteInChunks(supabase, "viib_intent_classified_titles_staging", promotableTitleIds);
      console.log("Cleaned intent staging");
    } catch (cleanErr: any) {
      console.error("Warning: Failed to clean intent staging:", cleanErr.message);
    }

    // --------------------------------------------------
    // 7. CHECK IF MORE WORK AND SELF-INVOKE
    // --------------------------------------------------

    const { count: remainingEmotions } = await supabase
      .from("viib_emotion_classified_titles_staging")
      .select("title_id", { count: "exact", head: true })
      .limit(1);

    const { count: remainingIntents } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id", { count: "exact", head: true })
      .limit(1);

    const hasMore = ((remainingEmotions ?? 0) > 0) || ((remainingIntents ?? 0) > 0);

    if (hasMore) {
      console.log(`More work remaining (emotions: ${remainingEmotions}, intents: ${remainingIntents}). Self-invoking...`);
      
      // AWAIT the self-invoke to ensure it completes before function terminates
      try {
        const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/promote-title-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({}),
        });
        console.log(`Self-invoke response: ${response.status}`);
      } catch (err) {
        console.error("Self-invoke failed:", err);
      }
    } else {
      // No more work - mark job as completed
      await updateJobStatus("completed");
      console.log("✓ All staging data promoted, job completed");
    }

    console.log("✓ promote-title-ai completed batch");

    return new Response(
      JSON.stringify({
        ok: true,
        promoted_titles: titlesUpdated,
        promoted_emotions: promotedEmotions,
        promoted_intents: promotedIntents,
        has_more: hasMore,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("promote-title-ai error:", err);
    // Mark job as failed
    await updateJobStatus("failed", err?.message ?? "Unknown error");
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
