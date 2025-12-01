import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, RefreshCw, Clock, Calendar as CalendarIcon, Settings, XCircle, Layers } from "@/icons";
import { errorLogger } from "@/lib/services/ErrorLoggerService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
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

interface ParallelProgress {
  jobId: string;
  currentThread: number;
  totalThreads: number;
  succeeded: number;
  failed: number;
  titlesProcessed: number;
}

export const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [parallelProgress, setParallelProgress] = useState<ParallelProgress | null>(null);
  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setJobs(data || []);
      
      // Restore parallel progress UI if a job is running with thread tracking
      const runningJob = data?.find(job => job.status === 'running');
      if (runningJob) {
        const config = (runningJob.configuration as any) || {};
        const tracking = config.thread_tracking;
        
        if (tracking && config.total_threads) {
          const threadsCompleted = (tracking.succeeded || 0) + (tracking.failed || 0);
          
          // Only restore progress if we haven't completed all threads yet
          if (threadsCompleted < config.total_threads) {
            setParallelProgress({
              jobId: runningJob.id,
              currentThread: threadsCompleted,
              totalThreads: config.total_threads,
              succeeded: tracking.succeeded || 0,
              failed: tracking.failed || 0,
              titlesProcessed: runningJob.total_titles_processed || 0
            });
          }
        }
      }
    } catch (error) {
      await errorLogger.log(error, { operation: 'fetch_jobs' });
      toast({
        title: "Error loading jobs",
        description: "Failed to load job information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Refresh every 10 seconds
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRunJob = async (job: Job) => {
    try {
      setRunningJobs(prev => new Set([...prev, job.id]));
      
      let functionName: string;
      let functionBody: any = {};
      
      if (job.job_type === 'full_refresh') {
        functionName = 'full-refresh-titles';
      } else if (job.job_type === 'sync_delta') {
        functionName = 'sync-titles-delta';
      } else if (job.job_type === 'enrich_trailers') {
        functionName = 'enrich-title-trailers';
        functionBody = {
          batchSize: job.configuration?.batch_size || 50,
          startOffset: job.configuration?.start_offset || 0,
          jobId: job.id
        };
      } else {
        throw new Error(`Unknown job type: ${job.job_type}`);
      }
      
      toast({
        title: "Job Started",
        description: `${job.job_name} is now running. This may take several minutes...`,
      });

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: functionBody
      });

      if (error) throw error;

      toast({
        title: "Job Completed",
        description: data?.message || `${job.job_name} completed successfully.`,
      });

      await fetchJobs();
    } catch (error) {
      await errorLogger.log(error, { 
        operation: 'run_job',
        jobId: job.id,
        jobType: job.job_type
      });
      toast({
        title: "Job Failed",
        description: "Failed to run the job. Please check the logs.",
        variant: "destructive",
      });
    } finally {
      setRunningJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const handleRunParallel = async (job: Job) => {
    try {
      const config = job.configuration;

      if (job.job_type === 'enrich_trailers') {
        // For trailer enrichment, divide work by batch offset
        const { count } = await supabase
          .from('titles')
          .select('*', { count: 'exact', head: true })
          .not('tmdb_id', 'is', null)
          .is('trailer_url', null);

        const totalTitles = count || 0;
        const batchSize = config.batch_size || 50;
        const numChunks = Math.ceil(totalTitles / batchSize);

        // Reset the job counter and tracking
        const trailerJobStartTime = Date.now();
        const resetConfig = {
          ...config,
          total_threads: numChunks,
          start_time: trailerJobStartTime,
          thread_tracking: { succeeded: 0, failed: 0 }
        };
        
        await supabase
          .from('jobs')
          .update({ 
            status: 'running',
            total_titles_processed: 0,
            configuration: resetConfig,
            last_run_at: new Date().toISOString()
          })
          .eq('id', job.id);

        setParallelProgress({
          jobId: job.id,
          currentThread: 0,
          totalThreads: numChunks,
          succeeded: 0,
          failed: 0,
          titlesProcessed: 0
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
              await supabase.functions.invoke('enrich-title-trailers', {
                body: { 
                  batchSize,
                  startOffset: i * batchSize,
                  jobId: job.id
                }
              });
            } catch (error) {
              console.error(`Error invoking batch ${i + 1}:`, error);
            }
          }, delayMs);
        }

        // Poll for progress
        const pollInterval = setInterval(async () => {
          const { data: updatedJob } = await supabase
            .from('jobs')
            .select('total_titles_processed, status, configuration')
            .eq('id', job.id)
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
              titlesProcessed: updatedJob.total_titles_processed || 0
            });

            if (threadsCompleted >= numChunks) {
              // Calculate total job duration
              const trailerStartTime = jobConfig.start_time || Date.now();
              const trailerEndTime = Date.now();
              const durationSeconds = Math.floor((trailerEndTime - trailerStartTime) / 1000);
              
              // All chunks completed
              await supabase
                .from('jobs')
                .update({ 
                  status: 'completed',
                  last_run_duration_seconds: durationSeconds,
                  error_message: tracking.failed > 0 
                    ? `Completed with ${tracking.failed} failed chunk(s)` 
                    : null
                })
                .eq('id', job.id);
              
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
      const { data: languages } = await supabase
        .from('languages')
        .select('language_code')
        .order('language_code');
      
      const languageCodes = languages?.map(l => l.language_code) || [];
      
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
        thread_tracking: { succeeded: 0, failed: 0 }
      };
      
      const jobStartTime = Date.now();
      await supabase
        .from('jobs')
        .update({ 
          status: 'running',
          total_titles_processed: 0,
          configuration: {
            ...resetConfig,
            start_time: jobStartTime
          },
          last_run_at: new Date().toISOString()
        })
        .eq('id', job.id);

      // Initialize progress tracking
      setParallelProgress({
        jobId: job.id,
        currentThread: 0,
        totalThreads: chunks.length,
        succeeded: 0,
        failed: 0,
        titlesProcessed: 0
      });

      // Determine starting point for resume functionality
      const existingTracking = (job.configuration as any)?.thread_tracking || { succeeded: 0, failed: 0 };
      const startIndex = existingTracking.succeeded + existingTracking.failed;
      const isResume = startIndex > 0;
      
      toast({
        title: isResume ? "Resuming Parallel Jobs" : "Starting Parallel Jobs",
        description: isResume 
          ? `Resuming from thread ${startIndex + 1}. Backend orchestrator will dispatch ${chunks.length - startIndex} remaining threads immediately.`
          : `Backend orchestrator will dispatch all ${chunks.length} threads immediately. Job will continue even if you close your browser.`,
      });

      // Invoke the orchestrator edge function - it will handle all dispatching server-side
      try {
        const { error: orchestratorError } = await supabase.functions.invoke('full-refresh-orchestrator', {
          body: {
            jobId: job.id,
            chunks: chunks,
            startIndex: startIndex
          }
        });

        if (orchestratorError) {
          throw orchestratorError;
        }

        toast({
          title: "Orchestrator Started",
          description: `Backend is rapidly dispatching ${chunks.length - startIndex} threads. Job will continue running independently even if you lock your screen or close this page.`,
        });
      } catch (error) {
        console.error('Error starting orchestrator:', error);
        toast({
          title: "Orchestrator Failed",
          description: "Failed to start backend orchestrator. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      // Now poll the database every 10 seconds to track actual progress
      const pollInterval = setInterval(async () => {
        const { data: updatedJob } = await supabase
          .from('jobs')
          .select('total_titles_processed, status, configuration')
          .eq('id', job.id)
          .single();

        if (updatedJob) {
          const jobConfig = (updatedJob.configuration as any) || {};
          const tracking = jobConfig.thread_tracking || { succeeded: 0, failed: 0 };
          const threadsCompleted = tracking.succeeded + tracking.failed;
          
          setParallelProgress({
            jobId: job.id,
            currentThread: threadsCompleted,
            totalThreads: chunks.length,
            succeeded: tracking.succeeded,
            failed: tracking.failed,
            titlesProcessed: updatedJob.total_titles_processed || 0
          });

          // Check if all threads completed
          if (threadsCompleted >= chunks.length) {
            // Calculate total job duration
            const jobStartTime = jobConfig.start_time || Date.now();
            const jobEndTime = Date.now();
            const durationSeconds = Math.floor((jobEndTime - jobStartTime) / 1000);
            
            // Mark job as completed
            await supabase
              .from('jobs')
              .update({ 
                status: 'completed',
                last_run_duration_seconds: durationSeconds,
                error_message: tracking.failed > 0 
                  ? `Completed with ${tracking.failed} failed thread(s)` 
                  : null
              })
              .eq('id', job.id);
            
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

      // Clear progress tracking
      setParallelProgress(null);

      toast({
        title: "Parallel Jobs Completed",
        description: `All ${chunks.length} edge functions have been dispatched and will continue running in the background.`,
      });

      await fetchJobs();
    } catch (error) {
      await errorLogger.log(error, { 
        operation: 'run_parallel_jobs',
        jobId: job.id
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
      // Stop the job and clear progress
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'failed',
          error_message: 'Job manually stopped by administrator'
        })
        .eq('id', job.id);

      if (error) throw error;

      // Clear parallel progress UI immediately
      setParallelProgress(null);

      toast({
        title: "Job Stopped",
        description: `${job.job_name} has been stopped. Running threads will complete but won't update the job.`,
      });

      await fetchJobs();
    } catch (error) {
      await errorLogger.log(error, { 
        operation: 'stop_job',
        jobId: job.id
      });
      toast({
        title: "Error",
        description: "Failed to stop job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (job: Job) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: !job.is_active })
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: job.is_active ? "Job Paused" : "Job Activated",
        description: `${job.job_name} has been ${job.is_active ? 'paused' : 'activated'}.`,
      });

      await fetchJobs();
    } catch (error) {
      await errorLogger.log(error, { 
        operation: 'toggle_job_active',
        jobId: job.id
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

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: "Configuration Updated",
        description: `${job.job_name} configuration has been updated.`,
      });

      await fetchJobs();
    } catch (error) {
      await errorLogger.log(error, { 
        operation: 'update_job_config',
        jobId: job.id
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

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
          {[1, 2].map(i => (
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Jobs</h2>
          <p className="text-muted-foreground">
            Manage automated title sync jobs
          </p>
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
                    {job.job_type === 'full_refresh' 
                      ? 'Manual full refresh of title catalog' 
                      : 'Automated nightly sync for new titles'}
                  </CardDescription>
                </div>
                {getStatusBadge(job.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Job Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                    Duration
                  </div>
                  <div className="font-medium">{formatDuration(job.last_run_duration_seconds)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Next Run</div>
                  <div className="font-medium">{formatDate(job.next_run_at)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Titles Processed</div>
                  <div className="font-medium">{job.total_titles_processed.toLocaleString()}</div>
                </div>
              </div>

              {/* Parallel Progress Display */}
              {parallelProgress && parallelProgress.jobId === job.id && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-primary">
                      Parallel Processing Active
                    </div>
                    <Badge variant="outline" className="animate-pulse">
                      Running
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Threads Completed</span>
                      <span className="font-mono font-medium">
                        {parallelProgress.currentThread} / {parallelProgress.totalThreads}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(parallelProgress.currentThread / parallelProgress.totalThreads) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round((parallelProgress.currentThread / parallelProgress.totalThreads) * 100)}% Complete</span>
                      <span>{parallelProgress.totalThreads - parallelProgress.currentThread} Remaining</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center p-2 rounded-lg border border-green-500/20 bg-green-500/10">
                      <div className="text-xl font-bold text-green-500">
                        {parallelProgress.succeeded}
                      </div>
                      <div className="text-xs text-muted-foreground">Succeeded</div>
                    </div>
                    <div className="text-center p-2 rounded-lg border border-red-500/20 bg-red-500/10">
                      <div className="text-xl font-bold text-red-500">
                        {parallelProgress.failed}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-2 rounded-lg border border-blue-500/20 bg-blue-500/10">
                      <div className="text-xl font-bold text-blue-500">
                        {parallelProgress.titlesProcessed.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Titles</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {job.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  <div className="font-semibold mb-1">Last Error:</div>
                  {job.error_message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {job.status === 'running' ? (
                  <Button
                    onClick={() => handleStopJob(job)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Stop Job
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handleRunJob(job)}
                      disabled={runningJobs.has(job.id)}
                      className="flex-1"
                    >
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
                    {job.job_type === 'full_refresh' && (
                      <Button
                        onClick={() => handleRunParallel(job)}
                        disabled={runningJobs.has(job.id)}
                        variant="secondary"
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Parallel
                      </Button>
                    )}
                  </>
                )}
                <Button
                  onClick={() => handleToggleActive(job)}
                  variant={job.is_active ? "destructive" : "default"}
                  disabled={job.status === 'running'}
                >
                  {job.is_active ? (
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
                <JobConfigDialog job={job} onUpdate={handleUpdateConfig} />
              </div>
            </CardContent>
          </Card>
        ))}
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
    job.next_run_at ? new Date(job.next_run_at) : undefined
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    job.next_run_at ? format(new Date(job.next_run_at), "HH:mm") : "02:00"
  );

  const handleSave = async () => {
    let nextRunAt: string | undefined;
    if (scheduledDate) {
      const [hours, minutes] = scheduledTime.split(':');
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
          <DialogDescription>
            Adjust job parameters and scheduling
          </DialogDescription>
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
                      !scheduledDate && "text-muted-foreground"
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
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Job will run at this time on the selected date
              </p>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Configuration</h4>
            {job.job_type === 'full_refresh' ? (
              <>
                <div className="space-y-2">
                  <Label>Minimum Rating</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={config.min_rating}
                    onChange={(e) => setConfig({ ...config, min_rating: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only fetch titles with rating ≥ this value (0-10)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Titles Per Batch</Label>
                  <Input
                    type="number"
                    min="10"
                    max="500"
                    value={config.titles_per_batch}
                    onChange={(e) => setConfig({ ...config, titles_per_batch: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of titles to fetch per API request (10-500)
                  </p>
                </div>
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-sm mb-3">Year Range</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Year</Label>
                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={config.start_year || 2020}
                        onChange={(e) => setConfig({ ...config, start_year: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Year</Label>
                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={config.end_year || new Date().getFullYear()}
                        onChange={(e) => setConfig({ ...config, end_year: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Fetch titles released between these years
                  </p>
                </div>
              </>
            ) : job.job_type === 'enrich_trailers' ? (
              <>
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={config.batch_size || 50}
                    onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of titles to process per batch (10-100)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Start Offset</Label>
                  <Input
                    type="number"
                    min="0"
                    value={config.start_offset || 0}
                    onChange={(e) => setConfig({ ...config, start_offset: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Starting position in the titles table (0 = from beginning)
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Minimum Rating</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={config.min_rating}
                    onChange={(e) => setConfig({ ...config, min_rating: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only fetch titles with rating ≥ this value (0-10)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Lookback Days</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={config.lookback_days}
                    onChange={(e) => setConfig({ ...config, lookback_days: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of days to look back for new titles (1-365)
                  </p>
                </div>
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-sm mb-3">Year Range (Optional)</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Year</Label>
                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={config.start_year || new Date().getFullYear() - 2}
                        onChange={(e) => setConfig({ ...config, start_year: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Year</Label>
                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={config.end_year || new Date().getFullYear()}
                        onChange={(e) => setConfig({ ...config, end_year: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Filter titles released between these years (optional)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};