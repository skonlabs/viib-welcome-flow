import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Chunk = { languageCode: string; year: number; genreId: number };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing required environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));

    /**
     * Inputs (backwards compatible):
     * - jobId: uuid (existing UI/job runner uses this)
     * - chunks: Chunk[] (optional; if present, we run TMDB ingestion via full-refresh-titles)
     * - mode: 'hourly' | 'daily' | 'weekly' (default 'daily') -> drives DB pipeline
     * - skipIngest: boolean (default false) -> if true, skip chunks ingestion even if chunks provided
     */
    const jobId: string | undefined = body.jobId;
    const chunks: Chunk[] | undefined = body.chunks;
    const mode: string = (body.mode || "daily").toLowerCase();
    const skipIngest: boolean = !!body.skipIngest;

    if (!jobId) {
      throw new Error("Missing required parameter: jobId");
    }

    // Confirm job is allowed to run
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id,status,configuration,job_name")
      .eq("id", jobId)
      .single();

    if (jobErr) throw jobErr;

    if (job.status === "failed" || job.status === "idle") {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Job not running (status: ${job.status}).`,
          jobId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Helper: log to system_logs
    const log = async (
      severity: "info" | "warning" | "error",
      operation: string,
      message: string | null,
      context: Record<string, unknown> = {},
    ) => {
      await supabase.from("system_logs").insert({
        severity,
        operation,
        error_message: message,
        context: { jobId, mode, ...context },
      });
    };

    // Helper: re-check status (admin stop)
    const ensureNotStopped = async (phase: string) => {
      const { data } = await supabase.from("jobs").select("status,error_message,updated_at").eq("id", jobId).single();

      if (data?.status === "failed" || data?.status === "idle") {
        await log(
          "error",
          "full-refresh-orchestrator-stopped",
          `Stopped before/within phase '${phase}'. Status: ${data.status}. ${data.error_message || ""}`,
          { phase },
        );
        throw new Error(`Job stopped (status: ${data?.status}) during phase '${phase}'`);
      }
    };

    // ------------------------------------------------------------
    // Phase 1: Optional TMDB ingestion (existing behavior)
    // ------------------------------------------------------------
    const runIngest = Array.isArray(chunks) && chunks.length > 0 && !skipIngest;

    if (runIngest) {
      await ensureNotStopped("ingest-start");
      await log("info", "ingest-start", null, { totalChunks: chunks!.length });

      // Filter already completed work units if your job config tracks that
      const config = job.configuration || {};
      const completed = (config.completed_work_units || []) as any[];

      const remaining = chunks!.filter(
        (c) =>
          !completed.some((u) => u.languageCode === c.languageCode && u.year === c.year && u.genreId === c.genreId),
      );

      const BATCH_SIZE = 5;
      const BATCH_DELAY_MS = 4000;

      for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
        await ensureNotStopped("ingest-batch");
        const batch = remaining.slice(i, i + BATCH_SIZE);

        // Mark currently_processing
        await supabase
          .from("jobs")
          .update({
            configuration: {
              ...config,
              currently_processing: batch,
            },
          })
          .eq("id", jobId);

        const results = await Promise.all(
          batch.map(async (chunk) => {
            const res = await supabase.functions.invoke("full-refresh-titles", {
              body: {
                languageCode: chunk.languageCode,
                startYear: chunk.year,
                endYear: chunk.year,
                genreId: chunk.genreId,
                jobId,
              },
            });
            return { chunk, res };
          }),
        );

        const newCompleted: any[] = [];
        const newFailed: any[] = [];

        for (const r of results) {
          if (!r.res.error) {
            newCompleted.push({
              languageCode: r.chunk.languageCode,
              year: r.chunk.year,
              genreId: r.chunk.genreId,
              completedAt: new Date().toISOString(),
              titlesProcessed: r.res.data?.titlesProcessed || 0,
              moviesProcessed: r.res.data?.moviesProcessed || 0,
              seriesProcessed: r.res.data?.seriesProcessed || 0,
            });
          } else {
            newFailed.push({
              languageCode: r.chunk.languageCode,
              year: r.chunk.year,
              genreId: r.chunk.genreId,
              failedAt: new Date().toISOString(),
              error: r.res.error.message || "Unknown error",
              attempts: 1,
            });
          }
        }

        // Update job config
        const { data: latestJob } = await supabase.from("jobs").select("configuration").eq("id", jobId).single();

        const latestConfig = latestJob?.configuration || {};
        const updatedCompleted = [...(latestConfig.completed_work_units || []), ...newCompleted];
        const updatedFailed = [...(latestConfig.failed_work_units || []), ...newFailed];

        await supabase
          .from("jobs")
          .update({
            configuration: {
              ...latestConfig,
              completed_work_units: updatedCompleted,
              failed_work_units: updatedFailed,
              currently_processing: [],
              thread_tracking: {
                succeeded: updatedCompleted.length,
                failed: updatedFailed.length,
              },
            },
          })
          .eq("id", jobId);

        await log("info", "ingest-batch-complete", null, {
          batchSize: batch.length,
          success: newCompleted.length,
          failed: newFailed.length,
        });

        if (i + BATCH_SIZE < remaining.length) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      }

      await ensureNotStopped("ingest-end");
      await log("info", "ingest-end", null, {});
    }

    // ------------------------------------------------------------
    // Phase 2–5: Dependency-aware DB refresh pipeline (the fix)
    // ------------------------------------------------------------
    await ensureNotStopped("db-refresh-start");

    await log("info", "db-refresh-start", null, { mode });

    // Run the final DB orchestrator function you installed in SQL:
    const { data: refreshData, error: refreshErr } = await supabase.rpc("run_recommendation_refresh", { p_mode: mode });

    if (refreshErr) {
      await log("error", "db-refresh-failed", refreshErr.message, { mode });
      // mark job failed
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: `DB refresh failed: ${refreshErr.message}`,
        })
        .eq("id", jobId);
      throw refreshErr;
    }

    await log("info", "db-refresh-complete", null, { refreshData });

    // Mark job completed (don’t override if admin stopped)
    await ensureNotStopped("finalize");
    await supabase
      .from("jobs")
      .update({
        status: "completed",
        error_message: null,
        last_run_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        mode,
        ingestionRan: runIngest,
        refresh: refreshData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
