import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { XCircle, Plus, BarChart3 } from '@/icons';
import { Progress } from '@/components/ui/progress';

const PassRate = () => {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="mb-6 text-left pl-6">
          <h1 className="text-3xl font-bold">Pass Rate</h1>
          <p className="text-muted-foreground">Percentage of recommendations passed vs added</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
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
          <h1 className="text-3xl font-bold">Pass Rate</h1>
        </div>
        <Card><CardContent className="p-6 text-destructive">Error loading analytics: {error.message}</CardContent></Card>
      </div>
    );
  }

  const { passRate } = data!;

  const pieData = [
    { name: 'Passed', value: passRate.passed, color: 'hsl(var(--destructive))' },
    { name: 'Added', value: passRate.added, color: 'hsl(var(--primary))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Pass Rate</h1>
        <p className="text-muted-foreground">Percentage of recommendations passed vs added</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate.passed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Titles ignored/passed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Added</CardTitle>
            <Plus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate.added.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Added to watchlist</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate.passRate}%</div>
            <Progress value={passRate.passRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pass vs Add Distribution</CardTitle>
          <CardDescription>Breakdown of user actions on recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No pass/add data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PassRate;
