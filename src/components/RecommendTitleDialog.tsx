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
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users, X, Mail, Phone } from "@/icons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { errorLogger } from "@/lib/services/ErrorLoggerService";

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
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [contactInput, setContactInput] = useState("");
  const [newContacts, setNewContacts] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (open && profile) {
      loadFriends();
    }
  }, [open, profile]);

  const loadFriends = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("friend_connections")
        .select(`
          id,
          friend_user_id,
          friend:friend_user_id(full_name, username)
        `)
        .eq("user_id", profile.id);

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
      await errorLogger.log(error, {
        operation: 'recommend_title_load_friends',
        titleId
      });
      toast.error("Failed to load friends list");
    }
  };

  const validateContact = (contact: string) => {
    if (method === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    } else {
      return /^\+?[\d\s\-()]+$/.test(contact);
    }
  };

  const addNewContact = () => {
    if (!contactInput.trim()) {
      toast.error(`Please enter ${method === "email" ? "an email address" : "a phone number"}`);
      return;
    }

    if (!validateContact(contactInput)) {
      toast.error(`Please enter a valid ${method === "email" ? "email address" : "phone number"}`);
      return;
    }

    if (newContacts.includes(contactInput)) {
      toast.error("This contact has already been added");
      return;
    }

    setNewContacts([...newContacts, contactInput]);
    setContactInput("");
  };

  const removeNewContact = (contact: string) => {
    setNewContacts(newContacts.filter((c) => c !== contact));
  };

  const handleRecommend = async () => {
    const totalRecipients = selectedFriends.length + newContacts.length;
    
    if (!profile || totalRecipients === 0) {
      toast.error("Please select at least one friend or add a contact");
      return;
    }

    setLoading(true);

    try {
      // Send recommendations to existing friends
      if (selectedFriends.length > 0) {
        const recommendations = selectedFriends.map((friendId) => ({
          sender_user_id: profile.id,
          receiver_user_id: friendId,
          title_id: titleId,
          message: message || null,
        }));

        const { error } = await supabase
          .from("user_social_recommendations")
          .insert(recommendations);

        if (error) throw error;
      }

      // Send invitations to new contacts with recommendation
      if (newContacts.length > 0) {
        const { error: inviteError } = await supabase.functions.invoke('send-invites', {
          body: {
            userId: profile.id,
            method,
            contacts: newContacts,
            note: `${message ? message + '\n\n' : ''}Check out "${titleName}" on ViiB!`
          }
        });

        if (inviteError) throw inviteError;
      }

      toast.success(
        `Recommended "${titleName}" to ${totalRecipients} recipient${
          totalRecipients > 1 ? "s" : ""
        }!`
      );
      
      setSelectedFriends([]);
      setNewContacts([]);
      setContactInput("");
      setMessage("");
      onOpenChange(false);
    } catch (error) {
      await errorLogger.log(error, {
        operation: 'send_title_recommendation',
        titleId,
        recipientCount: totalRecipients
      });
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
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Recommend "{titleName}"
          </DialogTitle>
          <DialogDescription>
            Share this title with friends or invite new people
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing Friends */}
          {friends.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Your Friends ({selectedFriends.length} selected)
              </Label>
              <div className="space-y-2 max-h-[150px] overflow-y-auto border rounded-md p-2">
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
            </div>
          )}

          {/* Add New Contacts */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Invite New People</Label>
            
            <Tabs value={method} onValueChange={(v) => setMethod(v as "email" | "phone")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-2 mt-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNewContact()}
                  />
                  <Button type="button" onClick={addNewContact} size="sm">Add</Button>
                </div>
              </TabsContent>

              <TabsContent value="phone" className="space-y-2 mt-3">
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNewContact()}
                  />
                  <Button type="button" onClick={addNewContact} size="sm">Add</Button>
                </div>
              </TabsContent>
            </Tabs>

            {newContacts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  New contacts ({newContacts.length})
                </Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20 max-h-[100px] overflow-y-auto">
                  {newContacts.map((contact) => (
                    <div
                      key={contact}
                      className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md text-sm"
                    >
                      <span className="truncate max-w-[150px]">{contact}</span>
                      <button
                        type="button"
                        onClick={() => removeNewContact(contact)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Personal Message */}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRecommend}
            disabled={loading || (selectedFriends.length === 0 && newContacts.length === 0)}
          >
            {loading ? "Sending..." : `Send to ${selectedFriends.length + newContacts.length} recipient${selectedFriends.length + newContacts.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
