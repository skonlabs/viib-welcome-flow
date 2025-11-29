import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function ActivationCodes() {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Activation Codes</h1>
        <p className="text-muted-foreground">Manage app activation codes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activation Codes</CardTitle>
          <CardDescription>Generate and manage user activation codes</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              The 'activation_codes' table needs to be created in the database to enable this feature.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
