// ============================================================================
// ViiB — Promote AI Classifications (Emotions + Intents from Staging → Final)
// ============================================================================
// WHAT THIS FUNCTION DOES:
// 1. Uses SQL to find distinct title_ids that have BOTH emotions AND intents in staging
// 2. Promotes emotions: delete old -> insert new
// 3. Promotes intents: delete old -> insert new
// 4. Updates titles.classification_status = 'complete'
// 5. Cleans staging tables
// 6. Refreshes recommendation materializations
// 7. Self-invokes if more work remains
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
    // 1. FIND TITLES WITH BOTH EMOTIONS AND INTENTS IN STAGING
    // --------------------------------------------------
    
    // Get ALL title_ids from both staging tables (Supabase limits to 1000 by default, but Set dedupes)
    const { data: emotionTitles, error: emotionErr } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id");
    
    if (emotionErr) throw new Error(`Failed to fetch emotion staging: ${emotionErr.message}`);
    
    const emotionSet = new Set((emotionTitles ?? []).map(r => r.title_id));
    console.log(`Found ${emotionSet.size} distinct titles with staged emotions`);
    
    const { data: intentTitles, error: intentErr } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id");
    
    if (intentErr) throw new Error(`Failed to fetch intent staging: ${intentErr.message}`);
    
    const intentSet = new Set((intentTitles ?? []).map(r => r.title_id));
    console.log(`Found ${intentSet.size} distinct titles with staged intents`);
    
    // Find intersection - titles that have BOTH emotions AND intents
    const promotableTitleIds = [...emotionSet].filter(id => intentSet.has(id)).slice(0, BATCH_SIZE);
    
    if (promotableTitleIds.length === 0) {
      console.log("No titles ready to promote (need both emotions + intents)");
      return new Response(
        JSON.stringify({ ok: true, promoted_titles: 0, message: "No titles ready" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Promoting ${promotableTitleIds.length} titles with both emotions + intents`);

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
    // 3. PROMOTE EMOTIONS (DELETE OLD → INSERT NEW)
    // --------------------------------------------------

    // Delete existing emotions for these titles (from any source)
    const { error: delEmErr } = await supabase
      .from("title_emotional_signatures")
      .delete()
      .in("title_id", promotableTitleIds);

    if (delEmErr) throw new Error(`Failed to delete old emotions: ${delEmErr.message}`);

    // Insert new emotions
    if (emotionRows && emotionRows.length > 0) {
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
    }

    console.log(`Promoted ${promotedEmotions} emotion rows`);

    // --------------------------------------------------
    // 4. PROMOTE INTENTS (DELETE OLD → INSERT NEW)
    // --------------------------------------------------

    // Delete existing intents for these titles
    const { error: delIntErr } = await supabase
      .from("viib_intent_classified_titles")
      .delete()
      .in("title_id", promotableTitleIds);

    if (delIntErr) throw new Error(`Failed to delete old intents: ${delIntErr.message}`);

    // Insert new intents
    if (intentRows && intentRows.length > 0) {
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
    }

    console.log(`Promoted ${promotedIntents} intent rows`);

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
    // 7. REFRESH MATERIALIZATIONS (skip if batch is small to save time)
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

    // Quick check if there's more in staging
    const { count: remainingCount } = await supabase
      .from("title_emotional_signatures_staging")
      .select("title_id", { count: "exact", head: true })
      .limit(1);

    const hasMore = (remainingCount ?? 0) > 0;

    if (hasMore) {
      console.log(`More work remaining. Self-invoking...`);
      
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
