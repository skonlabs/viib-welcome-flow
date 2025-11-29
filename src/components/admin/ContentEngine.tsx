import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function ContentEngine() {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Content Engine</h1>
        <p className="text-muted-foreground">Manage content synchronization and processing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Engine Status</CardTitle>
          <CardDescription>TMDB sync, embeddings, and scoring</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Content Engine services and edge functions are required to manage content operations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
