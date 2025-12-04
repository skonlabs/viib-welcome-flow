import { useEffect, useState } from "react";
import { TitleCard } from "@/components/TitleCard";
import { WatchlistStats } from "@/components/WatchlistStats";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bookmark, Trash2, ArrowUpDown, Heart, Users } from "@/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TitleDetailsModal } from "@/components/TitleDetailsModal";
import { RecommendTitleDialog } from "@/components/RecommendTitleDialog";
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

interface EnrichedTitle {
  id: string;
  title_id: string;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  poster_url?: string;
  trailer_url?: string;
  runtime_minutes?: number;
  avg_episode_minutes?: number;
  genres?: string[];
  cast?: string[];
  certification?: string;
  number_of_seasons?: number;
  streaming_services?: Array<{
    service_code: string;
    service_name: string;
    logo_url?: string;
  }>;
  added_at: string;
  recommended_by?: string;
  recommendation_note?: string;
}

export default function Watchlist() {
  const [pendingTitles, setPendingTitles] = useState<EnrichedTitle[]>([]);
  const [watchedTitles, setWatchedTitles] = useState<EnrichedTitle[]>([]);
  const [recommendedTitles, setRecommendedTitles] = useState<EnrichedTitle[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: string } | null>(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState<EnrichedTitle | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendDialogOpen, setRecommendDialogOpen] = useState(false);
  const [titleToRecommend, setTitleToRecommend] = useState<{ id: string; name: string } | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadWatchlist("pending");
      loadWatchlist("watched");
      loadRecommendedTitles();
      calculateStats();
    }
  }, [user]);

  const loadWatchlist = async (status: string) => {
    if (!user) return;
    setLoading(true);

    try {
      // Join with titles table to get all title data directly
      const { data, error } = await supabase
        .from('user_title_interactions')
        .select(`
          id,
          title_id,
          created_at,
          titles:title_id (
            id,
            name,
            title_type,
            poster_path,
            backdrop_path,
            trailer_url,
            runtime,
            vote_average,
            release_date,
            first_air_date,
            overview,
            tmdb_id
          )
        `)
        .eq('user_id', user.id)
        .eq('interaction_type', status === 'pending' ? 'wishlisted' : 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedTitles: EnrichedTitle[] = (data || []).map((item) => {
        const titleData = item.titles as any;
        const releaseYear = titleData?.release_date 
          ? new Date(titleData.release_date).getFullYear()
          : titleData?.first_air_date 
            ? new Date(titleData.first_air_date).getFullYear()
            : undefined;

        return {
          id: item.id,
          title_id: item.title_id,
          title: titleData?.name || 'Unknown Title',
          type: titleData?.title_type === 'tv' ? 'series' : 'movie',
          year: releaseYear,
          poster_url: titleData?.poster_path 
            ? `https://image.tmdb.org/t/p/w500${titleData.poster_path}` 
            : undefined,
          trailer_url: titleData?.trailer_url,
          runtime_minutes: titleData?.runtime,
          added_at: item.created_at,
        };
      });

      if (status === 'pending') {
        setPendingTitles(enrichedTitles);
      } else {
        setWatchedTitles(enrichedTitles);
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendedTitles = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_social_recommendations')
        .select(`
          id,
          title_id,
          message,
          created_at,
          sender:sender_user_id(full_name, username),
          titles:title_id (
            id,
            name,
            title_type,
            poster_path,
            backdrop_path,
            trailer_url,
            runtime,
            vote_average,
            release_date,
            first_air_date,
            overview,
            tmdb_id
          )
        `)
        .eq('receiver_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedTitles: EnrichedTitle[] = (data || []).map((item) => {
        const titleData = item.titles as any;
        const senderName = (item.sender as any)?.full_name || (item.sender as any)?.username || 'Someone';
        const releaseYear = titleData?.release_date 
          ? new Date(titleData.release_date).getFullYear()
          : titleData?.first_air_date 
            ? new Date(titleData.first_air_date).getFullYear()
            : undefined;

        return {
          id: item.id,
          title_id: item.title_id,
          title: titleData?.name || 'Unknown Title',
          type: titleData?.title_type === 'tv' ? 'series' : 'movie',
          year: releaseYear,
          poster_url: titleData?.poster_path 
            ? `https://image.tmdb.org/t/p/w500${titleData.poster_path}` 
            : undefined,
          trailer_url: titleData?.trailer_url,
          runtime_minutes: titleData?.runtime,
          added_at: item.created_at,
          recommended_by: senderName,
          recommendation_note: item.message,
        };
      });

      setRecommendedTitles(enrichedTitles);
    } catch (error) {
      console.error('Failed to load recommended titles:', error);
    } finally {
      setLoading(false);
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

  const markAsWatched = async (interactionId: string, titleId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_title_interactions')
        .update({ interaction_type: 'completed' })
        .eq('id', interactionId)
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

  const moveToWatchlist = async (titleId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_title_interactions')
        .insert({
          user_id: user.id,
          title_id: titleId,
          interaction_type: 'wishlisted'
        });

      if (error) throw error;

      toast.success('Added to watchlist!');
      loadWatchlist('pending');
      loadRecommendedTitles();
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  };

  const moveToWatched = async (titleId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_title_interactions')
        .insert({
          user_id: user.id,
          title_id: titleId,
          interaction_type: 'completed'
        });

      if (error) throw error;

      toast.success('Marked as watched!');
      loadWatchlist('watched');
      loadRecommendedTitles();
      calculateStats();
    } catch (error) {
      console.error('Failed to mark as watched:', error);
      toast.error('Failed to mark as watched');
    }
  };

  const moveToWatchlistFromWatched = async (interactionId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_title_interactions')
        .update({ interaction_type: 'wishlisted' })
        .eq('id', interactionId)
        .eq('user_id', user.id);

      toast.success('Moved to watchlist!');
      loadWatchlist('pending');
      loadWatchlist('watched');
      calculateStats();
    } catch (error) {
      console.error('Failed to move:', error);
      toast.error('Failed to move');
    }
  };

  const removeItem = async (id: string, type: string) => {
    if (!user) return;

    try {
      if (type === 'recommended') {
        await supabase
          .from('user_social_recommendations')
          .delete()
          .eq('id', id)
          .eq('receiver_user_id', user.id);
      } else {
        await supabase
          .from('user_title_interactions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      }

      toast.success('Removed successfully');
      if (type === 'recommended') {
        loadRecommendedTitles();
      } else {
        loadWatchlist('pending');
        loadWatchlist('watched');
        calculateStats();
      }
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Failed to remove:', error);
      toast.error('Failed to remove');
    }
  };

  const sortTitles = (titles: EnrichedTitle[]) => {
    const sorted = [...titles];
    if (sortBy === "date") {
      sorted.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
    } else if (sortBy === "alpha") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  };

  return (
    <div className="bg-gradient-to-br from-background to-accent/10 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Watchlist</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Track what you want to watch and what you've seen</p>
          </div>
        </div>

        <WatchlistStats
          totalTitles={pendingTitles.length + watchedTitles.length + recommendedTitles.length}
          watchedCount={watchedTitles.length}
          totalWatchTime={totalWatchTime}
          avgRating={avgRating}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="pending" className="gap-2">
                <Bookmark className="w-4 h-4" />
                To Watch ({pendingTitles.length})
              </TabsTrigger>
              <TabsTrigger value="watched" className="gap-2">
                <Heart className="w-4 h-4" />
                Watched ({watchedTitles.length})
              </TabsTrigger>
              <TabsTrigger value="recommended" className="gap-2">
                <Users className="w-4 h-4" />
                Recommended ({recommendedTitles.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
            {loading && pendingTitles.length === 0 ? (
              <div className="text-center py-12">Loading...</div>
            ) : pendingTitles.length === 0 ? (
              <Card className="p-12 text-center">
                <Bookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No titles in your watchlist yet</h3>
                <p className="text-muted-foreground mb-4">Start adding movies and series you want to watch</p>
                <Button onClick={() => window.location.href = '/app/search'}>
                  Browse Content
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {sortTitles(pendingTitles).map((item) => (
                  <TitleCard
                    key={item.id}
                    title={item}
                    onClick={() => setSelectedTitle(item)}
                    showAvailability={true}
                    actions={{
                      onWatched: () => markAsWatched(item.id, item.title_id),
                      onRecommend: () => {
                        setTitleToRecommend({ id: item.title_id, name: item.title });
                        setRecommendDialogOpen(true);
                      },
                      onPass: () => {
                        setItemToDelete({ id: item.id, type: 'watchlist' });
                        setDeleteConfirmOpen(true);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="watched" className="space-y-4">
            {loading && watchedTitles.length === 0 ? (
              <div className="text-center py-12">Loading...</div>
            ) : watchedTitles.length === 0 ? (
              <Card className="p-12 text-center">
                <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No watched titles yet</h3>
                <p className="text-muted-foreground">Mark titles as watched from your watchlist</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {sortTitles(watchedTitles).map((item) => (
                  <TitleCard
                    key={item.id}
                    title={item}
                    onClick={() => setSelectedTitle(item)}
                    showAvailability={true}
                    actions={{
                      onWatchlist: () => moveToWatchlistFromWatched(item.id),
                      onRecommend: () => {
                        setTitleToRecommend({ id: item.title_id, name: item.title });
                        setRecommendDialogOpen(true);
                      },
                      onPass: () => {
                        setItemToDelete({ id: item.id, type: 'watched' });
                        setDeleteConfirmOpen(true);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommended" className="space-y-4">
            {loading && recommendedTitles.length === 0 ? (
              <div className="text-center py-12">Loading...</div>
            ) : recommendedTitles.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground">Your friends haven't recommended anything yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {sortTitles(recommendedTitles).map((item) => (
                  <TitleCard
                    key={item.id}
                    title={item}
                    onClick={() => setSelectedTitle(item)}
                    showAvailability={true}
                    recommendedBy={item.recommended_by}
                    recommendationNote={item.recommendation_note}
                    actions={{
                      onWatchlist: () => moveToWatchlist(item.title_id),
                      onWatched: () => moveToWatched(item.title_id),
                      onRecommend: () => {
                        setTitleToRecommend({ id: item.title_id, name: item.title });
                        setRecommendDialogOpen(true);
                      },
                      onPass: () => {
                        setItemToDelete({ id: item.id, type: 'recommended' });
                        setDeleteConfirmOpen(true);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this item?</AlertDialogTitle>
              <AlertDialogDescription>
                This will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => itemToDelete && removeItem(itemToDelete.id, itemToDelete.type)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {selectedTitle && (
          <TitleDetailsModal
            title={{
              tmdb_id: parseInt(selectedTitle.title_id),
              external_id: selectedTitle.title_id,
              title: selectedTitle.title,
              type: selectedTitle.type,
              year: selectedTitle.year,
              poster_url: selectedTitle.poster_url,
              trailer_url: selectedTitle.trailer_url,
              runtime_minutes: selectedTitle.runtime_minutes,
              avg_episode_minutes: selectedTitle.avg_episode_minutes,
              genres: selectedTitle.genres,
              cast: selectedTitle.cast,
              streaming_services: selectedTitle.streaming_services,
            }}
            open={!!selectedTitle}
            onOpenChange={(open) => !open && setSelectedTitle(null)}
          />
        )}

        {titleToRecommend && (
          <RecommendTitleDialog
            open={recommendDialogOpen}
            onOpenChange={setRecommendDialogOpen}
            titleId={titleToRecommend.id}
            titleName={titleToRecommend.name}
          />
        )}
      </div>
    </div>
  );
}
