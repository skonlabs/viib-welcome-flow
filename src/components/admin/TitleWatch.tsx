import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bookmark, Play, Film } from '@/icons';

const TitleWatch = () => {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="mb-6 text-left pl-6">
          <h1 className="text-3xl font-bold">Title Watch</h1>
          <p className="text-muted-foreground">Watchlist additions and titles watched</p>
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
          <h1 className="text-3xl font-bold">Title Watch</h1>
        </div>
        <Card><CardContent className="p-6 text-destructive">Error loading analytics: {error.message}</CardContent></Card>
      </div>
    );
  }

  const { titleWatch } = data!;

  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Title Watch</h1>
        <p className="text-muted-foreground">Watchlist additions and titles watched</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Watchlist Additions</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{titleWatch.watchlistAdditions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Titles added to watchlists (30 days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Titles Watched</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{titleWatch.titlesWatched.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Started or completed (30 days)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Top Titles
          </CardTitle>
          <CardDescription>Most interacted with titles</CardDescription>
        </CardHeader>
        <CardContent>
          {titleWatch.topTitles.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={titleWatch.topTitles} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No title interaction data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TitleWatch;
