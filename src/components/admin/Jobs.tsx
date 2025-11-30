import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/icons';

export function Jobs() {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Background Jobs</h1>
        <p className="text-muted-foreground">Manage scheduled tasks and background processes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cron Jobs</CardTitle>
          <CardDescription>Scheduled task management</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Cron job management requires pg_cron extension and related database functions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
