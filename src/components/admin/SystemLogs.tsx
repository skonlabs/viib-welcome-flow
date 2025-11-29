import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function SystemLogs() {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">System Logs</h1>
        <p className="text-muted-foreground">View and manage system error logs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Error Logs</CardTitle>
          <CardDescription>Application errors and debugging information</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              The 'system_logs' table needs to be created in the database to enable this feature.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
