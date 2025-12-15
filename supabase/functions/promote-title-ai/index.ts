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

// supabase/functions/promote-title-ai/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const BATCH_SIZE = 500;

  /* --------------------------------------------------
     1. LOAD CANDIDATE TITLES FROM STAGING (BOTH TYPES)
  -------------------------------------------------- */

  const { data: emotionRows } = await supabase
    .from("title_emotional_signatures_staging")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(BATCH_SIZE);

  const { data: intentRows } = await supabase
    .from("viib_intent_classified_titles_staging")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(BATCH_SIZE);

  const emotionByTitle = new Map<string, any[]>();
  const intentByTitle = new Map<string, any[]>();

  (emotionRows ?? []).forEach((r) => {
    emotionByTitle.set(r.title_id, [...(emotionByTitle.get(r.title_id) ?? []), r]);
  });

  (intentRows ?? []).forEach((r) => {
    intentByTitle.set(r.title_id, [...(intentByTitle.get(r.title_id) ?? []), r]);
  });

  const promotableTitleIds = [...emotionByTitle.keys()].filter((id) => intentByTitle.has(id));

  if (promotableTitleIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, promoted: 0 }), { status: 200 });
  }

  /* --------------------------------------------------
     2. PROMOTE EMOTIONS + INTENTS (UPSERT)
  -------------------------------------------------- */

  const emotionUpserts = promotableTitleIds.flatMap((id) =>
    emotionByTitle.get(id)!.map((r) => ({
      title_id: r.title_id,
      emotion_id: r.emotion_id,
      intensity_level: r.intensity_level,
      source: r.source,
      model: r.model,
      prompt_version: r.prompt_version,
    })),
  );

  const intentUpserts = promotableTitleIds.flatMap((id) =>
    intentByTitle.get(id)!.map((r) => ({
      title_id: r.title_id,
      intent_type: r.intent_type,
      confidence_score: r.confidence_score,
      source: r.source,
      model: r.model,
      prompt_version: r.prompt_version,
    })),
  );

  const emoRes = await supabase
    .from("title_emotional_signatures")
    .upsert(emotionUpserts, { onConflict: "title_id,emotion_id,source" });

  if (emoRes.error) throw emoRes.error;

  const intentRes = await supabase
    .from("viib_intent_classified_titles")
    .upsert(intentUpserts, { onConflict: "title_id,intent_type,source" });

  if (intentRes.error) throw intentRes.error;

  /* --------------------------------------------------
     3. UPDATE TITLE CLASSIFICATION STATE
  -------------------------------------------------- */

  await supabase
    .from("titles")
    .update({
      classification_status: "complete",
      last_classified_at: new Date().toISOString(),
    })
    .in("id", promotableTitleIds);

  /* --------------------------------------------------
     4. CLEAN STAGING (ONLY AFTER SUCCESS)
  -------------------------------------------------- */

  await supabase.from("title_emotional_signatures_staging").delete().in("title_id", promotableTitleIds);

  await supabase.from("viib_intent_classified_titles_staging").delete().in("title_id", promotableTitleIds);

  /* --------------------------------------------------
     5. REFRESH MATERIALIZATIONS
  -------------------------------------------------- */

  await supabase.rpc("refresh_viib_reco_materializations");

  return new Response(
    JSON.stringify({
      ok: true,
      promoted_titles: promotableTitleIds.length,
    }),
    { status: 200 },
  );
});
