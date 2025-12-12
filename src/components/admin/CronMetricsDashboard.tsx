import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Database, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface MetricsData {
  vector_count: number;
  transform_count: number;
  intent_count: number;
  social_count: number;
  vector_updated_at: string | null;
  transform_updated_at: string | null;
  intent_updated_at: string | null;
  social_updated_at: string | null;
}

interface MetricCardProps {
  title: string;
  count: number;
  lastUpdated: string | null;
  isUpdating?: boolean;
}

const MetricCard = ({ title, count, lastUpdated, isUpdating }: MetricCardProps) => {
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const formatFullTime = (timestamp: string | null) => {
    if (!timestamp) return "Never updated";
    return format(new Date(timestamp), "MMM d, yyyy HH:mm:ss");
  };

  return (
    <Card className={isUpdating ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {isUpdating && (
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          <span className="text-2xl font-bold">{count.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">rows</span>
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground" title={formatFullTime(lastUpdated)}>
          <Clock className="w-3 h-3" />
          <span>Updated {formatTime(lastUpdated)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const CronMetricsDashboard = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousMetrics, setPreviousMetrics] = useState<MetricsData | null>(null);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_cron_job_progress' as any);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const newMetrics = data[0] as MetricsData;
        setPreviousMetrics(metrics);
        setMetrics(newMetrics);
      }
    } catch (error) {
      console.error('Failed to fetch cron metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Poll every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const isUpdating = (current: number, previous: number | undefined) => {
    if (previous === undefined) return false;
    return current !== previous;
  };

  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-1/2 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-3/4 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Materialization Metrics</h3>
          <p className="text-sm text-muted-foreground">
            Live view of precomputed recommendation data
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Auto-refreshing
        </Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Emotion Vectors"
          count={metrics.vector_count}
          lastUpdated={metrics.vector_updated_at}
          isUpdating={isUpdating(metrics.vector_count, previousMetrics?.vector_count)}
        />
        <MetricCard
          title="Transformation Scores"
          count={metrics.transform_count}
          lastUpdated={metrics.transform_updated_at}
          isUpdating={isUpdating(metrics.transform_count, previousMetrics?.transform_count)}
        />
        <MetricCard
          title="Intent Alignment"
          count={metrics.intent_count}
          lastUpdated={metrics.intent_updated_at}
          isUpdating={isUpdating(metrics.intent_count, previousMetrics?.intent_count)}
        />
        <MetricCard
          title="Social Summary"
          count={metrics.social_count}
          lastUpdated={metrics.social_updated_at}
          isUpdating={isUpdating(metrics.social_count, previousMetrics?.social_count)}
        />
      </div>
    </div>
  );
};
