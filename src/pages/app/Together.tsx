import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Heart, Share2, Play, UserPlus } from "@/icons";
import { toast } from "sonner";
import { InviteFriendDialog } from "@/components/InviteFriendDialog";

interface FriendMatch {
  id: string;
  friendName: string;
  friendInitials: string;
  commonTitles: number;
  lastInteraction?: string;
}

interface SharedTitle {
  id: string;
  titleId: string;
  titleName: string;
  posterPath?: string;
  sharedBy: string[];
  type: 'movie' | 'series';
}

export default function Together() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [friendMatches, setFriendMatches] = useState<FriendMatch[]>([]);
  const [sharedTitles, setSharedTitles] = useState<SharedTitle[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      loadTogetherData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const loadTogetherData = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Fetch friends
      const { data: connections } = await supabase
        .from('friend_connections')
        .select('friend_user_id')
        .eq('user_id', profile.id)
        .eq('relationship_type', 'friend');

      if (!connections || connections.length === 0) {
        setLoading(false);
        return;
      }

      const friendIds = connections.map(c => c.friend_user_id);

      // Fetch friend info
      const { data: friendsData } = await supabase
        .from('users')
        .select('id, full_name, username')
        .in('id', friendIds);

      // Fetch user's watchlist titles
      const { data: userWatchlist } = await supabase
        .from('user_title_interactions')
        .select('title_id')
        .eq('user_id', profile.id)
        .in('interaction_type', ['wishlisted', 'completed']);

      const userTitleIds = new Set((userWatchlist || []).map(w => w.title_id));

      // For each friend, find common titles
      const matchPromises = friendIds.map(async (friendId) => {
        const { data: friendWatchlist } = await supabase
          .from('user_title_interactions')
          .select('title_id')
          .eq('user_id', friendId)
          .in('interaction_type', ['wishlisted', 'completed']);

        const commonTitles = (friendWatchlist || []).filter(
          w => userTitleIds.has(w.title_id)
        ).length;

        const friendInfo = friendsData?.find(f => f.id === friendId);
        const name = friendInfo?.full_name || friendInfo?.username || 'Friend';

        return {
          id: friendId,
          friendName: name,
          friendInitials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          commonTitles,
        };
      });

      const matches = await Promise.all(matchPromises);
      setFriendMatches(matches.filter(m => m.commonTitles > 0).sort((a, b) => b.commonTitles - a.commonTitles));

      // Find most common shared titles across friends
      const { data: allFriendWatchlists } = await supabase
        .from('user_title_interactions')
        .select('title_id, user_id')
        .in('user_id', friendIds)
        .in('interaction_type', ['wishlisted', 'completed']);

      // Count occurrences and find titles in user's watchlist
      const titleCounts = new Map<string, Set<string>>();
      (allFriendWatchlists || []).forEach(item => {
        if (userTitleIds.has(item.title_id)) {
          if (!titleCounts.has(item.title_id)) {
            titleCounts.set(item.title_id, new Set());
          }
          titleCounts.get(item.title_id)!.add(item.user_id);
        }
      });

      // Get top shared titles
      const topTitleIds = Array.from(titleCounts.entries())
        .filter(([, users]) => users.size >= 1)
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 6)
        .map(([titleId]) => titleId);

      if (topTitleIds.length > 0) {
        const { data: titlesData } = await supabase
          .from('titles')
          .select('id, name, poster_path, title_type')
          .in('id', topTitleIds);

        const shared: SharedTitle[] = (titlesData || []).map(title => {
          const sharedByIds = titleCounts.get(title.id) || new Set();
          const sharedByNames = Array.from(sharedByIds).map(id => {
            const friend = friendsData?.find(f => f.id === id);
            return friend?.full_name || friend?.username || 'Friend';
          });

          return {
            id: title.id,
            titleId: title.id,
            titleName: title.name || 'Unknown',
            posterPath: title.poster_path,
            sharedBy: sharedByNames,
            type: title.title_type === 'tv' ? 'series' : 'movie',
          };
        });

        setSharedTitles(shared);
      }
    } catch (error) {
      console.error('Failed to load together data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWatchParty = (titleId: string) => {
    toast.info('Watch parties coming soon!');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasFriends = friendMatches.length > 0 || sharedTitles.length > 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
          Watch Together
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Find shows and movies you and your friends both want to watch.
        </p>
      </div>

      {!hasFriends ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Connect with friends first</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add friends to discover what you have in common and plan watch parties together.
          </p>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Friends
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Friend Matches */}
          {friendMatches.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Best Watch Buddies
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {friendMatches.slice(0, 6).map(match => (
                  <Card key={match.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {match.friendInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{match.friendName}</p>
                        <p className="text-sm text-muted-foreground">
                          {match.commonTitles} titles in common
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Shared Titles */}
          {sharedTitles.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-accent" />
                Watch Together Ideas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedTitles.map(title => (
                  <Card key={title.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex">
                        {title.posterPath ? (
                          <img 
                            src={`https://image.tmdb.org/t/p/w154${title.posterPath}`}
                            alt={title.titleName}
                            className="w-20 h-28 object-cover"
                          />
                        ) : (
                          <div className="w-20 h-28 bg-muted flex items-center justify-center">
                            <Play className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 p-3">
                          <p className="font-medium text-sm line-clamp-2">{title.titleName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {title.sharedBy.slice(0, 2).join(', ')}
                            {title.sharedBy.length > 2 && ` +${title.sharedBy.length - 2} more`}
                          </p>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="mt-2 h-7 text-xs"
                            onClick={() => handleStartWatchParty(title.titleId)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Watch Party
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <InviteFriendDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInviteSent={() => {
          loadTogetherData();
          setInviteDialogOpen(false);
        }}
      />
    </div>
  );
}
