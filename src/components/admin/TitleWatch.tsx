import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/icons';

const TitleWatch = () => {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Title Watch</h1>
        <p className="text-muted-foreground">Watchlist additions and titles watched</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Watchlist Additions</CardTitle>
          <CardDescription>Titles added to watchlists over time</CardDescription>
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

export default TitleWatch;
