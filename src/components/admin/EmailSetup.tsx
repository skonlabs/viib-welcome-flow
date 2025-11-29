import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const EmailSetup = () => {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Email Setup</h1>
        <p className="text-muted-foreground">Configure email service settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>SMTP settings and email service configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Email configuration edge functions are required to manage email settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
