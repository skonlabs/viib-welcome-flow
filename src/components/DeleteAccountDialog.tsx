import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DeleteAccountDialogProps {
  onDeleted?: () => void;
}

export function DeleteAccountDialog({ onDeleted }: DeleteAccountDialogProps) {
  const { user, signOut } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'confirm' | 'password'>('confirm');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when closing
      setStep('confirm');
      setPassword('');
      setReason('');
      setConfirmChecked(false);
      setError('');
    }
  };

  const handleProceed = () => {
    if (!confirmChecked) {
      setError('Please confirm that you understand this action is permanent');
      return;
    }
    setError('');
    setStep('password');
  };

  const handleDelete = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (!user?.id) {
      setError('User session not found');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: deleteError } = await supabase.functions.invoke('delete-account', {
        body: {
          userId: user.id,
          password,
          confirmDeletion: true,
          reason: reason || undefined,
        },
      });

      if (deleteError) {
        setError('Failed to delete account. Please try again.');
        return;
      }

      if (!data?.success) {
        setError(data?.error || 'Failed to delete account');
        return;
      }

      // Account deleted successfully
      toast.success('Your account has been permanently deleted');
      handleOpenChange(false);

      // Sign out and redirect
      await signOut();
      onDeleted?.();
      window.location.href = '/';
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete Your Account
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {step === 'confirm' && (
                <>
                  <p>
                    This action is <strong>permanent and cannot be undone</strong>. All your data will be deleted, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Your profile and preferences</li>
                    <li>Watchlists and ratings</li>
                    <li>Social connections and recommendations</li>
                    <li>All activity history</li>
                  </ul>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Why are you leaving? (optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Help us improve by sharing your feedback..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="confirm"
                      checked={confirmChecked}
                      onCheckedChange={(checked) => {
                        setConfirmChecked(checked === true);
                        setError('');
                      }}
                    />
                    <Label
                      htmlFor="confirm"
                      className="text-sm font-normal leading-tight cursor-pointer"
                    >
                      I understand that this action is permanent and all my data will be deleted forever.
                    </Label>
                  </div>
                </>
              )}

              {step === 'password' && (
                <>
                  <p>
                    Please enter your password to confirm account deletion.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      autoFocus
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {step === 'confirm' ? (
            <Button
              variant="destructive"
              onClick={handleProceed}
              disabled={!confirmChecked}
            >
              Continue
            </Button>
          ) : (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading || !password}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete My Account'
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteAccountDialog;
