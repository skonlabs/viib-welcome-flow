import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Clock, AlertCircle, Info } from '@/icons';
import { supabase } from '@/integrations/supabase/client';

interface WorkUnit {
  languageCode: string;
  year: number;
  genreId: number;
  genreName: string;
  completedAt?: string;
  titlesProcessed?: number;
  error?: string;
  attempts?: number;
  lastAttempt?: string;
}

interface ThreadMonitorProps {
  jobId: string;
  totalWorkUnits: number;
  isRunning: boolean;
}

export function ThreadMonitor({ jobId, totalWorkUnits, isRunning }: ThreadMonitorProps) {
  const [completedUnits, setCompletedUnits] = useState<WorkUnit[]>([]);
  const [failedUnits, setFailedUnits] = useState<WorkUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    const fetchThreadStatus = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('configuration')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching thread status:', error);
        return;
      }

      const config = data?.configuration as any;
      setCompletedUnits(config?.completed_work_units || []);
      setFailedUnits(config?.failed_work_units || []);
      setLoading(false);
    };

    // Initial fetch
    fetchThreadStatus();

    // Poll every 5 seconds while running
    const interval = setInterval(fetchThreadStatus, 5000);

    return () => clearInterval(interval);
  }, [jobId, isRunning]);

  const completedCount = completedUnits.length;
  const failedCount = failedUnits.length;
  const remainingCount = totalWorkUnits - completedCount - failedCount;
  const progressPercent = (completedCount / totalWorkUnits) * 100;

  // Get recent completed units (last 10)
  const recentCompleted = [...completedUnits]
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thread Monitor</CardTitle>
          <CardDescription>Loading thread status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thread Monitor</CardTitle>
        <CardDescription>Real-time work unit processing status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{completedCount} / {totalWorkUnits} work units</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressPercent.toFixed(1)}% complete</span>
            <span>{remainingCount} remaining</span>
          </div>
        </div>

        {/* Status Counts */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold">{completedCount}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <div className="text-xs text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold">{failedCount}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="text-2xl font-bold">{remainingCount}</div>
            </div>
          </div>
        </div>

        {/* Recent Completed Threads */}
        {recentCompleted.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Recently Completed
            </h4>
            <ScrollArea className="h-[200px] rounded-lg border p-2">
              <div className="space-y-2">
                {recentCompleted.map((unit, idx) => (
                  <div
                    key={`${unit.languageCode}-${unit.year}-${unit.genreId}-${idx}`}
                    className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {unit.languageCode.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{unit.year}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{unit.genreName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{unit.titlesProcessed || 0} titles</span>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Failed Threads */}
        {failedUnits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Failed Work Units ({failedUnits.length})
            </h4>
            <ScrollArea className="h-[200px] rounded-lg border border-destructive/20 p-2">
              <div className="space-y-2">
                {failedUnits.map((unit, idx) => (
                  <div
                    key={`${unit.languageCode}-${unit.year}-${unit.genreId}-${idx}`}
                    className="flex items-center justify-between p-2 rounded bg-destructive/10 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="font-mono text-xs">
                        {unit.languageCode.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{unit.year}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{unit.genreName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-destructive">
                        {unit.attempts || 1} attempt{(unit.attempts || 1) > 1 ? 's' : ''}
                      </Badge>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {!isRunning && (
          <Alert>
            <Info className="h-4 w-4 text-icon-secondary" />
            <AlertDescription>
              Job is not currently running. Start the job to see real-time thread monitoring.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
