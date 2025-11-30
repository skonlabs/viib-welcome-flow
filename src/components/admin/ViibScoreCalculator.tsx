import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/icons';

export default function ViibScoreCalculator() {
  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">ViiB Score Calculator</h1>
        <p className="text-muted-foreground">Calculate recommendation scores for users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Calculation</CardTitle>
          <CardDescription>Calculate ViiB recommendation scores</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4 text-icon-secondary" />
            <AlertDescription>
              ViiB score calculation edge functions are required to calculate recommendation scores.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
