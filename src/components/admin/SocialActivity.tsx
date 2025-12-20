import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, Send, Star } from '@/icons';

const SocialActivity = () => {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="mb-6 text-left pl-6">
          <h1 className="text-3xl font-bold">Social Activity</h1>
          <p className="text-muted-foreground">Friend connections and social interactions</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="mb-6 text-left pl-6">
          <h1 className="text-3xl font-bold">Social Activity</h1>
        </div>
        <Card><CardContent className="p-6 text-destructive">Error loading analytics: {error.message}</CardContent></Card>
      </div>
    );
  }

  const { socialActivity } = data!;

  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Social Activity</h1>
        <p className="text-muted-foreground">Friend connections and social interactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{socialActivity.totalConnections.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Friend connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Connections</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{socialActivity.newConnectionsLast30Days.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Social Recommendations</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{socialActivity.socialRecommendations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Titles shared (30 days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Trust Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{socialActivity.avgTrustScore.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average across connections</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Social Features Overview</CardTitle>
          <CardDescription>Summary of social engagement across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Friend Network</p>
                  <p className="text-sm text-muted-foreground">Total friend connections across all users</p>
                </div>
              </div>
              <div className="text-2xl font-bold">{socialActivity.totalConnections}</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Send className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Sharing Activity</p>
                  <p className="text-sm text-muted-foreground">Recommendations shared between friends</p>
                </div>
              </div>
              <div className="text-2xl font-bold">{socialActivity.socialRecommendations}</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Trust Quality</p>
                  <p className="text-sm text-muted-foreground">Average trust score (0-1 scale)</p>
                </div>
              </div>
              <div className="text-2xl font-bold">{socialActivity.avgTrustScore.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialActivity;
