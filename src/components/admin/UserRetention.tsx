import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp, Calendar, UserCheck } from '@/icons';
import { Progress } from '@/components/ui/progress';

const UserRetention = () => {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6 text-left pl-6">
          <h1 className="text-3xl font-bold">User Retention</h1>
          <p className="text-muted-foreground">Percentage of users returning after initial signup</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="mb-6 text-left pl-6">
          <h1 className="text-3xl font-bold">User Retention</h1>
        </div>
        <Card><CardContent className="p-6 text-destructive">Error loading analytics: {error.message}</CardContent></Card>
      </div>
    );
  }

  const { userRetention } = data!;

  const chartData = [
    { name: 'Day 1', value: userRetention.day1, color: 'hsl(var(--primary))' },
    { name: 'Day 7', value: userRetention.day7, color: 'hsl(var(--secondary))' },
    { name: 'Day 30', value: userRetention.day30, color: 'hsl(var(--accent))' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">User Retention</h1>
        <p className="text-muted-foreground">Percentage of users returning after initial signup</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userRetention.totalSignups.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Day 1 Retention</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userRetention.day1}%</div>
            <Progress value={userRetention.day1} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Day 7 Retention</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userRetention.day7}%</div>
            <Progress value={userRetention.day7} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Day 30 Retention</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userRetention.day30}%</div>
            <Progress value={userRetention.day30} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retention Rates</CardTitle>
          <CardDescription>User return rates at key milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => [`${value}%`, 'Retention']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retention Analysis</CardTitle>
          <CardDescription>Understanding user engagement patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium mb-2">Day 1 Retention: {userRetention.day1}%</p>
              <p className="text-sm text-muted-foreground">
                {userRetention.day1 >= 40 
                  ? "Strong first-day engagement indicates good onboarding experience."
                  : userRetention.day1 >= 20
                  ? "Moderate day-1 retention. Consider improving first-time user experience."
                  : "Low day-1 retention. Focus on onboarding improvements."
                }
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium mb-2">Day 7 Retention: {userRetention.day7}%</p>
              <p className="text-sm text-muted-foreground">
                {userRetention.day7 >= 25 
                  ? "Healthy weekly retention showing sustained interest."
                  : userRetention.day7 >= 10
                  ? "Room for improvement in weekly engagement."
                  : "Consider push notifications or email re-engagement campaigns."
                }
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium mb-2">Day 30 Retention: {userRetention.day30}%</p>
              <p className="text-sm text-muted-foreground">
                {userRetention.day30 >= 15 
                  ? "Solid monthly retention indicates strong product-market fit."
                  : userRetention.day30 >= 5
                  ? "Average monthly retention. Focus on building habits."
                  : "Low monthly retention. Consider feature improvements or re-engagement strategies."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRetention;
