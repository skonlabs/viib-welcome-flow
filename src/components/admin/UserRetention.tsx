import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/icons';

const UserRetention = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">User Retention</h1>
        <p className="text-muted-foreground">Percentage of users returning after initial signup</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retention Rates</CardTitle>
          <CardDescription>Day 1, Day 7, and Day 30 retention</CardDescription>
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

export default UserRetention;
