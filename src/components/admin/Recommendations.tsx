import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/icons';

const Recommendations = () => {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Recommendations</h1>
        <p className="text-muted-foreground">Recommendation sent and acceptance metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommendation Performance</CardTitle>
          <CardDescription>Accepted vs rejected recommendations</CardDescription>
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

export default Recommendations;
