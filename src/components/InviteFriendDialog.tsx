import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent: () => void;
}

export const InviteFriendDialog = ({ open, onOpenChange, onInviteSent }: InviteFriendDialogProps) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Hey! Join me on ViiB - it's an amazing app for discovering movies and shows based on your mood!");
  const [loading, setLoading] = useState(false);

  const handleSendInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual invitation logic via edge function
      console.log('Sending invite to:', email, 'Message:', message);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onInviteSent();
      setEmail("");
      setMessage("Hey! Join me on ViiB - it's an amazing app for discovering movies and shows based on your mood!");
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Friend</DialogTitle>
          <DialogDescription>
            Share ViiB with your friends and watch together
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="invite-message">Personal Message (Optional)</Label>
            <Textarea
              id="invite-message"
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={loading}>
              {loading ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
