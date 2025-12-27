import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { errorLogger } from "@/lib/services/ErrorLoggerService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Mail, Phone, LinkIcon, Copy, Check } from "@/icons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent: () => void;
}

export const InviteFriendDialog = ({ open, onOpenChange, onInviteSent }: InviteFriendDialogProps) => {
  const [method, setMethod] = useState<"email" | "phone" | "link">("link");
  const [contactInput, setContactInput] = useState("");
  const [contacts, setContacts] = useState<string[]>([]);
  const [message, setMessage] = useState("Hey! Join me on ViiB - it's an amazing app for discovering movies and shows based on your mood!");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { profile } = useAuth();

  const inviteLink = profile ? `${window.location.origin}?invited_by=${profile.id}` : "";

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      await errorLogger.log(error, {
        operation: 'copy_invite_link'
      });
      toast.error("Failed to copy link. Please try again.");
    }
  };

  const validateContact = (contact: string) => {
    if (method === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    } else {
      return /^\+?[\d\s\-()]+$/.test(contact);
    }
  };

  const addContact = () => {
    if (!contactInput.trim()) {
      toast.error(`Please enter ${method === "email" ? "an email address" : "a phone number"}`);
      return;
    }

    if (!validateContact(contactInput)) {
      toast.error(`Please enter a valid ${method === "email" ? "email address" : "phone number"}`);
      return;
    }

    if (contacts.includes(contactInput)) {
      toast.error("This contact has already been added");
      return;
    }

    setContacts([...contacts, contactInput]);
    setContactInput("");
  };

  const removeContact = (contact: string) => {
    setContacts(contacts.filter((c) => c !== contact));
  };

  const handleSendInvites = async () => {
    if (contacts.length === 0) {
      toast.error("Please add at least one contact");
      return;
    }

    if (!profile) {
      toast.error("You must be logged in to send invites");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invites', {
        body: {
          userId: profile.id,
          method,
          contacts,
          note: message
        }
      });

      if (error) throw error;

      toast.success(`Sent ${contacts.length} invitation${contacts.length > 1 ? 's' : ''} successfully!`);
      
      onInviteSent();
      setContacts([]);
      setContactInput("");
      setMessage("Hey! Join me on ViiB - it's an amazing app for discovering movies and shows based on your mood!");
    } catch (error) {
      await errorLogger.log(error, {
        operation: 'send_friend_invite',
        method,
        contactCount: contacts.length
      });
      toast.error("Unable to send invitations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>
            Share ViiB with your friends and watch together
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={method} onValueChange={(v) => setMethod(v as "email" | "phone" | "link")} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Your Personal Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  onClick={copyInviteLink}
                  className="flex items-center gap-2 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this link via messaging apps, social media, or anywhere you'd like to invite friends to ViiB.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="email-input">Email Address</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="email-input"
                  type="email"
                  placeholder="friend@example.com"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addContact()}
                />
                <Button type="button" onClick={addContact}>Add</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="phone" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="phone-input">Phone Number</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="phone-input"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addContact()}
                />
                <Button type="button" onClick={addContact}>Add</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {contacts.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Contacts to invite ({contacts.length})
            </Label>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 border rounded-md bg-muted/20">
              {contacts.map((contact) => (
                <div
                  key={contact}
                  className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md text-sm"
                >
                  <span className="truncate max-w-[200px]">{contact}</span>
                  <button
                    type="button"
                    onClick={() => removeContact(contact)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="invite-message">Personal Message (Optional)</Label>
          <Textarea
            id="invite-message"
            placeholder="Add a personal message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {method === "link" ? "Close" : "Cancel"}
          </Button>
          {method !== "link" && (
            <Button onClick={handleSendInvites} disabled={loading || contacts.length === 0}>
              {loading ? 'Sending...' : `Send ${contacts.length > 0 ? contacts.length : ''} Invite${contacts.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
