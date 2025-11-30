import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Check, X, Users } from "@/icons";
import { toast } from "sonner";
import { InviteFriendDialog } from "@/components/InviteFriendDialog";

export default function Social() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [connections, setConnections] = useState<any[]>([]);
  const [pendingReceived, setPendingReceived] = useState<any[]>([]);
  const [pendingSent, setPendingSent] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadConnections();
      loadActivityFeed();
    }
  }, [user]);

  const loadConnections = async () => {
    if (!user) return;

    try {
      const { data: accepted, error: acceptedError } = await supabase
        .from('friend_connections')
        .select('*')
        .eq('user_id', user.id);

      if (acceptedError) throw acceptedError;
      setConnections(accepted || []);

      // Load mutual connections
      const { data: mutual } = await supabase
        .from('friend_connections')
        .select('*')
        .eq('friend_user_id', user.id);

      setPendingReceived(mutual?.filter(c => c.relationship_type === 'pending_invite') || []);
    } catch (error) {
      console.error('Failed to load connections:', error);
      toast.error("Failed to load connections");
    }
  };

  const loadActivityFeed = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_social_recommendations')
        .select('*')
        .eq('receiver_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setActivityFeed(data || []);
    } catch (error) {
      console.error('Failed to load activity feed:', error);
      toast.error("Failed to load activity");
    }
  };

  const sendFriendRequest = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { data: friendUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (!friendUser) {
        toast.error("User not found");
        return;
      }

      const { error } = await supabase
        .from('friend_connections')
        .insert({
          user_id: user!.id,
          friend_user_id: friendUser.id,
          relationship_type: 'pending_invite'
        });

      if (error) throw error;

      toast.success("Friend request sent!");
      setEmail("");
      loadConnections();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.message || "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('friend_connections')
        .update({ relationship_type: 'friend' })
        .eq('id', connectionId);

      if (error) throw error;

      toast.success('Friend request accepted!');
      loadConnections();
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast.error('Failed to accept request');
    }
  };

  const rejectRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('friend_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast.success('Friend request rejected');
      loadConnections();
      setRejectDialogOpen(false);
      setRequestToReject(null);
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject request');
    }
  };

  const removeConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('friend_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast.success('Connection removed');
      loadConnections();
    } catch (error) {
      console.error('Failed to remove connection:', error);
      toast.error('Failed to remove connection');
    }
  };

  return (
    <div className="bg-gradient-to-br from-background to-accent/10 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Social</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Connect with friends and share recommendations</p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Friends
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="feed">Activity Feed</TabsTrigger>
            <TabsTrigger value="connections">
              Friends ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingReceived.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Friend</CardTitle>
                <CardDescription>Connect with friends by email address</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Friend's email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                  />
                  <Button onClick={sendFriendRequest} disabled={loading || !email}>
                    Send Request
                  </Button>
                </div>
              </CardContent>
            </Card>

            {activityFeed.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                <p className="text-muted-foreground">Connect with friends to see their recommendations and activity</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activityFeed.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {activity.sender_user_id ? activity.sender_user_id.substring(0, 2).toUpperCase() : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">Friend recommended a title</p>
                          <p className="text-sm text-muted-foreground">{activity.message || 'Check this out!'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            {connections.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                <p className="text-muted-foreground mb-4">Start connecting with friends to share recommendations</p>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Friends
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {connections.map((connection) => (
                  <Card key={connection.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {connection.friend_user_id.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">Friend</p>
                            <p className="text-sm text-muted-foreground">
                              Connected {new Date(connection.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeConnection(connection.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {pendingReceived.length === 0 ? (
              <Card className="p-12 text-center">
                <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground">You'll see friend requests here</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingReceived.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {request.user_id.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">Friend Request</p>
                            <p className="text-sm text-muted-foreground">Sent {new Date(request.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => acceptRequest(request.id)}>
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRequestToReject(request.id);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject friend request?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => requestToReject && rejectRequest(requestToReject)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <InviteFriendDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onInviteSent={() => {
            setInviteDialogOpen(false);
            toast.success('Invitation sent!');
          }}
        />
      </div>
    </div>
  );
}
