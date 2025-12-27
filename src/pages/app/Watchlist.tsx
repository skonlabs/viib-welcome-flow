import { useEffect, useState, useMemo, useCallback } from "react";
import { TitleCard } from "@/components/TitleCard";
import { RatingDialog } from "@/components/RatingDialog";
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

const DEFAULT_RUNTIME_MINUTES = 120; // Default runtime if not available
const ITEMS_PER_PAGE = 20;
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
  tmdb_id?: number;
  season_number?: number;
  year?: number;
  poster_url?: string;
  trailer_url?: string;
  runtime_minutes?: number;
  avg_episode_minutes?: number;
  genres?: string[];
  cast?: string[];
  certification?: string;
  number_of_seasons?: number;
  overview?: string;
  streaming_services?: Array<{
    service_code: string;
    service_name: string;
    logo_url?: string;
  }>;
  added_at: string;
  recommended_by?: string;
  recommendation_note?: string;
  rating_value?: 'love_it' | 'like_it' | 'ok' | 'dislike_it' | 'not_rated' | null;
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
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [titleToRate, setTitleToRate] = useState<{ id: string; title_id: string; title: string } | null>(null);

  const { profile } = useAuth();

  useEffect(() => {
    if (profile) {
      loadWatchlist("pending");
      loadWatchlist("watched");
      loadRecommendedTitles();
      calculateStats();
    }
  }, [profile]);

  const loadWatchlist = async (status: string) => {
    if (!profile) return;
    setLoading(true);

    try {
      // Get all interactions for this user and status
      const { data: interactions, error } = await supabase
        .from('user_title_interactions')
        .select('id, title_id, season_number, created_at, rating_value')
        .eq('user_id', profile.id)
        .eq('interaction_type', status === 'pending' ? 'wishlisted' : 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!interactions || interactions.length === 0) {
        if (status === 'pending') setPendingTitles([]);
        else setWatchedTitles([]);
        setLoading(false);
        return;
      }

      const titleIds = [...new Set(interactions.map(i => i.title_id))];

      // Get all titles
      const { data: titlesData } = await supabase
        .from('titles')
        .select('id, name, title_type, poster_path, backdrop_path, trailer_url, runtime, release_date, first_air_date, tmdb_id')
        .in('id', titleIds);

      const titlesMap = new Map((titlesData || []).map(t => [t.id, t]));

      // Get seasons for entries that have season_number
      const seasonEntries = interactions.filter(i => i.season_number !== null);
      const seasonTitleIds = [...new Set(seasonEntries.map(i => i.title_id))];
      let seasonsMap = new Map<string, any>();

      if (seasonTitleIds.length > 0) {
        const { data: seasonsData } = await supabase
          .from('seasons')
          .select('id, season_number, name, poster_path, overview, air_date, episode_count, title_id')
          .in('title_id', seasonTitleIds);

        // Key by title_id + season_number
        seasonsMap = new Map(
          (seasonsData || []).map(s => [`${s.title_id}_${s.season_number}`, s])
        );
      }

      const enrichedTitles: EnrichedTitle[] = interactions.map((item) => {
        const titleData = titlesMap.get(item.title_id);
        const ratingValue = (item as any).rating_value as EnrichedTitle['rating_value'];

        if (item.season_number !== null) {
          // It's a season entry
          const seasonData = seasonsMap.get(`${item.title_id}_${item.season_number}`);
          return {
            id: item.id,
            title_id: item.title_id,
            tmdb_id: titleData?.tmdb_id ?? undefined,
            season_number: item.season_number,
            title: `${titleData?.name || 'Unknown'} - ${seasonData?.name || `Season ${item.season_number}`}`,
            type: 'series' as const,
            year: seasonData?.air_date ? new Date(seasonData.air_date).getFullYear() : undefined,
            poster_url: seasonData?.poster_path
              ? `https://image.tmdb.org/t/p/w500${seasonData.poster_path}` 
              : titleData?.poster_path
                ? `https://image.tmdb.org/t/p/w500${titleData.poster_path}`
                : undefined,
            trailer_url: titleData?.trailer_url,
            overview: seasonData?.overview,
            runtime_minutes: undefined,
            added_at: item.created_at,
            rating_value: ratingValue,
          };
        } else if (titleData) {
          // It's a title (movie or full series)
          const releaseYear = titleData.release_date 
            ? new Date(titleData.release_date).getFullYear()
            : titleData.first_air_date 
              ? new Date(titleData.first_air_date).getFullYear()
              : undefined;

          return {
            id: item.id,
            title_id: item.title_id,
            tmdb_id: titleData.tmdb_id ?? undefined,
            title: titleData.name || 'Unknown Title',
            type: titleData.title_type === 'tv' ? 'series' : 'movie',
            year: releaseYear,
            poster_url: titleData.poster_path 
              ? `https://image.tmdb.org/t/p/w500${titleData.poster_path}` 
              : undefined,
            trailer_url: titleData.trailer_url,
            runtime_minutes: titleData.runtime,
            added_at: item.created_at,
            rating_value: ratingValue,
          };
        } else {
          // Not found in either table
          return {
            id: item.id,
            title_id: item.title_id,
            title: 'Unknown Title',
            type: 'movie' as const,
            added_at: item.created_at,
            rating_value: ratingValue,
          };
        }
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
    if (!profile) return;
    setLoading(true);

    try {
      const { data: recommendations, error } = await supabase
        .from('user_social_recommendations')
        .select('id, title_id, message, created_at, sender:sender_user_id(full_name, username)')
        .eq('receiver_user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!recommendations || recommendations.length === 0) {
        setRecommendedTitles([]);
        setLoading(false);
        return;
      }

      const titleIds = [...new Set(recommendations.map(r => r.title_id))];

      // Get all titles
      const { data: titlesData } = await supabase
        .from('titles')
        .select('id, name, title_type, poster_path, trailer_url, runtime, release_date, first_air_date, tmdb_id')
        .in('id', titleIds);

      const titlesMap = new Map((titlesData || []).map(t => [t.id, t]));

      const enrichedTitles: EnrichedTitle[] = recommendations.map((item) => {
        const senderName = (item.sender as any)?.full_name || (item.sender as any)?.username || 'Someone';
        const titleData = titlesMap.get(item.title_id);

        if (titleData) {
          const releaseYear = titleData.release_date 
            ? new Date(titleData.release_date).getFullYear()
            : titleData.first_air_date 
              ? new Date(titleData.first_air_date).getFullYear()
              : undefined;

          return {
            id: item.id,
            title_id: item.title_id,
            tmdb_id: titleData.tmdb_id ?? undefined,
            title: titleData.name || 'Unknown Title',
            type: titleData.title_type === 'tv' ? 'series' : 'movie',
            year: releaseYear,
            poster_url: titleData.poster_path 
              ? `https://image.tmdb.org/t/p/w500${titleData.poster_path}` 
              : undefined,
            trailer_url: titleData.trailer_url,
            runtime_minutes: titleData.runtime,
            added_at: item.created_at,
            recommended_by: senderName,
            recommendation_note: item.message,
          };
        } else {
          return {
            id: item.id,
            title_id: item.title_id,
            title: 'Unknown Title',
            type: 'movie' as const,
            added_at: item.created_at,
            recommended_by: senderName,
            recommendation_note: item.message,
          };
        }
      });

      setRecommendedTitles(enrichedTitles);
    } catch (error) {
      console.error('Failed to load recommended titles:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    if (!profile) return;

    try {
      // Get watched items with their title IDs
      const { data: watchedItems } = await supabase
        .from('user_title_interactions')
        .select('title_id, watch_duration_percentage, rating_value')
        .eq('user_id', profile.id)
        .eq('interaction_type', 'completed');

      if (watchedItems && watchedItems.length > 0) {
        // Get actual runtimes for the titles
        const titleIds = [...new Set(watchedItems.map(i => i.title_id))];
        const { data: titlesData } = await supabase
          .from('titles')
          .select('id, runtime')
          .in('id', titleIds);

        const runtimeMap = new Map((titlesData || []).map(t => [t.id, t.runtime || DEFAULT_RUNTIME_MINUTES]));

        // Calculate total watch time using actual runtimes
        const totalTime = watchedItems.reduce((sum, item) => {
          const runtime = runtimeMap.get(item.title_id) || DEFAULT_RUNTIME_MINUTES;
          const percentage = item.watch_duration_percentage || 1; // Default to 100% if not set
          return sum + (runtime * percentage);
        }, 0);
        setTotalWatchTime(Math.round(totalTime / 60)); // Convert to hours

        // Calculate average rating
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

  const openRatingDialogForPending = (item: EnrichedTitle) => {
    setTitleToRate({ id: item.id, title_id: item.title_id, title: item.title });
    setRatingDialogOpen(true);
  };

  const openRatingDialogForRecommended = (item: EnrichedTitle) => {
    setTitleToRate({ id: '', title_id: item.title_id, title: item.title });
    setRatingDialogOpen(true);
  };

  const handleRatingSubmit = async (rating: 'love_it' | 'like_it' | 'dislike_it') => {
    if (!profile || !titleToRate) return;

    try {
      if (titleToRate.id) {
        // Update existing wishlisted entry to completed with rating
        await supabase
          .from('user_title_interactions')
          .update({ 
            interaction_type: 'completed',
            rating_value: rating
          })
          .eq('id', titleToRate.id)
          .eq('user_id', profile.id);
      } else {
        // Create new completed entry (for recommended titles)
        const { error } = await supabase
          .from('user_title_interactions')
          .insert({
            user_id: profile.id,
            title_id: titleToRate.title_id,
            interaction_type: 'completed',
            rating_value: rating
          });

        if (error) throw error;
      }

      toast.success(`Marked as "${rating.replace('_', ' ')}"!`);
      setRatingDialogOpen(false);
      setTitleToRate(null);
      loadWatchlist('pending');
      loadWatchlist('watched');
      loadRecommendedTitles();
      calculateStats();
    } catch (error) {
      console.error('Failed to rate:', error);
      toast.error('Failed to save rating');
    }
  };

  const moveToWatchlist = async (titleId: string) => {
    if (!profile) return;

    try {
      // Check if already in watchlist
      const { data: existing } = await supabase
        .from('user_title_interactions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('title_id', titleId)
        .eq('interaction_type', 'wishlisted')
        .maybeSingle();

      if (existing) {
        toast.info("Already in your watchlist");
        return;
      }

      const { error } = await supabase
        .from('user_title_interactions')
        .insert({
          user_id: profile.id,
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

  const moveToWatchlistFromWatched = async (interactionId: string) => {
    if (!profile) return;

    try {
      await supabase
        .from('user_title_interactions')
        .update({ interaction_type: 'wishlisted' })
        .eq('id', interactionId)
        .eq('user_id', profile.id);

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
    if (!profile) return;

    try {
      if (type === 'recommended') {
        await supabase
          .from('user_social_recommendations')
          .delete()
          .eq('id', id)
          .eq('receiver_user_id', profile.id);
      } else {
        await supabase
          .from('user_title_interactions')
          .delete()
          .eq('id', id)
          .eq('user_id', profile.id);
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

  const sortTitles = useCallback((titles: EnrichedTitle[]) => {
    const sorted = [...titles];
    if (sortBy === "date") {
      sorted.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
    } else if (sortBy === "alpha") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "rating") {
      const ratingOrder = { 'love_it': 4, 'like_it': 3, 'ok': 2, 'dislike_it': 1, 'not_rated': 0, null: 0 };
      sorted.sort((a, b) => (ratingOrder[b.rating_value || null] || 0) - (ratingOrder[a.rating_value || null] || 0));
    }
    return sorted;
  }, [sortBy]);

  // Memoized sorted lists
  const sortedPendingTitles = useMemo(() => sortTitles(pendingTitles), [pendingTitles, sortTitles]);
  const sortedWatchedTitles = useMemo(() => sortTitles(watchedTitles), [watchedTitles, sortTitles]);
  const sortedRecommendedTitles = useMemo(() => sortTitles(recommendedTitles), [recommendedTitles, sortTitles]);

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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {sortedPendingTitles.map((item) => (
                  <TitleCard
                    key={item.id}
                    title={item}
                    onClick={() => setSelectedTitle(item)}
                    showAvailability={true}
                    compactRecommend
                    actions={{
                      onWatched: () => openRatingDialogForPending(item),
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {sortedWatchedTitles.map((item) => (
                  <TitleCard
                    key={item.id}
                    title={item}
                    onClick={() => setSelectedTitle(item)}
                    showAvailability={true}
                    compactRecommend
                    userRating={item.rating_value}
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {sortedRecommendedTitles.map((item) => (
                  <TitleCard
                    key={item.id}
                    title={item}
                    onClick={() => setSelectedTitle(item)}
                    showAvailability={true}
                    compactRecommend
                    recommendedBy={item.recommended_by}
                    recommendationNote={item.recommendation_note}
                    actions={{
                      onWatchlist: () => moveToWatchlist(item.title_id),
                      onWatched: () => openRatingDialogForRecommended(item),
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
              tmdb_id: selectedTitle.tmdb_id,
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
              season_number: selectedTitle.season_number,
              overview: selectedTitle.overview,
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

        <RatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          titleName={titleToRate?.title || ''}
          onRate={handleRatingSubmit}
        />
      </div>
    </div>
  );
}
