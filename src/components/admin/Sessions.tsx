import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Activity } from '@/icons';

const Sessions = () => {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="mb-6 text-left pl-6">
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">User session metrics</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="mb-6 text-left pl-6">
          <h1 className="text-3xl font-bold">Sessions</h1>
        </div>
        <Card><CardContent className="p-6 text-destructive">Error loading analytics: {error.message}</CardContent></Card>
      </div>
    );
  }

  const { sessions } = data!;
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Sessions</h1>
        <p className="text-muted-foreground">User session metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(sessions.averageDuration)}</div>
            <p className="text-xs text-muted-foreground">Average time per session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.totalSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions by Time of Day</CardTitle>
          <CardDescription>When users are most active</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sessions.sessionsByTimeOfDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" className="text-xs capitalize" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sessions;
