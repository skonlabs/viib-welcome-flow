import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, RefreshCw, Clock, Calendar as CalendarIcon, Settings, XCircle, Layers } from "@/icons";
import { errorLogger, logger } from "@/lib/services/LoggerService";
import { CronMetricsDashboard } from "./CronMetricsDashboard";
import { ThreadMonitor } from "./ThreadMonitor";
import { JobScheduleDialog, RecurrenceConfig } from "./JobScheduleDialog";
import { useVisibilityAwarePolling } from "@/hooks/useVisibilityAwarePolling";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  job_name: string;
  job_type: string;
  status: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_run_duration_seconds: number | null;
  total_titles_processed: number;
  error_message: string | null;
  configuration: any;
}

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  database: string;
  active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  last_status?: 'succeeded' | 'failed' | null;
}

interface ParallelProgress {
  jobId: string;
  currentThread: number;
  totalThreads: number;
  succeeded: number;
  failed: number;
  titlesProcessed: number;
}

interface JobMetrics {
  totalTitles: number;
  // Emotion metrics
  emotionPrimaryTitles: number;
  emotionStagingTitles: number;
  emotionUnclassified: number;
  // Intent metrics
  intentPrimaryTitles: number;
  intentStagingTitles: number;
  intentUnclassified: number;
}

interface EnrichMetrics {
  pendingPoster: number;
  pendingOverview: number;
  pendingTrailer: number;
  pendingTranscript: number;
  totalPending: number;
}

interface StreamingMetrics {
  pendingFix: number;
  totalFixed: number;
}

