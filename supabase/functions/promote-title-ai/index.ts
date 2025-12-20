// ============================================================================
// ViiB — Promote AI Classifications (Intents from Staging → Final)
// ============================================================================
// FIXED: Promotes intents independently (emotions may already be in primary)
// The classify job now only saves to staging what's missing from primary
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const BATCH_SIZE = 500;
  let promotedEmotions = 0;
  let promotedIntents = 0;
  let titlesUpdated = 0;

  try {
    console.log("▶ promote-title-ai started");

    // --------------------------------------------------
    // 1. GET ALL TITLES FROM BOTH STAGING TABLES (UNION)
    // --------------------------------------------------
    
    // Get title_ids from emotion staging
    const { data: emotionTitles, error: emotionErr } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id");
    
    if (emotionErr) throw new Error(`Failed to fetch emotion staging: ${emotionErr.message}`);
    
    const emotionStagingSet = new Set((emotionTitles ?? []).map(r => r.title_id));
    console.log(`Found ${emotionStagingSet.size} distinct titles with staged emotions`);
    
    // Get title_ids from intent staging
    const { data: intentTitles, error: intentErr } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id");
    
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
    // 2. FETCH STAGING DATA FOR PROMOTABLE TITLES
    // --------------------------------------------------

    const { data: emotionRows, error: fetchEmErr } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id, emotion_id, intensity_level, source, created_at")
      .in("title_id", promotableTitleIds);

    if (fetchEmErr) throw new Error(`Failed to fetch emotion rows: ${fetchEmErr.message}`);

    const { data: intentRows, error: fetchIntErr } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id, intent_type, confidence_score, source, created_at")
      .in("title_id", promotableTitleIds);

    if (fetchIntErr) throw new Error(`Failed to fetch intent rows: ${fetchIntErr.message}`);

    console.log(`Loaded ${emotionRows?.length ?? 0} emotion rows and ${intentRows?.length ?? 0} intent rows`);

    // --------------------------------------------------
    // 3. PROMOTE EMOTIONS (ONLY IF WE HAVE STAGED EMOTIONS)
    // --------------------------------------------------

    if (emotionRows && emotionRows.length > 0) {
      const titleIdsWithEmotions = [...new Set(emotionRows.map(r => r.title_id))];
      
      // Delete existing emotions for these titles (from any source)
      const { error: delEmErr } = await supabase
        .from("title_emotional_signatures")
        .delete()
        .in("title_id", titleIdsWithEmotions);

      if (delEmErr) throw new Error(`Failed to delete old emotions: ${delEmErr.message}`);

      // Insert new emotions
      const now = new Date().toISOString();
      const emotionInserts = emotionRows.map(r => ({
        title_id: r.title_id,
        emotion_id: r.emotion_id,
        intensity_level: r.intensity_level,
        source: r.source || "ai",
        created_at: r.created_at,
        updated_at: now,
      }));

      // Insert in chunks to avoid payload limits
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < emotionInserts.length; i += CHUNK_SIZE) {
        const chunk = emotionInserts.slice(i, i + CHUNK_SIZE);
        const { error: insEmErr } = await supabase
          .from("title_emotional_signatures")
          .insert(chunk);

        if (insEmErr) throw new Error(`Failed to insert emotions chunk ${i}: ${insEmErr.message}`);
      }
      promotedEmotions = emotionInserts.length;
      console.log(`Promoted ${promotedEmotions} emotion rows for ${titleIdsWithEmotions.length} titles`);
    }

    // --------------------------------------------------
    // 4. PROMOTE INTENTS (ONLY IF WE HAVE STAGED INTENTS)
    // --------------------------------------------------

    if (intentRows && intentRows.length > 0) {
      const titleIdsWithIntents = [...new Set(intentRows.map(r => r.title_id))];
      
      // Delete existing intents for these titles
      const { error: delIntErr } = await supabase
        .from("viib_intent_classified_titles")
        .delete()
        .in("title_id", titleIdsWithIntents);

      if (delIntErr) throw new Error(`Failed to delete old intents: ${delIntErr.message}`);

      // Insert new intents
      const now = new Date().toISOString();
      const intentInserts = intentRows.map(r => ({
        title_id: r.title_id,
        intent_type: r.intent_type,
        confidence_score: r.confidence_score,
        source: r.source || "ai",
        created_at: r.created_at,
        updated_at: now,
      }));

      // Insert in chunks
      const CHUNK_SIZE = 1000;
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
    // 5. UPDATE TITLE CLASSIFICATION STATUS
    // --------------------------------------------------

    const { error: updateErr } = await supabase
      .from("titles")
      .update({
        classification_status: "complete",
        last_classified_at: new Date().toISOString(),
      })
      .in("id", promotableTitleIds);

    if (updateErr) throw new Error(`Failed to update titles: ${updateErr.message}`);
    titlesUpdated = promotableTitleIds.length;

    console.log(`Updated ${titlesUpdated} titles to 'complete'`);

    // --------------------------------------------------
    // 6. CLEAN STAGING (ONLY AFTER SUCCESS)
    // --------------------------------------------------

    const { error: cleanEmErr } = await supabase
      .from("title_emotional_signatures_staging")
      .delete()
      .in("title_id", promotableTitleIds);

    if (cleanEmErr) console.error("Warning: Failed to clean emotion staging:", cleanEmErr.message);

    const { error: cleanIntErr } = await supabase
      .from("viib_intent_classified_titles_staging")
      .delete()
      .in("title_id", promotableTitleIds);

    if (cleanIntErr) console.error("Warning: Failed to clean intent staging:", cleanIntErr.message);

    console.log("Cleaned staging tables");

    // --------------------------------------------------
    // 7. REFRESH MATERIALIZATIONS (skip if batch is small)
    // --------------------------------------------------

    if (titlesUpdated >= 100) {
      try {
        await supabase.rpc("refresh_viib_reco_materializations");
        console.log("Refreshed recommendation materializations");
      } catch (rpcErr) {
        console.error("Warning: Failed to refresh materializations:", rpcErr);
      }
    }

    // --------------------------------------------------
    // 8. CHECK IF MORE WORK AND SELF-INVOKE
    // --------------------------------------------------

    const { count: remainingEmotions } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id", { count: "exact", head: true })
      .limit(1);

    const { count: remainingIntents } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id", { count: "exact", head: true })
      .limit(1);

    const hasMore = ((remainingEmotions ?? 0) > 0) || ((remainingIntents ?? 0) > 0);

    if (hasMore) {
      console.log(`More work remaining (emotions: ${remainingEmotions}, intents: ${remainingIntents}). Self-invoking...`);
      
      // Fire-and-forget self-invoke for next batch
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/promote-title-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({}),
      })
        .then(r => console.log(`Self-invoke response: ${r.status}`))
        .catch(err => console.error("Self-invoke failed:", err));
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
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
