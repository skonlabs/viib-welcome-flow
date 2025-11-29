import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const ActiveUsers = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Active Users</h1>
        <p className="text-muted-foreground">Users who opened the app at least once in the time period</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Active Users (DAU)</CardTitle>
          <CardDescription>Past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Analytics edge function 'get-analytics' is required to display this data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveUsers;
