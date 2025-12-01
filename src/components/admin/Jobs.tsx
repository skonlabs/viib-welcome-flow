import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, RefreshCw, Clock, Calendar, Settings } from "@/icons";
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

export const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setJobs(data || []);
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
      
      const functionName = job.job_type === 'full_refresh' ? 'full-refresh-titles' : 'sync-titles-delta';
      
      toast({
        title: "Job Started",
        description: `${job.job_name} is now running. This may take several minutes...`,
      });

      const { data, error } = await supabase.functions.invoke(functionName);

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

  const handleUpdateConfig = async (job: Job, newConfig: any) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ configuration: newConfig })
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
                    <Calendar className="w-4 h-4 mr-2" />
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

              {/* Error Message */}
              {job.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  <div className="font-semibold mb-1">Last Error:</div>
                  {job.error_message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleRunJob(job)}
                  disabled={runningJobs.has(job.id) || job.status === 'running'}
                  className="flex-1"
                >
                  {runningJobs.has(job.id) || job.status === 'running' ? (
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
  onUpdate: (job: Job, config: any) => Promise<void>;
}

const JobConfigDialog = ({ job, onUpdate }: JobConfigDialogProps) => {
  const [config, setConfig] = useState(job.configuration);
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    await onUpdate(job, config);
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
            Adjust job parameters to customize behavior
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {job.job_type === 'full_refresh' ? (
            <>
              <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.min_rating}
                  onChange={(e) => setConfig({ ...config, min_rating: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Titles Per Batch</Label>
                <Input
                  type="number"
                  value={config.titles_per_batch}
                  onChange={(e) => setConfig({ ...config, titles_per_batch: parseInt(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Year</Label>
                  <Input
                    type="number"
                    value={config.start_year}
                    onChange={(e) => setConfig({ ...config, start_year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Year</Label>
                  <Input
                    type="number"
                    value={config.end_year}
                    onChange={(e) => setConfig({ ...config, end_year: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.min_rating}
                  onChange={(e) => setConfig({ ...config, min_rating: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Lookback Days</Label>
                <Input
                  type="number"
                  value={config.lookback_days}
                  onChange={(e) => setConfig({ ...config, lookback_days: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Number of days to look back for new titles
                </p>
              </div>
            </>
          )}
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