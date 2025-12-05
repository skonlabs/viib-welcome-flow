import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Clock, AlertCircle, Info, Film, Tv, Loader2 } from '@/icons';
import { supabase } from '@/integrations/supabase/client';

interface WorkUnit {
  languageCode: string;
  year: number;
  genreId: number;
  genreName: string;
  completedAt?: string;
  titlesProcessed?: number;
  moviesProcessed?: number;
  seriesProcessed?: number;
  error?: string;
  attempts?: number;
  lastAttempt?: string;
}

interface ThreadMonitorProps {
  jobId: string;
  totalWorkUnits: number;
  isRunning: boolean;
  titlesProcessed?: number;
}

export function ThreadMonitor({ jobId, totalWorkUnits, isRunning, titlesProcessed = 0 }: ThreadMonitorProps) {
  const [completedUnits, setCompletedUnits] = useState<WorkUnit[]>([]);
  const [failedUnits, setFailedUnits] = useState<WorkUnit[]>([]);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<WorkUnit[]>([]);
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
      setCurrentlyProcessing(config?.currently_processing || []);
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
  const remainingCount = Math.max(0, totalWorkUnits - completedCount - failedCount);
  const progressPercent = totalWorkUnits > 0 ? (completedCount / totalWorkUnits) * 100 : 0;

  // Get recent completed units (last 10)
  const recentCompleted = [...completedUnits]
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 10);

  if (loading && isRunning) {
    return (
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading thread status...</span>
        </div>
      </div>
    );
  }

  if (!isRunning) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-primary">Parallel Processing Active</div>
        <Badge variant="outline" className="animate-pulse">Running</Badge>
      </div>

      {/* Progress Bar */}
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

      {/* Status Boxes */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-2 rounded-lg border border-green-500/20 bg-green-500/10">
          <div className="text-xl font-bold text-green-500">{completedCount}</div>
          <div className="text-xs text-muted-foreground">Succeeded</div>
        </div>
        <div className="text-center p-2 rounded-lg border border-red-500/20 bg-red-500/10">
          <div className="text-xl font-bold text-red-500">{failedCount}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
        <div className="text-center p-2 rounded-lg border border-muted bg-muted/50">
          <div className="text-xl font-bold">{remainingCount}</div>
          <div className="text-xs text-muted-foreground">Remaining</div>
        </div>
        <div className="text-center p-2 rounded-lg border border-blue-500/20 bg-blue-500/10">
          <div className="text-xl font-bold text-blue-500">{titlesProcessed.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Titles</div>
        </div>
      </div>

      {/* Currently Processing */}
      {currentlyProcessing.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Currently Processing ({currentlyProcessing.length})
          </h4>
          <div className="space-y-1">
            {currentlyProcessing.slice(0, 5).map((unit, idx) => (
              <div
                key={`processing-${unit.languageCode}-${unit.year}-${unit.genreId}-${idx}`}
                className="flex items-center justify-between p-2 rounded bg-primary/20 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {unit.languageCode.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{unit.year}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{unit.genreName}</span>
                </div>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ))}
            {currentlyProcessing.length > 5 && (
              <div className="text-xs text-muted-foreground text-center">
                +{currentlyProcessing.length - 5} more processing...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recently Completed */}
      {recentCompleted.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Recently Completed
          </h4>
          <ScrollArea className="h-[180px] rounded-lg border p-2">
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
                    {(unit.moviesProcessed !== undefined || unit.seriesProcessed !== undefined) ? (
                      <>
                        {unit.moviesProcessed !== undefined && unit.moviesProcessed > 0 && (
                          <span className="flex items-center gap-1">
                            <Film className="h-3 w-3" />
                            {unit.moviesProcessed}
                          </span>
                        )}
                        {unit.seriesProcessed !== undefined && unit.seriesProcessed > 0 && (
                          <span className="flex items-center gap-1">
                            <Tv className="h-3 w-3" />
                            {unit.seriesProcessed}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>{unit.titlesProcessed || 0} titles</span>
                    )}
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Failed Work Units */}
      {failedUnits.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Failed Work Units ({failedUnits.length})
          </h4>
          <ScrollArea className="h-[150px] rounded-lg border border-destructive/20 p-2">
            <div className="space-y-2">
              {failedUnits.map((unit, idx) => (
                <div
                  key={`failed-${unit.languageCode}-${unit.year}-${unit.genreId}-${idx}`}
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
    </div>
  );
}