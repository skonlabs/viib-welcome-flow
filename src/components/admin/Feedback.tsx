import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from '@/icons';
import { Tables } from '@/integrations/supabase/types';

type Feedback = Tables<'feedback'>;

interface FeedbackProps {
  type: 'support' | 'bug' | 'feature';
}

const Feedback = ({ type }: FeedbackProps) => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmStatusChange, setConfirmStatusChange] = useState<{ id: string; status: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    fetchFeedback();
  }, [type]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    if (status === 'closed') {
      setConfirmStatusChange({ id, status });
    } else {
      updateStatus(id, status);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success('Status updated successfully');
      setConfirmStatusChange(null);
      fetchFeedback();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const totalPages = Math.ceil(feedback.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFeedback = feedback.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning", icon: any }> = {
      pending: { variant: "warning", icon: Clock },
      in_progress: { variant: "warning", icon: Clock },
      resolved: { variant: "success", icon: CheckCircle },
      closed: { variant: "destructive", icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    const iconColors = {
      pending: 'text-icon-warning',
      in_progress: 'text-icon-warning',
      resolved: 'text-icon-success',
      closed: 'text-icon-danger',
    };

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${iconColors[status] || 'text-icon-default'}`} />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const titles = {
    support: 'Support Requests',
    bug: 'Bug Reports',
    feature: 'Feature Requests'
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

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
          <CardTitle>All {titles[type]} ({feedback.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {type} submissions yet.
              </div>
            ) : (
              currentFeedback.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Submitted: {new Date(item.created_at).toLocaleString()}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Update Status:</span>
                    <Select
                      value={item.status}
                      onValueChange={(value) => handleStatusChange(item.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, feedback.length)} of {feedback.length} items
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

      {/* Confirm Status Change Dialog */}
      <AlertDialog open={!!confirmStatusChange} onOpenChange={(open) => !open && setConfirmStatusChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this as closed? This action indicates the feedback has been reviewed and no further action will be taken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmStatusChange) {
                updateStatus(confirmStatusChange.id, confirmStatusChange.status);
              }
            }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Feedback;
