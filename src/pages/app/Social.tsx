import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { UserPlus, Check, X, Users, Loader2 } from "@/icons";
import { toast } from "sonner";
import { InviteFriendDialog } from "@/components/InviteFriendDialog";
import UserSocialGraph from "@/components/UserSocialGraph";

const ACTIVITY_PAGE_SIZE = 20;

interface UserInfo {
  id: string;
  full_name?: string;
  username?: string;
}

interface EnrichedConnection {
  id: string;
  user_id: string;
  friend_user_id: string;
  relationship_type: string;
  created_at: string;
  friend_name: string;
  friend_initials: string;
}

interface EnrichedActivity {
  id: string;
  sender_user_id: string;
  title_id: string;
  message?: string;
  created_at: string;
  sender_name: string;
  sender_initials: string;
}

export default function Social() {
  const { profile } = useAuth();
  const [connections, setConnections] = useState<EnrichedConnection[]>([]);
  const [pendingReceived, setPendingReceived] = useState<EnrichedConnection[]>([]);
  const [activityFeed, setActivityFeed] = useState<EnrichedActivity[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivity, setHasMoreActivity] = useState(true);
  const [loadingMoreActivity, setLoadingMoreActivity] = useState(false);

  // Helper to get user display name and initials
  const getUserDisplayInfo = (userData: UserInfo | null, fallbackId: string) => {
    if (userData?.full_name) {
      return {
        name: userData.full_name,
        initials: userData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      };
    }
    if (userData?.username) {
      return {
        name: userData.username,
        initials: userData.username.slice(0, 2).toUpperCase()
      };
    }
    return {
      name: 'User',
      initials: fallbackId.slice(0, 2).toUpperCase()
    };
  };

  useEffect(() => {
    if (profile) {
      loadConnections();
      loadActivityFeed();
    }
  }, [profile]);

  const loadConnections = async () => {
    if (!profile) return;
    setLoadingConnections(true);

    try {
      // Fetch both connection types in parallel
      const [acceptedResult, mutualResult] = await Promise.all([
        supabase
          .from('friend_connections')
          .select('*')
          .eq('user_id', profile.id),
        supabase
          .from('friend_connections')
          .select('*')
          .eq('friend_user_id', profile.id)
      ]);

      if (acceptedResult.error) throw acceptedResult.error;

      const acceptedConnections = acceptedResult.data || [];
      const pendingConnections = (mutualResult.data || []).filter(c => c.relationship_type === 'pending_invite');

      // Get all unique user IDs to fetch names
      const allUserIds = [
        ...acceptedConnections.map(c => c.friend_user_id),
        ...pendingConnections.map(c => c.user_id)
      ];
      const uniqueUserIds = [...new Set(allUserIds)];

      // Fetch user info for all connections
      let userMap = new Map<string, UserInfo>();
      if (uniqueUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, username')
          .in('id', uniqueUserIds);

        userMap = new Map((usersData || []).map(u => [u.id, u]));
      }

      // Enrich accepted connections with friend names
      const enrichedAccepted: EnrichedConnection[] = acceptedConnections.map(conn => {
        const friendInfo = getUserDisplayInfo(userMap.get(conn.friend_user_id) || null, conn.friend_user_id);
        return {
          ...conn,
          friend_name: friendInfo.name,
          friend_initials: friendInfo.initials
        };
      });

      // Enrich pending connections with sender names
      const enrichedPending: EnrichedConnection[] = pendingConnections.map(conn => {
        const senderInfo = getUserDisplayInfo(userMap.get(conn.user_id) || null, conn.user_id);
        return {
          ...conn,
          friend_name: senderInfo.name,
          friend_initials: senderInfo.initials
        };
      });

      setConnections(enrichedAccepted);
      setPendingReceived(enrichedPending);
    } catch (error) {
      console.error('Failed to load connections:', error);
      toast.error("Failed to load connections");
    } finally {
      setLoadingConnections(false);
    }
  };

  const loadActivityFeed = async (reset = true) => {
    if (!profile) return;
    if (reset) {
      setLoadingActivity(true);
      setActivityPage(1);
    } else {
      setLoadingMoreActivity(true);
    }

    try {
      const page = reset ? 1 : activityPage;
      const { data, error } = await supabase
        .from('user_social_recommendations')
        .select('*')
        .eq('receiver_user_id', profile.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * ACTIVITY_PAGE_SIZE, page * ACTIVITY_PAGE_SIZE - 1);

      if (error) throw error;

      const activities = data || [];

      // Get sender user info
      const senderIds = [...new Set(activities.map(a => a.sender_user_id))];
      let userMap = new Map<string, UserInfo>();

      if (senderIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, username')
          .in('id', senderIds);

        userMap = new Map((usersData || []).map(u => [u.id, u]));
      }

      // Enrich activities with sender names
      const enrichedActivities: EnrichedActivity[] = activities.map(activity => {
        const senderInfo = getUserDisplayInfo(userMap.get(activity.sender_user_id) || null, activity.sender_user_id);
        return {
          ...activity,
          sender_name: senderInfo.name,
          sender_initials: senderInfo.initials
        };
      });

      if (reset) {
        setActivityFeed(enrichedActivities);
      } else {
        setActivityFeed(prev => [...prev, ...enrichedActivities]);
      }

      setHasMoreActivity(activities.length >= ACTIVITY_PAGE_SIZE);
      if (!reset) {
        setActivityPage(page + 1);
      }
    } catch (error) {
      console.error('Failed to load activity feed:', error);
      toast.error("Failed to load activity");
    } finally {
      setLoadingActivity(false);
      setLoadingMoreActivity(false);
    }
  };

  const loadMoreActivity = () => {
    if (!loadingMoreActivity && hasMoreActivity) {
      loadActivityFeed(false);
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feed">Activity</TabsTrigger>
            <TabsTrigger value="connections">
              Friends ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingReceived.length})
            </TabsTrigger>
            <TabsTrigger value="circle">Your Circle</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            {loadingActivity ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-64" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
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
                            {activity.sender_initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{activity.sender_name} recommended a title</p>
                          <p className="text-sm text-muted-foreground">{activity.message || 'Check this out!'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {hasMoreActivity && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={loadMoreActivity}
                      disabled={loadingMoreActivity}
                    >
                      {loadingMoreActivity ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            {loadingConnections ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : connections.length === 0 ? (
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
                              {connection.friend_initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{connection.friend_name}</p>
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
            {loadingConnections ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingReceived.length === 0 ? (
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
                              {request.friend_initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{request.friend_name}</p>
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

          <TabsContent value="circle" className="space-y-4">
            <UserSocialGraph />
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
