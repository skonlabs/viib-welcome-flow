import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/icons';

const PassRate = () => {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Pass Rate</h1>
        <p className="text-muted-foreground">Percentage of recommendations passed vs added</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pass vs Add Rate</CardTitle>
          <CardDescription>How many recommendations users pass vs add</CardDescription>
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

export default PassRate;