export const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [cronLoading, setCronLoading] = useState(true);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [runningCronJobs, setRunningCronJobs] = useState<Set<number>>(new Set());
  const [cronJobStartTimes, setCronJobStartTimes] = useState<Map<number, number>>(new Map());
  const [parallelProgress, setParallelProgress] = useState<ParallelProgress | null>(null);
  const [jobMetrics, setJobMetrics] = useState<JobMetrics | null>(null);
  const [enrichMetrics, setEnrichMetrics] = useState<EnrichMetrics | null>(null);
  const [streamingMetrics, setStreamingMetrics] = useState<StreamingMetrics | null>(null);
  const [jobToStop, setJobToStop] = useState<Job | null>(null);
  const { toast } = useToast();

  const fetchJobMetrics = async () => {
    try {
      // Use the efficient RPC function for distinct counts
      const { data, error } = await supabase.rpc("get_job_classification_metrics" as any);

      if (error) throw error;

      if (data && data.length > 0) {
        const metrics = data[0];
        const totalTitles = Number(metrics.total_titles) || 0;
        const emotionPrimary = Number(metrics.emotion_primary_distinct) || 0;
        const emotionStaging = Number(metrics.emotion_staging_distinct) || 0;
        const intentPrimary = Number(metrics.intent_primary_distinct) || 0;
        const intentStaging = Number(metrics.intent_staging_distinct) || 0;

        // Calculate unclassified (not in primary AND not in staging)
        // Since some titles might be in both, we need to be careful
        // For simplicity, assume staging titles are not yet in primary
        const emotionClassified = emotionPrimary + emotionStaging;
        const intentClassified = intentPrimary + intentStaging;

        setJobMetrics({
          totalTitles,
          // Emotion metrics
          emotionPrimaryTitles: emotionPrimary,
          emotionStagingTitles: emotionStaging,
          emotionUnclassified: Math.max(0, totalTitles - emotionClassified),
          // Intent metrics
          intentPrimaryTitles: intentPrimary,
          intentStagingTitles: intentStaging,
          intentUnclassified: Math.max(0, totalTitles - intentClassified),
        });
      }
    } catch (error) {
      // Silently handle - metrics will retry on next poll
    }
  };

  const fetchEnrichMetrics = async () => {
    try {
      // Fetch counts for titles needing enrichment
      // Check for both NULL and empty strings
      const [posterResult, overviewResult, trailerResult, transcriptTitlesResult, transcriptSeasonsResult] =
        await Promise.all([
          // Poster: NULL or empty
          supabase
            .from("titles")
            .select("id", { count: "exact", head: true })
            .not("tmdb_id", "is", null)
            .or("poster_path.is.null,poster_path.eq."),
          // Overview: NULL or empty
          supabase
            .from("titles")
            .select("id", { count: "exact", head: true })
            .not("tmdb_id", "is", null)
            .or("overview.is.null,overview.eq."),
          // Trailer: NULL or empty
          supabase
            .from("titles")
            .select("id", { count: "exact", head: true })
            .not("tmdb_id", "is", null)
            .or("trailer_url.is.null,trailer_url.eq."),
          // Transcript for TITLES: simply NULL or empty
          supabase
            .from("titles")
            .select("id", { count: "exact", head: true })
            .or("trailer_transcript.is.null,trailer_transcript.eq."),
          // Transcript for SEASONS: simply NULL or empty
          supabase
            .from("seasons")
            .select("id", { count: "exact", head: true })
            .or("trailer_transcript.is.null,trailer_transcript.eq."),
        ]);

      const pendingPoster = posterResult.count || 0;
      const pendingOverview = overviewResult.count || 0;
      const pendingTrailer = trailerResult.count || 0;
      const pendingTranscriptTitles = transcriptTitlesResult.count || 0;
      const pendingTranscriptSeasons = transcriptSeasonsResult.count || 0;
      const pendingTranscript = pendingTranscriptTitles + pendingTranscriptSeasons;

      // Estimate total pending (max of the three since some titles may be missing multiple fields)
      const totalPending = Math.max(pendingPoster, pendingOverview, pendingTrailer);

      setEnrichMetrics({
        pendingPoster,
        pendingOverview,
        pendingTrailer,
        pendingTranscript,
        totalPending,
      });
    } catch (error) {
      // Silently handle - metrics will retry on next poll
    }
  };

  const fetchStreamingMetrics = async () => {
    try {
      // Use the RPC function to get accurate count of corrupted titles
      const { data: corruptedCount, error } = await supabase.rpc("get_corrupted_streaming_count" as any);

      if (error) {
        return;
      }

      // Get total fixed from job's total_titles_processed
      const { data: fixJob } = await supabase
        .from("jobs")
        .select("total_titles_processed")
        .eq("job_type", "fix_streaming")
        .maybeSingle();

      setStreamingMetrics({
        pendingFix: corruptedCount || 0,
        totalFixed: fixJob?.total_titles_processed || 0,
      });
    } catch (error) {
      // Silently handle - metrics will retry on next poll
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: true });

      if (error) throw error;
      setJobs(data || []);

      // Restore parallel progress UI if a job is running with work unit tracking
      const runningJob = data?.find((job) => job.status === "running");
      if (runningJob) {
        const config = (runningJob.configuration as any) || {};
        const completedUnits = config.completed_work_units || [];
        const failedUnits = config.failed_work_units || [];
        const totalThreads = config.total_threads || config.total_work_units || 0;

        if (totalThreads > 0) {
          const threadsCompleted = completedUnits.length + failedUnits.length;

          // Only restore progress if we haven't completed all threads yet
          if (threadsCompleted < totalThreads) {
            setParallelProgress({
              jobId: runningJob.id,
              currentThread: threadsCompleted,
              totalThreads: totalThreads,
              succeeded: completedUnits.length,
              failed: failedUnits.length,
              titlesProcessed: runningJob.total_titles_processed || 0,
            });
          }
        }
      }
    } catch (error) {
      await errorLogger.log(error, { operation: "fetch_jobs" });
      toast({
        title: "Error loading jobs",
        description: "Failed to load job information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCronJobs = async () => {
    try {
      setCronLoading(true);
      // Use raw SQL query via rpc since get_cron_jobs is a custom function
      const { data, error } = await supabase.rpc("get_cron_jobs" as any);

      if (error) throw error;
      setCronJobs(data || []);
    } catch (error) {
      // Cron jobs might not be accessible, fall back silently
      setCronJobs([]);
    } finally {
      setCronLoading(false);
    }
  };

  const handleToggleCronJob = async (cronJob: CronJob) => {
    try {
      const { error } = await supabase.rpc("toggle_cron_job" as any, {
        p_jobid: cronJob.jobid,
        p_active: !cronJob.active,
      });

      if (error) throw error;

      toast({
        title: cronJob.active ? "Cron Job Paused" : "Cron Job Activated",
        description: `${cronJob.jobname} has been ${cronJob.active ? "paused" : "activated"}.`,
      });

      await fetchCronJobs();
    } catch (error) {
      await errorLogger.log(error, { operation: "toggle_cron_job", jobId: cronJob.jobid });
      toast({
        title: "Error",
        description: "Failed to toggle cron job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRunCronJobNow = async (cronJob: CronJob) => {
    // Mark as running
    setRunningCronJobs((prev) => new Set(prev).add(cronJob.jobid));
    setCronJobStartTimes((prev) => new Map(prev).set(cronJob.jobid, Date.now()));

    toast({
      title: "Cron Job Started",
      description: `${cronJob.jobname} is now running. This may take several minutes for large datasets.`,
    });

    // Get baseline counts before running
    let baselineCounts: { vectors: number; transforms: number; intents: number; social: number } | null = null;
    try {
      const { data: baseline } = await supabase.rpc("get_cron_job_progress" as any);
      if (baseline) {
        baselineCounts = {
          vectors: baseline.vector_count || 0,
          transforms: baseline.transform_count || 0,
          intents: baseline.intent_count || 0,
          social: baseline.social_count || 0,
        };
      }
    } catch {
      // Continue without baseline
    }

    try {
      // Start the job - this returns immediately but job runs in background
      const { error } = await supabase.rpc("run_cron_job_now" as any, { p_command: cronJob.command });

      if (error) throw error;

      // Poll for completion by checking if data is changing
      const pollInterval = 5000; // 5 seconds
      const maxPolls = 60; // Max 5 minutes
      let pollCount = 0;
      let lastCount = 0;
      let stableCount = 0;

      const checkProgress = async () => {
        pollCount++;

        try {
          // Check current counts
          const { data: counts } = await supabase.rpc("get_cron_job_progress" as any);

          if (counts) {
            const currentTotal =
              (counts.vector_count || 0) +
              (counts.transform_count || 0) +
              (counts.intent_count || 0) +
              (counts.social_count || 0);

            if (currentTotal === lastCount) {
              stableCount++;
            } else {
              stableCount = 0;
            }
            lastCount = currentTotal;

            // If counts stable for 3 polls (15 seconds) or max polls reached, consider done
            if (stableCount >= 3 || pollCount >= maxPolls) {
              const startTime = cronJobStartTimes.get(cronJob.jobid);
              const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

              setRunningCronJobs((prev) => {
                const next = new Set(prev);
                next.delete(cronJob.jobid);
                return next;
              });
              setCronJobStartTimes((prev) => {
                const next = new Map(prev);
                next.delete(cronJob.jobid);
                return next;
              });

              toast({
                title: "Cron Job Completed",
                description: `${cronJob.jobname} finished in ${elapsed} seconds.`,
              });
              return;
            }
          }

          // Continue polling
          setTimeout(checkProgress, pollInterval);
        } catch {
          // Continue polling on error
          setTimeout(checkProgress, pollInterval);
        }
      };

      // Start polling after a brief delay
      setTimeout(checkProgress, pollInterval);
    } catch (error) {
      await errorLogger.log(error, { operation: "run_cron_job_now", jobId: cronJob.jobid });

      setRunningCronJobs((prev) => {
        const next = new Set(prev);
        next.delete(cronJob.jobid);
        return next;
      });
      setCronJobStartTimes((prev) => {
        const next = new Map(prev);
        next.delete(cronJob.jobid);
        return next;
      });

      toast({
        title: "Error",
        description: "Failed to run cron job. Check logs for details.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCronSchedule = async (cronJob: CronJob, newSchedule: string) => {
    try {
      const { error } = await supabase.rpc("update_cron_schedule" as any, {
        p_jobid: cronJob.jobid,
        p_schedule: newSchedule,
      });

      if (error) throw error;

      toast({
        title: "Schedule Updated",
        description: `${cronJob.jobname} schedule updated to "${newSchedule}".`,
      });

      await fetchCronJobs();
    } catch (error) {
      await errorLogger.log(error, { operation: "update_cron_schedule", jobId: cronJob.jobid });
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Visibility-aware polling for job status updates
  const handlePollJobs = useCallback(async () => {
    await Promise.all([fetchJobs(), fetchJobMetrics(), fetchEnrichMetrics(), fetchStreamingMetrics()]);
  }, []);

  // Use visibility-aware polling - jobs continue in background, UI updates pause when hidden
  useVisibilityAwarePolling({
    visibleInterval: 10000, // Poll every 10s when visible
    hiddenInterval: 0, // Stop polling when hidden (jobs still run on server)
    enabled: true,
    onPoll: handlePollJobs,
  });

  // Initial fetch
  useEffect(() => {
    fetchJobs();
    fetchCronJobs();
    fetchJobMetrics();
    fetchEnrichMetrics();
    fetchStreamingMetrics();
  }, []);

  // Handle job scheduling with recurrence
  const handleScheduleJob = async (job: Job, nextRunAt: string, recurrence: RecurrenceConfig | null) => {
    try {
      const newConfig = {
        ...job.configuration,
        recurrence: recurrence,
      };

      const { error } = await supabase
        .from("jobs")
        .update({
          configuration: newConfig,
          next_run_at: nextRunAt,
        })
        .eq("id", job.id);

      if (error) throw error;

      toast({
        title: "Job Scheduled",
        description: recurrence
          ? `${job.job_name} scheduled to run ${recurrence.type} at ${recurrence.time}`
          : `${job.job_name} scheduled for ${format(new Date(nextRunAt), "PPP 'at' HH:mm")}`,
      });

      await fetchJobs();
    } catch (error) {
      await errorLogger.log(error, { operation: "schedule_job", jobId: job.id });
      toast({
        title: "Error",
        description: "Failed to schedule job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRunJob = async (job: Job) => {
    try {
      setRunningJobs((prev) => new Set([...prev, job.id]));

      // Full refresh requires orchestrator - redirect to parallel execution
      if (job.job_type === "full_refresh") {
        setRunningJobs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(job.id);
          return newSet;
        });
        await handleRunParallel(job);
        return;
      }

      // v13 recommendation cache refresh: only run per-user jobs from UI
      if (job.job_type === "refresh_reco_v13") {
        const config = job.configuration || {};
        const userId = config.user_id;
        const candidateLimit = config.candidate_limit ?? 500;

        if (!userId) {
          throw new Error(
            "refresh_reco_v13 batch jobs should be executed by the server-side orchestrator. Set configuration.user_id to run a per-user refresh from the admin UI.",
          );
        }

        // Reset job status and counter before starting
        await supabase
          .from("jobs")
          .update({
            status: "running",
            is_active: true,
            error_message: null,
            total_titles_processed: 0,
            last_run_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        toast({
          title: "Job Started",
          description: `${job.job_name} is now running (user: ${userId}).`,
        });

        const { data: refreshedCount, error: rpcError } = await supabase.rpc(
          "refresh_user_recommendation_candidates_v13" as any,
          { p_user_id: userId, p_k: candidateLimit },
        );

        if (rpcError) throw rpcError;

        // Clear stale flag (best effort) - use type assertion since table may not be in types
        await (supabase.from("user_recommendation_candidates_v13" as any) as any).update({ is_stale: false }).eq("user_id", userId);

        await supabase
          .from("jobs")
          .update({
            status: "completed",
            error_message: null,
            total_titles_processed: Number(refreshedCount ?? 0),
          })
          .eq("id", job.id);

        toast({
          title: "Job Completed",
          description: `Refreshed ${Number(refreshedCount ?? 0)} candidates for user.`,
        });

        await fetchJobs();
        return;
      }

      let functionName: string | null = null;
      let rpcName: string | null = null;
      let rpcParams: any = {};
      let functionBody: any = {};
      let resetConfig = false;

      // Map job types to their execution method (edge function or RPC)
      switch (job.job_type) {
        case "sync_delta":
          functionName = "sync-titles-delta";
          break;
        case "enrich_trailers":
          functionName = "enrich-title-trailers";
          functionBody = { jobId: job.id };
          break;
        case "transcribe_trailers":
          functionName = "transcribe-trailers";
          functionBody = { jobId: job.id };
          break;
        case "classify_ai":
          functionName = "classify-title-ai";
          functionBody = { jobId: job.id };
          resetConfig = true;
          break;
        case "promote_ai":
          functionName = "promote-title-ai";
          functionBody = { batchSize: job.configuration?.batch_size || 50 };
          break;
        case "enrich_details":
          functionName = "enrich-title-details-batch";
          functionBody = { jobId: job.id };
          break;
        case "fix_streaming":
          // Uses cursor-based loop - handle separately
          await handleFixStreamingJob(job);
          return;
        case "reco_orchestrator":
        case "refresh_reco_caches":
          // These run RPC functions
          rpcName = "run_recommendation_refresh";
          rpcParams = { p_mode: job.configuration?.mode || "hot" };
          break;
        case "rt_quality_estimation":
          // RT quality estimation uses an RPC
          rpcName = "upsert_title_quality_proxy";
          rpcParams = {};
          break;
        default:
          toast({
            title: "Unsupported Job",
            description: `Job type "${job.job_type}" is not yet implemented for manual execution.`,
            variant: "destructive",
          });
          setRunningJobs((prev) => {
            const newSet = new Set(prev);
            newSet.delete(job.id);
            return newSet;
          });
          return;
      }

      // Reset job status and counter before starting
      const updatePayload: any = {
        status: "running",
        is_active: true, // Re-enable is_active in case it was stopped before
        error_message: null,
        total_titles_processed: 0,
        last_run_at: new Date().toISOString(),
      };

      // For classify_ai, reset the cursor so it starts fresh
      if (resetConfig) {
        updatePayload.configuration = {};
      }

      await supabase.from("jobs").update(updatePayload).eq("id", job.id);

      toast({
        title: "Job Started",
        description: `${job.job_name} is now running. This may take several minutes...`,
      });

      // Execute either edge function or RPC based on job type
      if (functionName) {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: functionBody,
        });

        if (error) throw error;

        // Update job status on completion
        await supabase
          .from("jobs")
          .update({
            status: "completed",
            error_message: null,
          })
          .eq("id", job.id);

        toast({
          title: "Job Completed",
          description: data?.message || `${job.job_name} completed successfully.`,
        });
      } else if (rpcName) {
        const { data, error } = await supabase.rpc(rpcName as any, rpcParams);

        if (error) throw error;

        // Update job status on completion
        await supabase
          .from("jobs")
          .update({
            status: "completed",
            error_message: null,
            total_titles_processed: typeof data === "number" ? data : 0,
          })
          .eq("id", job.id);

        toast({
          title: "Job Completed",
          description: `${job.job_name} completed successfully.${typeof data === "number" ? ` Processed ${data} items.` : ""}`,
        });
      }

      await fetchJobs();
    } catch (error: any) {
      // Mark job as failed
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: error?.message || "Unknown error",
        })
        .eq("id", job.id);

      await errorLogger.log(error, {
        operation: "run_job",
        jobId: job.id,
        jobType: job.job_type,
      });
      toast({
        title: "Job Failed",
        description: error?.message || "Failed to run the job. Please check the logs.",
        variant: "destructive",
      });
      await fetchJobs();
    } finally {
      setRunningJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  // Special handler for fix_streaming that loops until all batches are processed
  // Uses cursor-based pagination to ensure no titles are skipped or reprocessed
  const handleFixStreamingJob = async (job: Job) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds

    // Helper to invoke edge function with retry logic
    const invokeWithRetry = async (cursor: string | null, batchSize: number): Promise<any> => {
      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke("fix-streaming-availability", {
            body: { dryRun: false, batchSize, cursor },
          });

          if (error) throw error;
          return data;
        } catch (err: any) {
          lastError = err;
          logger.warn(`[fix_streaming] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message || err);

          // Only retry on network/fetch errors
          if (
            attempt < MAX_RETRIES &&
            (err.name === "FunctionsFetchError" ||
              err.message?.includes("Failed to fetch") ||
              err.message?.includes("network") ||
              err.message?.includes("timeout"))
          ) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    };

    try {
      const config = job.configuration || {};
      const batchSize = config.batch_size || 50;

      // Check if we should resume from a saved cursor
      const savedCursor = config.last_cursor || null;
      const isResuming = !!savedCursor;

      // Reset job status and counter before starting
      await supabase
        .from("jobs")
        .update({
          status: "running",
          is_active: true,
          error_message: null,
          total_titles_processed: isResuming ? job.total_titles_processed || 0 : 0,
          last_run_at: new Date().toISOString(),
          // Only clear cursor if not resuming
          configuration: isResuming ? config : { ...config, last_cursor: null },
        })
        .eq("id", job.id);

      toast({
        title: isResuming ? "Job Resuming" : "Job Started",
        description: isResuming
          ? `${job.job_name} resuming from saved position...`
          : `${job.job_name} is now running. Processing in batches of ${batchSize}...`,
      });

      let batchCount = 0;
      let totalFixed = 0;
      let totalProcessed = 0;
      let cursor: string | null = savedCursor;
      let consecutiveEmptyBatches = 0;
      const MAX_EMPTY_BATCHES = 3;
      const MAX_BATCHES = 10000; // Safety limit

      // Loop until all batches are processed
      while (batchCount < MAX_BATCHES) {
        batchCount++;

        // Check if job was stopped
        const { data: jobStatus } = await supabase.from("jobs").select("is_active").eq("id", job.id).single();

        if (!jobStatus?.is_active) {
          // Save current cursor so we can resume later
          await supabase
            .from("jobs")
            .update({
              configuration: { ...config, last_cursor: cursor },
              status: "idle",
            })
            .eq("id", job.id);

          toast({
            title: "Job Stopped",
            description: `${job.job_name} was stopped after ${batchCount - 1} batches. Fixed ${totalFixed} titles. Can resume from this point.`,
          });
          break;
        }

        const data = await invokeWithRetry(cursor, batchSize);

        if (data?.stopped) {
          toast({
            title: "Job Stopped",
            description: data.message || `${job.job_name} was stopped.`,
          });
          break;
        }

        const batchFixed = data?.fixed || 0;
        const batchProcessed = data?.processed || 0;

        totalFixed += batchFixed;
        totalProcessed += batchProcessed;

        // Update cursor for next batch
        cursor = data?.nextCursor || null;

        // Save cursor to job config every batch so we can resume on failure
        await supabase
          .from("jobs")
          .update({
            configuration: { ...config, last_cursor: cursor },
            total_titles_processed: (job.total_titles_processed || 0) + totalProcessed,
          })
          .eq("id", job.id);

        // Track empty batches - if we get too many in a row, something is wrong
        if (batchProcessed === 0) {
          consecutiveEmptyBatches++;
          if (consecutiveEmptyBatches >= MAX_EMPTY_BATCHES) {
            break;
          }
        } else {
          consecutiveEmptyBatches = 0;
        }

        // If done, break out of loop
        if (data?.done) {
          await supabase
            .from("jobs")
            .update({
              status: "completed",
              configuration: { ...config, last_cursor: null }, // Clear cursor on completion
            })
            .eq("id", job.id);

          toast({
            title: "Job Completed",
            description: `${job.job_name} completed! Fixed ${totalFixed} titles across ${batchCount} batches.`,
          });
          break;
        }

        // If remaining is 0, we're done
        if (data?.remaining === 0) {
          await supabase
            .from("jobs")
            .update({
              status: "completed",
              configuration: { ...config, last_cursor: null }, // Clear cursor on completion
            })
            .eq("id", job.id);

          toast({
            title: "Job Completed",
            description: `${job.job_name} completed! Fixed ${totalFixed} titles across ${batchCount} batches.`,
          });
          break;
        }

        // Small delay between batches (2 seconds to be safe with TMDB rate limits)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Refresh job list every 5 batches to show progress
        if (batchCount % 5 === 0) {
          await fetchJobs();
          await fetchStreamingMetrics();
        }
      }

      if (batchCount >= MAX_BATCHES) {
        logger.warn(`[fix_streaming] Hit max batch limit of ${MAX_BATCHES}`);
        toast({
          title: "Job Paused",
          description: `Processed ${MAX_BATCHES} batches. Run again to continue.`,
        });
      }

      await fetchJobs();
      await fetchStreamingMetrics();
    } catch (error: any) {
      // Save cursor so we can resume from where we left off
      const config = job.configuration || {};
      await errorLogger.log(error, {
        operation: "run_fix_streaming_job",
        jobId: job.id,
      });

      toast({
        title: "Job Failed",
        description: `Error: ${error.message || "Unknown error"}. Job can be resumed.`,
        variant: "destructive",
      });

      // Mark as failed but keep the cursor so it can resume
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: String(error),
          // Keep the cursor in config so we can resume
        })
        .eq("id", job.id);
    } finally {
      setRunningJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const handleRunParallel = async (job: Job) => {
    try {
      const config = job.configuration;

      if (job.job_type === "enrich_trailers") {
        // For trailer enrichment, divide work by batch offset
        const { count } = await supabase
          .from("titles")
          .select("*", { count: "exact", head: true })
          .not("tmdb_id", "is", null)
          .is("trailer_url", null);

        const totalTitles = count || 0;
        const batchSize = config.batch_size || 50;
        const numChunks = Math.ceil(totalTitles / batchSize);

        // Reset the job counter and tracking
        const trailerJobStartTime = Date.now();
        const resetConfig = {
          ...config,
          total_threads: numChunks,
          start_time: trailerJobStartTime,
          thread_tracking: { succeeded: 0, failed: 0 },
        };

        await supabase
          .from("jobs")
          .update({
            status: "running",
            total_titles_processed: 0,
            error_message: null, // Clear any previous error messages
            configuration: resetConfig,
            last_run_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        setParallelProgress({
          jobId: job.id,
          currentThread: 0,
          totalThreads: numChunks,
          succeeded: 0,
          failed: 0,
          titlesProcessed: 0,
        });

        toast({
          title: "Parallel Trailer Enrichment Started",
          description: `Processing ${numChunks} batches with ${batchSize} titles each. Total: ${totalTitles} titles.`,
        });

        // Fire off all batches with staggered delays
        for (let i = 0; i < numChunks; i++) {
          const delayMs = i * 3000; // 3 second stagger

          setTimeout(async () => {
            try {
              await supabase.functions.invoke("enrich-title-trailers", {
                body: {
                  batchSize,
                  startOffset: i * batchSize,
                  jobId: job.id,
                },
              });
            } catch (error) {
              // Batch invocation failed - will be retried on next run
            }
          }, delayMs);
        }

        // Poll for progress
        const pollInterval = setInterval(async () => {
          const { data: updatedJob } = await supabase
            .from("jobs")
            .select("total_titles_processed, status, configuration")
            .eq("id", job.id)
            .single();

          if (updatedJob) {
            const jobConfig = (updatedJob.configuration as any) || {};
            const tracking = jobConfig.thread_tracking || { succeeded: 0, failed: 0 };
            const threadsCompleted = tracking.succeeded + tracking.failed;

            setParallelProgress({
              jobId: job.id,
              currentThread: threadsCompleted,
              totalThreads: numChunks,
              succeeded: tracking.succeeded,
              failed: tracking.failed,
              titlesProcessed: updatedJob.total_titles_processed || 0,
            });

            if (threadsCompleted >= numChunks) {
              // Calculate total job duration
              const trailerStartTime = jobConfig.start_time || Date.now();
              const trailerEndTime = Date.now();
              const durationSeconds = Math.floor((trailerEndTime - trailerStartTime) / 1000);

              // All chunks completed
              await supabase
                .from("jobs")
                .update({
                  status: "completed",
                  last_run_duration_seconds: durationSeconds,
                  error_message: tracking.failed > 0 ? `Completed with ${tracking.failed} failed chunk(s)` : null,
                })
                .eq("id", job.id);

              clearInterval(pollInterval);
              setParallelProgress(null);
              await fetchJobs(); // Refresh job list
            }
          }
        }, 10000);

        setTimeout(() => {
          clearInterval(pollInterval);
          setParallelProgress(null);
        }, 7200000); // 2 hours max

        return;
      }

      // Original full_refresh parallel logic
      const startYear = config.start_year || 2020;
      const endYear = config.end_year || 2025;

      // Fetch languages from database
      const { data: languages } = await supabase.from("spoken_languages").select("iso_639_1").order("iso_639_1");

      const languageCodes = languages?.map((l) => l.iso_639_1) || [];

      // TMDB Genre IDs that we'll process
      const genreIds = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37];

      // Create fine-grained chunks: 1 language + 1 year + 1 genre per job
      const chunks: Array<{ languageCode: string; year: number; genreId: number }> = [];

      for (const langCode of languageCodes) {
        for (let year = startYear; year <= endYear; year++) {
          for (const genreId of genreIds) {
            chunks.push({ languageCode: langCode, year, genreId });
          }
        }
      }

      // Reset the job counter and thread tracking before starting parallel processing
      const resetConfig = {
        ...config,
        total_threads: chunks.length,
        total_work_units: chunks.length,
        completed_work_units: [],
        failed_work_units: [],
        thread_tracking: { succeeded: 0, failed: 0 },
      };

      const jobStartTime = Date.now();
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          status: "running",
          total_titles_processed: 0,
          error_message: null, // Clear any previous error messages
          configuration: {
            ...resetConfig,
            start_time: jobStartTime,
          },
          last_run_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (updateError) {
        toast({
          title: "Failed to Start Job",
          description: "Could not update job status to 'running'. Check console for details.",
          variant: "destructive",
        });
        return;
      }

      // Verify the status was actually updated
      const { data: verifyJob, error: verifyError } = await supabase
        .from("jobs")
        .select("status, error_message")
        .eq("id", job.id)
        .single();

      if (verifyError || verifyJob?.status !== "running") {
        toast({
          title: "Job Status Update Failed",
          description: `Job status is '${verifyJob?.status}' instead of 'running'. Cannot start threads.`,
          variant: "destructive",
        });
        return;
      }

      // Initialize progress tracking
      setParallelProgress({
        jobId: job.id,
        currentThread: 0,
        totalThreads: chunks.length,
        succeeded: 0,
        failed: 0,
        titlesProcessed: 0,
      });

      // Determine starting point for resume functionality
      const existingTracking = (job.configuration as any)?.thread_tracking || { succeeded: 0, failed: 0 };
      const startIndex = existingTracking.succeeded + existingTracking.failed;
      const isResume = startIndex > 0;

      const batchSize = 20;
      const totalBatches = Math.ceil((chunks.length - startIndex) / batchSize);
      const estimatedMinutes = Math.ceil(totalBatches * 0.5); // ~30s per batch

      toast({
        title: isResume ? "Resuming Parallel Jobs" : "Starting Parallel Jobs",
        description: isResume
          ? `Resuming from thread ${startIndex + 1}. Processing ${chunks.length - startIndex} threads in batches of ${batchSize}. Est: ${estimatedMinutes} min.`
          : `Processing ${chunks.length} threads in ${totalBatches} batches of ${batchSize} concurrently. Est: ${estimatedMinutes} min. Job continues in background.`,
      });

      // Invoke the orchestrator edge function - it will handle all dispatching server-side
      try {
        const { error: orchestratorError } = await supabase.functions.invoke("full-refresh-orchestrator", {
          body: {
            jobId: job.id,
            chunks: chunks,
            startIndex: startIndex,
          },
        });

        if (orchestratorError) {
          throw orchestratorError;
        }

        toast({
          title: "Orchestrator Started",
          description: `Backend is dispatching ${chunks.length - startIndex} threads in batches of 10 with 10s delays. Estimated time: ~1-2 hours.`,
        });
      } catch (error) {
        toast({
          title: "Orchestrator Failed",
          description: "Failed to start backend orchestrator. Check logs for details.",
          variant: "destructive",
        });
        return;
      }

      // Now poll the database every 10 seconds to track actual progress
      const pollInterval = setInterval(async () => {
        const { data: updatedJob } = await supabase
          .from("jobs")
          .select("total_titles_processed, status, configuration")
          .eq("id", job.id)
          .single();

        if (updatedJob) {
          const jobConfig = (updatedJob.configuration as any) || {};
          const completedUnits = jobConfig.completed_work_units || [];
          const failedUnits = jobConfig.failed_work_units || [];
          const tracking = jobConfig.thread_tracking || {
            succeeded: completedUnits.length,
            failed: failedUnits.length,
          };

          setParallelProgress({
            jobId: job.id,
            currentThread: completedUnits.length + failedUnits.length,
            totalThreads: chunks.length,
            succeeded: completedUnits.length,
            failed: failedUnits.length,
            titlesProcessed: updatedJob.total_titles_processed || 0,
          });

          // Check if job status changed to completed or failed/idle (stopped)
          if (updatedJob.status === "completed" || updatedJob.status === "failed" || updatedJob.status === "idle") {
            clearInterval(pollInterval);
            setParallelProgress(null);
            await fetchJobs(); // Refresh job list
          }
        }
      }, 10000); // Poll every 10 seconds

      // Keep polling for up to 2 hours to let edge functions finish
      setTimeout(() => {
        clearInterval(pollInterval);
        setParallelProgress(null);
      }, 7200000); // 2 hours
    } catch (error) {
      await errorLogger.log(error, {
        operation: "run_parallel_jobs",
        jobId: job.id,
      });
      toast({
        title: "Parallel Jobs Failed",
        description: "Failed to run parallel jobs. Please check the logs.",
        variant: "destructive",
      });
    }
  };

  const handleStopJob = async (job: Job) => {
    try {
      const stopTimestamp = new Date().toISOString();

      // Stop the job - use 'idle' status (allowed by check constraint)
      const { data, error } = await supabase
        .from("jobs")
        .update({
          status: "idle",
          is_active: false,
          error_message: `Job manually stopped by administrator at ${stopTimestamp}`,
        })
        .eq("id", job.id)
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Update failed - no rows modified");
      }

      // Clear parallel progress UI immediately
      setParallelProgress(null);
      setJobToStop(null);

      toast({
        title: "Job Stopped",
        description: `${job.job_name} has been stopped.`,
      });

      await fetchJobs();
    } catch (error: any) {
      await errorLogger.log(error, {
        operation: "stop_job",
        jobId: job.id,
        errorMessage: error?.message,
      });
      toast({
        title: "Error",
        description: error?.message || "Failed to stop job. Please try again.",
        variant: "destructive",
      });
      setJobToStop(null);
    }
  };

  const confirmStopJob = (job: Job) => {
    setJobToStop(job);
  };

  const handleResumeJob = async (job: Job) => {
    try {
      const config = job.configuration || {};
      const completedWorkUnits = config.completed_work_units || [];
      const failedWorkUnits = config.failed_work_units || [];

      // If there are failed work units, retry those specifically
      if (failedWorkUnits.length > 0) {
        const chunksToRetry = failedWorkUnits.map((wu: any) => ({
          languageCode: wu.languageCode,
          year: wu.year,
          genreId: wu.genreId,
        }));

        // Clear failed_work_units and update job status
        const { error: updateError } = await supabase
          .from("jobs")
          .update({
            status: "running",
            error_message: null,
            configuration: {
              ...config,
              failed_work_units: [], // Clear failed units before retry
            },
            last_run_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        if (updateError) throw updateError;

        setParallelProgress({
          jobId: job.id,
          currentThread: completedWorkUnits.length,
          totalThreads: completedWorkUnits.length + chunksToRetry.length,
          succeeded: completedWorkUnits.length,
          failed: 0,
          titlesProcessed: job.total_titles_processed || 0,
        });

        toast({
          title: "Retrying Failed Units",
          description: `Retrying ${chunksToRetry.length} failed work units.`,
        });

        // Invoke orchestrator with failed chunks
        const { error: orchestratorError } = await supabase.functions.invoke("full-refresh-orchestrator", {
          body: {
            jobId: job.id,
            chunks: chunksToRetry,
            startIndex: 0,
          },
        });

        if (orchestratorError) throw orchestratorError;

        // Poll for progress
        const totalChunks = completedWorkUnits.length + chunksToRetry.length;
        const pollInterval = setInterval(async () => {
          const { data: updatedJob } = await supabase
            .from("jobs")
            .select("total_titles_processed, status, configuration")
            .eq("id", job.id)
            .single();

          if (updatedJob) {
            const jobConfig = (updatedJob.configuration as any) || {};
            const completed = jobConfig.completed_work_units?.length || 0;
            const failed = jobConfig.failed_work_units?.length || 0;

            setParallelProgress({
              jobId: job.id,
              currentThread: completed + failed,
              totalThreads: totalChunks,
              succeeded: completed,
              failed: failed,
              titlesProcessed: updatedJob.total_titles_processed || 0,
            });

            if (updatedJob.status === "completed" || updatedJob.status === "failed" || updatedJob.status === "idle") {
              clearInterval(pollInterval);
              setParallelProgress(null);
              await fetchJobs();
            }
          }
        }, 10000);

        setTimeout(() => {
          clearInterval(pollInterval);
          setParallelProgress(null);
        }, 7200000);

        return;
      }

      // Build the complete set of work units
      const startYear = config.start_year || 2020;
      const endYear = config.end_year || 2025;

      const { data: languages } = await supabase.from("spoken_languages").select("iso_639_1").order("iso_639_1");

      const languageCodes = languages?.map((l) => l.iso_639_1) || [];
      const genreIds = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37];

      // Create all chunks
      const allChunks: Array<{ languageCode: string; year: number; genreId: number }> = [];
      for (const langCode of languageCodes) {
        for (let year = startYear; year <= endYear; year++) {
          for (const genreId of genreIds) {
            allChunks.push({ languageCode: langCode, year, genreId });
          }
        }
      }

      // Filter out already completed work units
      const completedSet = new Set(completedWorkUnits.map((wu: any) => `${wu.languageCode}-${wu.year}-${wu.genreId}`));

      const remainingChunks = allChunks.filter(
        (chunk) => !completedSet.has(`${chunk.languageCode}-${chunk.year}-${chunk.genreId}`),
      );

      if (remainingChunks.length === 0) {
        toast({
          title: "Job Already Complete",
          description: "All work units have been processed successfully.",
        });
        return;
      }

      // Update job status to running, clear error message
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          status: "running",
          error_message: null, // CRITICAL: Clear error message for resume
          last_run_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (updateError) throw updateError;

      setParallelProgress({
        jobId: job.id,
        currentThread: completedWorkUnits.length,
        totalThreads: allChunks.length,
        succeeded: completedWorkUnits.length,
        failed: config.failed_work_units?.length || 0,
        titlesProcessed: job.total_titles_processed || 0,
      });

      toast({
        title: "Resuming Job",
        description: `Resuming from ${completedWorkUnits.length} completed. ${remainingChunks.length} work units remaining.`,
      });

      // Invoke orchestrator with remaining chunks
      const { error: orchestratorError } = await supabase.functions.invoke("full-refresh-orchestrator", {
        body: {
          jobId: job.id,
          chunks: remainingChunks,
          startIndex: 0,
        },
      });

      if (orchestratorError) throw orchestratorError;

      // Poll for progress
      const pollInterval = setInterval(async () => {
        const { data: updatedJob } = await supabase
          .from("jobs")
          .select("total_titles_processed, status, configuration")
          .eq("id", job.id)
          .single();

        if (updatedJob) {
          const jobConfig = (updatedJob.configuration as any) || {};
          const completed = jobConfig.completed_work_units?.length || 0;
          const failed = jobConfig.failed_work_units?.length || 0;

          setParallelProgress({
            jobId: job.id,
            currentThread: completed + failed,
            totalThreads: allChunks.length,
            succeeded: completed,
            failed: failed,
            titlesProcessed: updatedJob.total_titles_processed || 0,
          });

          // Check if job status changed to completed, failed, or idle (stopped)
          if (updatedJob.status === "completed" || updatedJob.status === "failed" || updatedJob.status === "idle") {
            clearInterval(pollInterval);
            setParallelProgress(null);
            await fetchJobs();
          }
        }
      }, 10000);

      setTimeout(() => {
        clearInterval(pollInterval);
        setParallelProgress(null);
      }, 7200000);
    } catch (error) {
      await errorLogger.log(error, {
        operation: "resume_job",
        jobId: job.id,
      });
      toast({
        title: "Resume Failed",
        description: "Failed to resume job. Please check the logs.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (job: Job) => {
    try {
      const { error } = await supabase.from("jobs").update({ is_active: !job.is_active }).eq("id", job.id);

      if (error) throw error;

      toast({
        title: job.is_active ? "Job Paused" : "Job Activated",
        description: `${job.job_name} has been ${job.is_active ? "paused" : "activated"}.`,
      });

      await fetchJobs();
    } catch (error) {
      await errorLogger.log(error, {
        operation: "toggle_job_active",
        jobId: job.id,
      });
      toast({
        title: "Error",
        description: "Failed to update job status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateConfig = async (job: Job, newConfig: any, nextRunAt?: string) => {
    try {
      const updateData: any = { configuration: newConfig };
      if (nextRunAt) {
        updateData.next_run_at = nextRunAt;
      }

      const { error } = await supabase.from("jobs").update(updateData).eq("id", job.id);

      if (error) throw error;

      toast({
        title: "Configuration Updated",
        description: `${job.job_name} configuration has been updated.`,
      });

      await fetchJobs();
    } catch (error) {
      await errorLogger.log(error, {
        operation: "update_job_config",
        jobId: job.id,
      });
      toast({
        title: "Error",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      idle: "secondary",
      running: "default",
      completed: "default",
      paused: "outline",
      failed: "destructive",
    };

    return <Badge variant={variants[status] || "secondary"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getLastRunStatusBadge = (job: Job) => {
    // If job has never run, return N/A
    if (!job.last_run_at) {
      return <Badge variant="outline">Never Run</Badge>;
    }
    // Determine status based on error_message and current status
    if (job.error_message && job.status === "failed") {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (job.status === "completed" || (!job.error_message && job.last_run_at)) {
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Completed</Badge>;
    }
    if (job.status === "running") {
      return <Badge variant="default">In Progress</Badge>;
    }
    // If there's an error message but status is idle (stopped manually)
    if (job.error_message) {
      return <Badge variant="outline">Stopped</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stop Job Confirmation Dialog */}
      <AlertDialog open={!!jobToStop} onOpenChange={(open) => !open && setJobToStop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Job?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop "{jobToStop?.job_name}"? This will halt all processing and you'll need to
              restart it manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => jobToStop && handleStopJob(jobToStop)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Stop Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Jobs</h2>
          <p className="text-muted-foreground">Manage automated title sync jobs</p>
        </div>
        <Button onClick={fetchJobs} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {jobs.map((job) => (
          <Card key={job.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{job.job_name}</CardTitle>
                  <CardDescription>
                    {job.job_type === "full_refresh"
                      ? "Manual full refresh of title catalog"
                      : job.job_type === "refresh_reco_v13"
                        ? "Refresh v13 recommendation cache (per-user in UI; batch via orchestrator)"
                        : job.job_type === "enrich_trailers"
                          ? "Enrich titles with trailer URLs"
                          : job.job_type === "transcribe_trailers"
                            ? "Transcribe trailer videos to text"
                            : job.job_type === "classify_emotions"
                              ? "Classify title emotions using AI"
                              : job.job_type === "promote_emotions"
                                ? "Promote classified emotions to primary table"
                                : job.job_type === "classify_intents"
                                  ? "Classify title viewing intents using AI"
                                  : job.job_type === "promote_intents"
                                    ? "Promote classified intents to primary table"
                                    : job.job_type === "classify_ai"
                                      ? "Combined AI classification (emotions + intents in one call)"
                                      : job.job_type === "promote_ai"
                                        ? "Combined promotion (emotions + intents from staging to primary)"
                                        : "Automated nightly sync for new titles"}
                  </CardDescription>
                </div>
                {getStatusBadge(job.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Job-specific Metrics for Classify AI (Combined) */}
              {job.job_type === "classify_ai" && jobMetrics && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3 text-sm bg-muted/50 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {(jobMetrics.totalTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Titles</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {(jobMetrics.emotionPrimaryTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Emotions (Primary)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">
                        {(jobMetrics.emotionStagingTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Emotions (Staging)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {(jobMetrics.emotionUnclassified ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Unclassified</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm bg-muted/50 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {job.total_titles_processed.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Classified (Run)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {(jobMetrics.intentPrimaryTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Intents (Primary)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">
                        {(jobMetrics.intentStagingTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Intents (Staging)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {(jobMetrics.intentUnclassified ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Unclassified</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job-specific Metrics for Promote AI (Combined) - Same layout as Classify AI */}
              {job.job_type === "promote_ai" && jobMetrics && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3 text-sm bg-muted/50 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {(jobMetrics.totalTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Titles</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {(jobMetrics.emotionPrimaryTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Emotions (Primary)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">
                        {(jobMetrics.emotionStagingTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Emotions (Staging)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {(jobMetrics.emotionUnclassified ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Unclassified</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm bg-muted/50 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {job.total_titles_processed.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Promoted (Run)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {(jobMetrics.intentPrimaryTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Intents (Primary)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">
                        {(jobMetrics.intentStagingTitles ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Intents (Staging)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {(jobMetrics.intentUnclassified ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Unclassified</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enrich Details Job Stats */}
              {job.job_type === "enrich_details" && (
                <div className="space-y-3">
                  {/* Enrich metrics grid */}
                  <div className="grid grid-cols-5 gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-base font-bold text-green-500">
                        {job.total_titles_processed.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Enriched</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-red-500">
                        {(enrichMetrics?.pendingPoster ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">No Poster</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-orange-500">
                        {(enrichMetrics?.pendingOverview ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">No Overview</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-yellow-500">
                        {(enrichMetrics?.pendingTrailer ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">No Trailer</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-purple-500">
                        {(enrichMetrics?.pendingTranscript ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">No Transcript</div>
                    </div>
                  </div>
                  {/* Last run info */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Last Run
                      </div>
                      <div className="font-medium">{formatDate(job.last_run_at)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        Next Run
                      </div>
                      <div className="font-medium">{formatDate(job.next_run_at)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Last Run Status</div>
                      <div className="font-medium">{getLastRunStatusBadge(job)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fix Streaming Job Stats */}
              {job.job_type === "fix_streaming" && (
                <div className="space-y-4">
                  {/* Streaming fix metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-500">
                        {(streamingMetrics?.pendingFix ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Pending Fix</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">
                        {(streamingMetrics?.totalFixed ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Fixed</div>
                    </div>
                  </div>
                  {/* Last run info */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Last Run
                      </div>
                      <div className="font-medium">{formatDate(job.last_run_at)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        Next Run
                      </div>
                      <div className="font-medium">{formatDate(job.next_run_at)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Last Run Status</div>
                      <div className="font-medium">{getLastRunStatusBadge(job)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Job Stats for other job types */}
              {job.job_type !== "classify_ai" &&
                job.job_type !== "promote_ai" &&
                job.job_type !== "enrich_details" &&
                job.job_type !== "fix_streaming" && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Last Run
                      </div>
                      <div className="font-medium">{formatDate(job.last_run_at)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        Next Run
                      </div>
                      <div className="font-medium">
                        {formatDate(job.next_run_at)}
                        {job.configuration?.recurrence && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {job.configuration.recurrence.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Last Run Status</div>
                      <div className="font-medium">{getLastRunStatusBadge(job)}</div>
                    </div>
                  </div>
                )}

              {/* Last Run info for emotion, intent, and classify_ai/promote_ai jobs */}
              {(job.job_type === "classify_ai" || job.job_type === "promote_ai") && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center text-muted-foreground">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Last Run
                    </div>
                    <div className="font-medium">{formatDate(job.last_run_at)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      Next Run
                    </div>
                    <div className="font-medium">{formatDate(job.next_run_at)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Last Run Status</div>
                    <div className="font-medium">{getLastRunStatusBadge(job)}</div>
                  </div>
                </div>
              )}

              {/* Combined Thread Monitor */}
              {job.job_type === "full_refresh" && job.status === "running" && (
                <ThreadMonitor
                  jobId={job.id}
                  totalWorkUnits={job.configuration?.total_work_units || 1836}
                  isRunning={job.status === "running"}
                  titlesProcessed={job.total_titles_processed || 0}
                />
              )}

              {/* Actions - Consistent for ALL jobs */}
              <div className="flex flex-wrap gap-2 pt-2">
                {/* Run/Stop/Resume button - First priority action */}
                {job.status === "running" && !runningJobs.has(job.id) ? (
                  // Orphaned running job - show Resume/Reset buttons
                  <>
                    <Button
                      onClick={async () => {
                        await supabase.from("jobs").update({ status: "idle" }).eq("id", job.id);
                        await fetchJobs();
                        handleRunJob({ ...job, status: "idle" });
                      }}
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                    <Button
                      onClick={async () => {
                        await supabase.from("jobs").update({ status: "idle" }).eq("id", job.id);
                        await fetchJobs();
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </>
                ) : job.status === "running" ? (
                  // Running job - show Stop button
                  <Button onClick={() => confirmStopJob(job)} variant="destructive" className="flex-1" size="sm">
                    <XCircle className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  // Idle/completed/failed job - show Run Now or Resume button
                  <>
                    {/* Resume button for jobs with progress */}
                    {job.job_type === "full_refresh" &&
                    job.configuration?.completed_work_units?.length > 0 &&
                    job.status !== "completed" ? (
                      <Button
                        onClick={() => handleResumeJob(job)}
                        disabled={runningJobs.has(job.id)}
                        className="flex-1"
                        size="sm"
                      >
                        {runningJobs.has(job.id) ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Resuming...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Resume ({job.configuration.completed_work_units.length} done)
                          </>
                        )}
                      </Button>
                    ) : job.job_type === "fix_streaming" && job.configuration?.last_cursor ? (
                      <Button onClick={() => handleRunJob(job)} disabled={runningJobs.has(job.id)} className="flex-1" size="sm">
                        {runningJobs.has(job.id) ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Resuming...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button onClick={() => handleRunJob(job)} disabled={runningJobs.has(job.id)} className="flex-1" size="sm">
                        {runningJobs.has(job.id) ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Now
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}

                {/* Pause/Continue toggle - Always visible */}
                <Button
                  onClick={() => handleToggleActive(job)}
                  variant={job.is_active ? "outline" : "default"}
                  size="sm"
                  disabled={job.status === "running"}
                  title={job.is_active ? "Pause scheduling" : "Enable scheduling"}
                >
                  {job.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                {/* Schedule button - Always visible */}
                <JobScheduleDialog
                  jobName={job.job_name}
                  currentNextRun={job.next_run_at}
                  onSchedule={(nextRunAt, recurrence) => handleScheduleJob(job, nextRunAt, recurrence)}
                />

                {/* Settings button - Always visible */}
                <JobConfigDialog job={job} onUpdate={handleUpdateConfig} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cron Metrics Dashboard */}
      <CronMetricsDashboard />

      {/* Cron Jobs Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Cron Jobs</h3>
            <p className="text-muted-foreground">Scheduled database functions that run automatically</p>
          </div>
          <Button onClick={fetchCronJobs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {cronLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-12 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cronJobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No cron jobs found. Make sure pg_cron extension is enabled.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cronJobs.map((cronJob) => (
              <Card key={cronJob.jobid}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{cronJob.jobname}</CardTitle>
                      <CardDescription className="font-mono text-xs">{cronJob.schedule}</CardDescription>
                    </div>
                    <Badge variant={cronJob.active ? "default" : "secondary"}>
                      {cronJob.active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Execution Metrics */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Last Run</div>
                      <div className="font-medium">
                        {(cronJob as any).last_run_at 
                          ? format(new Date((cronJob as any).last_run_at), "MMM d, HH:mm")
                          : "Never"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Next Run</div>
                      <div className="font-medium">
                        {(cronJob as any).next_run_at 
                          ? format(new Date((cronJob as any).next_run_at), "MMM d, HH:mm")
                          : cronJob.active ? "Scheduled" : "Paused"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Last Run Status</div>
                      <div className="font-medium">
                        {runningCronJobs.has(cronJob.jobid) ? (
                          <Badge variant="default">In Progress</Badge>
                        ) : (cronJob as any).last_status === 'failed' ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (cronJob as any).last_run_at ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <Badge variant="secondary">Never Run</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-muted-foreground mb-1">Command</div>
                    <code className="block text-xs bg-muted p-2 rounded overflow-x-auto">{cronJob.command}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRunCronJobNow(cronJob)}
                      size="sm"
                      className="flex-1"
                      disabled={runningCronJobs.has(cronJob.jobid)}
                    >
                      {runningCronJobs.has(cronJob.jobid) ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Run Now
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleToggleCronJob(cronJob)}
                      variant={cronJob.active ? "destructive" : "default"}
                      size="sm"
                    >
                      {cronJob.active ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                    <CronConfigDialog cronJob={cronJob} onUpdate={handleUpdateCronSchedule} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface JobConfigDialogProps {
  job: Job;
  onUpdate: (job: Job, config: any, nextRunAt?: string) => Promise<void>;
}

const JobConfigDialog = ({ job, onUpdate }: JobConfigDialogProps) => {
  const [config, setConfig] = useState(job.configuration);
  const [open, setOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    job.next_run_at ? new Date(job.next_run_at) : undefined,
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    job.next_run_at ? format(new Date(job.next_run_at), "HH:mm") : "02:00",
  );

  const handleSave = async () => {
    let nextRunAt: string | undefined;
    if (scheduledDate) {
      const [hours, minutes] = scheduledTime.split(":");
      const date = new Date(scheduledDate);
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      nextRunAt = date.toISOString();
    }
    await onUpdate(job, config, nextRunAt);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {job.job_name}</DialogTitle>
          <DialogDescription>Adjust job parameters and scheduling</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Scheduling Section */}
          <div className="space-y-4 border-b pb-4">
            <h4 className="font-semibold text-sm">Schedule</h4>
            <div className="space-y-2">
              <Label>Next Run Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Time (24-hour format)</Label>
              <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              <p className="text-xs text-muted-foreground">Job will run at this time on the selected date</p>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Configuration</h4>
            {job.job_type === "full_refresh" && (
              <>
                <div className="space-y-2">
                  <Label>Minimum Rating</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={config.min_rating ?? 0}
                    onChange={(e) => setConfig({ ...config, min_rating: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Only fetch titles with rating ≥ this value (0-10)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Year</Label>
                    <Input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={config.start_year || 2020}
                      onChange={(e) => setConfig({ ...config, start_year: parseInt(e.target.value) || 2020 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Year</Label>
                    <Input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={config.end_year || new Date().getFullYear()}
                      onChange={(e) => setConfig({ ...config, end_year: parseInt(e.target.value) || new Date().getFullYear() })}
                    />
                  </div>
                </div>
              </>
            )}

            {(job.job_type === "classify_ai" || job.job_type === "promote_ai") && (
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input
                  type="number"
                  min="10"
                  max="100"
                  value={config.batch_size || 50}
                  onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) || 50 })}
                />
                <p className="text-xs text-muted-foreground">Number of titles to process per batch</p>
              </div>
            )}

            {(job.job_type === "enrich_trailers" || job.job_type === "enrich_details" || job.job_type === "transcribe_trailers") && (
              <>
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={config.batch_size || 50}
                    onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) || 50 })}
                  />
                  <p className="text-xs text-muted-foreground">Number of titles to process per batch</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Runtime (ms)</Label>
                  <Input
                    type="number"
                    min="10000"
                    max="85000"
                    value={config.max_runtime_ms || 55000}
                    onChange={(e) => setConfig({ ...config, max_runtime_ms: parseInt(e.target.value) || 55000 })}
                  />
                  <p className="text-xs text-muted-foreground">Maximum execution time in milliseconds</p>
                </div>
              </>
            )}

            {job.job_type === "fix_streaming" && (
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input
                  type="number"
                  min="10"
                  max="200"
                  value={config.batch_size || 100}
                  onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) || 100 })}
                />
                <p className="text-xs text-muted-foreground">Number of titles to process per batch</p>
              </div>
            )}

            {job.job_type === "sync_delta" && (
              <>
                <div className="space-y-2">
                  <Label>Lookback Days</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={config.lookback_days || 7}
                    onChange={(e) => setConfig({ ...config, lookback_days: parseInt(e.target.value) || 7 })}
                  />
                  <p className="text-xs text-muted-foreground">Number of days to look back for new titles</p>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Rating</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={config.min_rating ?? 0}
                    onChange={(e) => setConfig({ ...config, min_rating: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Only fetch titles with rating ≥ this value</p>
                </div>
              </>
            )}

            {(job.job_type === "reco_orchestrator" || job.job_type === "refresh_reco_caches") && (
              <div className="space-y-2">
                <Label>Refresh Mode</Label>
                <Select value={config.mode || "hot"} onValueChange={(v) => setConfig({ ...config, mode: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot (recent data only)</SelectItem>
                    <SelectItem value="warm">Warm (moderate refresh)</SelectItem>
                    <SelectItem value="full">Full (complete refresh)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Controls how much data is refreshed</p>
              </div>
            )}

            {job.job_type === "refresh_reco_v13" && (
              <>
                <div className="space-y-2">
                  <Label>User ID (optional)</Label>
                  <Input
                    type="text"
                    placeholder="UUID of specific user"
                    value={config.user_id || ""}
                    onChange={(e) => setConfig({ ...config, user_id: e.target.value || undefined })}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for batch refresh, or specify user UUID for single-user refresh</p>
                </div>
                <div className="space-y-2">
                  <Label>Candidate Limit</Label>
                  <Input
                    type="number"
                    min="50"
                    max="1000"
                    value={config.candidate_limit || 300}
                    onChange={(e) => setConfig({ ...config, candidate_limit: parseInt(e.target.value) || 300 })}
                  />
                  <p className="text-xs text-muted-foreground">Maximum candidates per user</p>
                </div>
              </>
            )}

            {job.job_type === "rt_quality_estimation" && (
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input
                  type="number"
                  min="10"
                  max="200"
                  value={config.batch_size || 50}
                  onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) || 50 })}
                />
                <p className="text-xs text-muted-foreground">Number of titles to estimate per batch</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CronConfigDialogProps {
  cronJob: CronJob;
  onUpdate: (cronJob: CronJob, newSchedule: string) => Promise<void>;
}

const CronConfigDialog = ({ cronJob, onUpdate }: CronConfigDialogProps) => {
  const [schedule, setSchedule] = useState(cronJob.schedule);
  const [open, setOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<"custom" | "daily" | "weekly" | "monthly">("custom");
  const [time, setTime] = useState("02:00");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const handleSave = async () => {
    await onUpdate(cronJob, schedule);
    setOpen(false);
  };

  // Generate cron schedule from easy options
  const generateSchedule = (type: "daily" | "weekly" | "monthly", timeValue: string, dow: number, dom: number) => {
    const [hours, minutes] = timeValue.split(":");
    switch (type) {
      case "daily":
        return `${minutes} ${hours} * * *`;
      case "weekly":
        return `${minutes} ${hours} * * ${dow}`;
      case "monthly":
        return `${minutes} ${hours} ${dom} * *`;
      default:
        return schedule;
    }
  };

  const handleScheduleTypeChange = (type: "custom" | "daily" | "weekly" | "monthly") => {
    setScheduleType(type);
    if (type !== "custom") {
      setSchedule(generateSchedule(type, time, dayOfWeek, dayOfMonth));
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (scheduleType !== "custom") {
      setSchedule(generateSchedule(scheduleType, newTime, dayOfWeek, dayOfMonth));
    }
  };

  const handleDayOfWeekChange = (dow: number) => {
    setDayOfWeek(dow);
    if (scheduleType === "weekly") {
      setSchedule(generateSchedule("weekly", time, dow, dayOfMonth));
    }
  };

  const handleDayOfMonthChange = (dom: number) => {
    setDayOfMonth(dom);
    if (scheduleType === "monthly") {
      setSchedule(generateSchedule("monthly", time, dayOfWeek, dom));
    }
  };

  // Parse cron schedule to human-readable format
  const getCronDescription = (cronSchedule: string) => {
    const parts = cronSchedule.split(" ");
    if (parts.length < 5) return "Invalid schedule";

    const [minute, hour, dayMonth, month, dayWeek] = parts;
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    if (hour.includes("*/")) {
      const interval = hour.replace("*/", "");
      return `Every ${interval} hours at minute ${minute}`;
    }
    if (minute === "0" && hour === "*") {
      return "Every hour at the start of the hour";
    }
    if (dayMonth !== "*" && month === "*" && dayWeek === "*") {
      return `Monthly on day ${dayMonth} at ${hour}:${minute.padStart(2, "0")}`;
    }
    if (dayMonth === "*" && month === "*" && dayWeek !== "*") {
      return `Weekly on ${days[parseInt(dayWeek)] || dayWeek} at ${hour}:${minute.padStart(2, "0")}`;
    }
    if (dayMonth === "*" && month === "*" && dayWeek === "*") {
      if (hour === "*") return `Every hour at minute ${minute}`;
      return `Daily at ${hour}:${minute.padStart(2, "0")}`;
    }
    return cronSchedule;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {cronJob.jobname}</DialogTitle>
          <DialogDescription>Set the schedule for this cron job</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Schedule Type */}
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select value={scheduleType} onValueChange={(v) => handleScheduleTypeChange(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom (Cron)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time picker for non-custom */}
          {scheduleType !== "custom" && (
            <div className="space-y-2">
              <Label>Time (24-hour format)</Label>
              <Input type="time" value={time} onChange={(e) => handleTimeChange(e.target.value)} />
            </div>
          )}

          {/* Day of week for weekly */}
          {scheduleType === "weekly" && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => handleDayOfWeekChange(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of month for monthly */}
          {scheduleType === "monthly" && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => handleDayOfMonthChange(Math.min(31, Math.max(1, Number(e.target.value))))}
              />
            </div>
          )}

          {/* Custom cron input */}
          {scheduleType === "custom" && (
            <div className="space-y-2">
              <Label>Cron Expression</Label>
              <Input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="* * * * *"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Format: minute hour day-of-month month day-of-week</p>

              {/* Quick presets */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSchedule("0 * * * *")}>
                  Every hour
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSchedule("0 */6 * * *")}>
                  Every 6 hours
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSchedule("0 0 * * *")}>
                  Daily midnight
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSchedule("0 2 * * *")}>
                  Daily 2 AM
                </Button>
              </div>
            </div>
          )}

          {/* Schedule Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Schedule Preview</div>
            <div className="text-sm text-muted-foreground">{getCronDescription(schedule)}</div>
            <div className="text-xs text-muted-foreground font-mono mt-1">{schedule}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Schedule</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
