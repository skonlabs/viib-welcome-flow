import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/icons';

const MoodUsage = () => {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Mood Feature Usage</h1>
        <p className="text-muted-foreground">Percentage of users using mood-based recommendations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mood Usage Statistics</CardTitle>
          <CardDescription>Users engaging with mood features</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4 text-icon-secondary" />
            <AlertDescription>
              Analytics edge function 'get-analytics' is required to display this data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default MoodUsage;
