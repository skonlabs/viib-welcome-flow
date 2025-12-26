import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { errorLogger } from "@/lib/services/ErrorLoggerService";
import { UserPlus, X } from "lucide-react";

interface ManageTrustedCircleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
}

export function ManageTrustedCircleDialog({ open, onOpenChange, listId }: ManageTrustedCircleDialogProps) {
  const { user } = useAuth();
  const [sharedWith, setSharedWith] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadSharedWith();
    }
  }, [open, user]);

  const loadSharedWith = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vibe_list_shared_with')
        .select('*, users:shared_with_user_id(full_name)')
        .eq('vibe_list_id', listId);

      if (error) throw error;
      setSharedWith(data || []);
    } catch (error) {
      await errorLogger.log(error, {
        operation: 'load_trusted_circle',
        listId
      });
      toast.error('Unable to load trusted circle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (sharedWithId: string) => {
    if (!user) return;

    try {
      // Verify ownership before deleting by checking the vibe_lists table directly
      const { data: listData } = await supabase
        .from('vibe_lists')
        .select('user_id')
        .eq('id', listId)
        .single();

      if (!listData || listData.user_id !== user.id) {
        toast.error('You do not have permission to modify this list');
        return;
      }

      const { error } = await supabase
        .from('vibe_list_shared_with')
        .delete()
        .eq('id', sharedWithId);

      if (error) throw error;

      toast.success('User removed from trusted circle');
      loadSharedWith();
    } catch (error) {
      await errorLogger.log(error, {
        operation: 'remove_user_from_trusted_circle',
        sharedWithId
      });
      toast.error('Unable to remove user. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Trusted Circle</DialogTitle>
          <DialogDescription>
            Control who can see this list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">Loading...</p>
          ) : sharedWith.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No one in your trusted circle yet
            </p>
          ) : (
            <div className="space-y-2">
              {sharedWith.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{item.users?.full_name || 'Unknown'}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeUser(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
