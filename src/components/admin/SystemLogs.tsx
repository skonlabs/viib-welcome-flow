import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Info, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface SystemLog {
  id: string;
  created_at: string;
  error_message: string;
  error_stack: string | null;
  user_id: string | null;
  screen: string | null;
  operation: string | null;
  context: any;
  severity: 'error' | 'warning' | 'info';
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [resolvingLog, setResolvingLog] = useState<SystemLog | null>(null);
  const [confirmResolveLog, setConfirmResolveLog] = useState<SystemLog | null>(null);
  const [notes, setNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs((data || []).map(log => ({
        ...log,
        severity: log.severity as 'error' | 'warning' | 'info'
      })));
    } catch (error: any) {
      console.error('Error loading system logs:', error);
      toast.error('Failed to load system logs');
    } finally {
      setLoading(false);
    }
  };

  const resolveLog = async () => {
    if (!resolvingLog) return;

    try {
      const userId = localStorage.getItem('viib_user_id');

      const { error } = await supabase
        .from('system_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          notes: notes || null
        })
        .eq('id', resolvingLog.id);

      if (error) throw error;

      toast.success('System log marked as resolved');

      setResolvingLog(null);
      setConfirmResolveLog(null);
      setNotes('');
      fetchLogs();
    } catch (error: any) {
      console.error('Error resolving system log:', error);
      toast.error('Failed to resolve system log');
    }
  };

  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = logs.slice(startIndex, endIndex);

  useEffect(() => {
    fetchLogs();
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'outline';
      case 'info':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">System Logs</h2>
          <p className="text-muted-foreground mt-2">
            View and manage system errors and warnings
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {logs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No system logs found</p>
          </Card>
        ) : (
          currentLogs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getSeverityIcon(log.severity)}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityColor(log.severity) as any}>
                          {log.severity}
                        </Badge>
                        {log.resolved && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Resolved
                          </Badge>
                        )}
                        {log.screen && (
                          <Badge variant="outline">{log.screen}</Badge>
                        )}
                      </div>
                      <p className="font-medium text-foreground">{log.error_message}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        {log.operation && ` • ${log.operation}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        View Details
                      </Button>
                      {!log.resolved && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setConfirmResolveLog(log)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                  {log.notes && (
                    <div className="text-sm bg-muted p-2 rounded">
                      <strong>Notes:</strong> {log.notes}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, logs.length)} of {logs.length} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Resolve Dialog */}
      <AlertDialog open={!!confirmResolveLog} onOpenChange={(open) => !open && setConfirmResolveLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Resolution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this system log as resolved? This action will update the log status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmResolveLog) {
                setResolvingLog(confirmResolveLog);
                setConfirmResolveLog(null);
              }
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Error Message</h4>
                <p className="text-sm">{selectedLog.error_message}</p>
              </div>

              {selectedLog.error_stack && (
                <div>
                  <h4 className="font-semibold mb-1">Stack Trace</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {selectedLog.error_stack}
                  </pre>
                </div>
              )}

              {selectedLog.context && (
                <div>
                  <h4 className="font-semibold mb-1">Context</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Severity</h4>
                  <Badge variant={getSeverityColor(selectedLog.severity) as any}>
                    {selectedLog.severity}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Status</h4>
                  <Badge variant={selectedLog.resolved ? 'outline' : 'destructive'}>
                    {selectedLog.resolved ? 'Resolved' : 'Unresolved'}
                  </Badge>
                </div>
                {selectedLog.screen && (
                  <div>
                    <h4 className="font-semibold mb-1">Screen</h4>
                    <p>{selectedLog.screen}</p>
                  </div>
                )}
                {selectedLog.operation && (
                  <div>
                    <h4 className="font-semibold mb-1">Operation</h4>
                    <p>{selectedLog.operation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolvingLog} onOpenChange={(open) => !open && setResolvingLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Error</DialogTitle>
            <DialogDescription>
              Add notes about how this error was resolved (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Resolution notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResolvingLog(null)}>
                Cancel
              </Button>
              <Button onClick={resolveLog}>
                Mark as Resolved
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
