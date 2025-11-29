import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface FeedbackProps {
  type: 'support' | 'bug' | 'feature';
}

const Feedback = ({ type }: FeedbackProps) => {
  const titles = {
    support: 'Support Requests',
    bug: 'Bug Reports',
    feature: 'Feature Requests'
  };

  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">{titles[type]}</h1>
        <p className="text-muted-foreground">
          Manage user {type === 'support' ? 'support requests' : type === 'bug' ? 'bug reports' : 'feature suggestions'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All {titles[type]}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Database Table Required</AlertTitle>
            <AlertDescription>
              The 'feedback' table needs to be created in the database to enable this feature.
              Please run the appropriate database migration to create the required table structure.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default Feedback;
