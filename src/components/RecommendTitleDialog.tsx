import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users } from "@/icons";

interface Friend {
  id: string;
  friend_user_id: string;
  friend_name: string;
}

interface RecommendTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  titleName: string;
}

export function RecommendTitleDialog({
  open,
  onOpenChange,
  titleId,
  titleName,
}: RecommendTitleDialogProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      loadFriends();
    }
  }, [open, user]);

  const loadFriends = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("friend_connections")
        .select(`
          id,
          friend_user_id,
          friend:friend_user_id(full_name, username)
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const friendsList: Friend[] = (data || []).map((item) => ({
        id: item.id,
        friend_user_id: item.friend_user_id,
        friend_name:
          (item.friend as any)?.full_name ||
          (item.friend as any)?.username ||
          "Unknown",
      }));

      setFriends(friendsList);
    } catch (error) {
      console.error("Failed to load friends:", error);
      toast.error("Failed to load friends list");
    }
  };

  const handleRecommend = async () => {
    if (!user || selectedFriends.length === 0) {
      toast.error("Please select at least one friend");
      return;
    }

    setLoading(true);

    try {
      const recommendations = selectedFriends.map((friendId) => ({
        sender_user_id: user.id,
        receiver_user_id: friendId,
        title_id: titleId,
        message: message || null,
      }));

      const { error } = await supabase
        .from("user_social_recommendations")
        .insert(recommendations);

      if (error) throw error;

      toast.success(
        `Recommended "${titleName}" to ${selectedFriends.length} friend${
          selectedFriends.length > 1 ? "s" : ""
        }!`
      );
      
      setSelectedFriends([]);
      setMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send recommendations:", error);
      toast.error("Failed to send recommendations");
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Recommend "{titleName}"
          </DialogTitle>
          <DialogDescription>
            Share this title with friends from your trusted circle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {friends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No friends in your trusted circle yet</p>
              <p className="text-sm mt-1">Add friends to start sharing recommendations</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                <Label className="text-sm font-semibold">
                  Select Friends ({selectedFriends.length} selected)
                </Label>
                {friends.map((friend) => (
                  <div
                    key={friend.friend_user_id}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={friend.friend_user_id}
                      checked={selectedFriends.includes(friend.friend_user_id)}
                      onCheckedChange={() => toggleFriend(friend.friend_user_id)}
                    />
                    <Label
                      htmlFor={friend.friend_user_id}
                      className="flex-1 cursor-pointer"
                    >
                      {friend.friend_name}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-semibold">
                  Personal Note (Optional)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message about why you're recommending this..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </>
          )}
        </div>

        {friends.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecommend}
              disabled={loading || selectedFriends.length === 0}
            >
              {loading ? "Sending..." : "Send Recommendation"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
