import { useEffect, useState } from "react";
import { TitleCard } from "@/components/TitleCard";
import { WatchlistStats } from "@/components/WatchlistStats";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bookmark, Trash2, ArrowUpDown, Heart } from "@/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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

type SortOption = "date" | "alpha" | "rating";

interface WatchlistItem {
  id: string;
  title_id: string;
  status: string;
  added_at: string;
  title_name?: string;
}

export default function Watchlist() {
  const [pendingTitles, setPendingTitles] = useState<WatchlistItem[]>([]);
  const [watchedTitles, setWatchedTitles] = useState<WatchlistItem[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [titleToDelete, setTitleToDelete] = useState<string | null>(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [avgRating, setAvgRating] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadWatchlist("pending");
      loadWatchlist("watched");
      calculateStats();
    }
  }, [user]);

  const loadWatchlist = async (status: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_title_interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('interaction_type', status === 'pending' ? 'wishlisted' : 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = (data || []).map(item => ({
        id: item.id,
        title_id: item.title_id,
        status,
        added_at: item.created_at,
        title_name: `Title ${item.title_id.substring(0, 8)}`
      }));

      if (status === 'pending') {
        setPendingTitles(items);
      } else {
        setWatchedTitles(items);
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  };

  const calculateStats = async () => {
    if (!user) return;

    try {
      const { data: watchedItems } = await supabase
        .from('user_title_interactions')
        .select('watch_duration_percentage, rating_value')
        .eq('user_id', user.id)
        .eq('interaction_type', 'completed');

      if (watchedItems && watchedItems.length > 0) {
        const totalTime = watchedItems.reduce((sum, item) => 
          sum + (item.watch_duration_percentage || 0) * 120, 0
        );
        setTotalWatchTime(Math.round(totalTime / 60));

        const ratings = watchedItems
          .map(item => item.rating_value === 'love_it' ? 5 : item.rating_value === 'like_it' ? 4 : item.rating_value === 'ok' ? 3 : 2)
          .filter(r => r > 0);
        
        if (ratings.length > 0) {
          setAvgRating(ratings.reduce((a, b) => a + b, 0) / ratings.length);
        }
      }
    } catch (error) {
      console.error('Failed to calculate stats:', error);
    }
  };

  const markAsWatched = async (titleId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_title_interactions')
        .update({ interaction_type: 'completed' })
        .eq('id', titleId)
        .eq('user_id', user.id);

      toast.success('Marked as watched!');
      loadWatchlist('pending');
      loadWatchlist('watched');
      calculateStats();
    } catch (error) {
      console.error('Failed to mark as watched:', error);
      toast.error('Failed to update');
    }
  };

  const removeFromWatchlist = async (titleId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_title_interactions')
        .delete()
        .eq('id', titleId)
        .eq('user_id', user.id);

      toast.success('Removed from watchlist');
      loadWatchlist('pending');
      loadWatchlist('watched');
      calculateStats();
      setDeleteConfirmOpen(false);
      setTitleToDelete(null);
    } catch (error) {
      console.error('Failed to remove:', error);
      toast.error('Failed to remove');
    }
  };

  const sortTitles = (titles: WatchlistItem[]) => {
    const sorted = [...titles];
    if (sortBy === "date") {
      sorted.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
    } else if (sortBy === "alpha") {
      sorted.sort((a, b) => (a.title_name || '').localeCompare(b.title_name || ''));
    }
    return sorted;
  };

  return (
    <div className="bg-gradient-to-br from-background to-accent/10 min-h-screen">
      <div className="max-w-6xl mx-auto p-4 space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Watchlist</h1>
            <p className="text-muted-foreground mt-1">Track what you want to watch and what you've seen</p>
          </div>
        </div>

        <WatchlistStats
          totalTitles={pendingTitles.length + watchedTitles.length}
          watchedCount={watchedTitles.length}
          totalWatchTime={totalWatchTime}
          avgRating={avgRating}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Bookmark className="w-4 h-4" />
                To Watch ({pendingTitles.length})
              </TabsTrigger>
              <TabsTrigger value="watched" className="gap-2">
                <Heart className="w-4 h-4" />
                Watched ({watchedTitles.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date Added</SelectItem>
                  <SelectItem value="alpha">Alphabetical</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="pending" className="space-y-4">
            {pendingTitles.length === 0 ? (
              <Card className="p-12 text-center">
                <Bookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No titles in your watchlist yet</h3>
                <p className="text-muted-foreground mb-4">Start adding movies and series you want to watch</p>
                <Button onClick={() => window.location.href = '/app/search'}>
                  Browse Content
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sortTitles(pendingTitles).map((item) => (
                  <div key={item.id} className="relative group">
                    <Card className="p-4 text-center">
                      <div className="h-48 bg-muted rounded mb-3 flex items-center justify-center">
                        <Bookmark className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <h4 className="font-medium truncate">{item.title_name}</h4>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1" onClick={() => markAsWatched(item.id)}>
                          Watched
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTitleToDelete(item.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="watched" className="space-y-4">
            {watchedTitles.length === 0 ? (
              <Card className="p-12 text-center">
                <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No watched titles yet</h3>
                <p className="text-muted-foreground">Mark titles as watched from your watchlist</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sortTitles(watchedTitles).map((item) => (
                  <div key={item.id} className="relative group">
                    <Card className="p-4 text-center">
                      <Badge className="mb-2">Watched</Badge>
                      <div className="h-48 bg-muted rounded mb-3 flex items-center justify-center">
                        <Heart className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <h4 className="font-medium truncate">{item.title_name}</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => {
                          setTitleToDelete(item.id);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from watchlist?</AlertDialogTitle>
              <AlertDialogDescription>
                This title will be permanently removed from your watchlist.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => titleToDelete && removeFromWatchlist(titleToDelete)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
