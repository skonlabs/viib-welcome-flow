import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/icons';

const Sessions = () => {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Sessions</h1>
        <p className="text-muted-foreground">User session metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Duration</CardTitle>
          <CardDescription>Average time spent per session</CardDescription>
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

export default Sessions;
