import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { TitleCard } from '@/components/TitleCard';
import { TitleDetailsModal } from '@/components/TitleDetailsModal';
import { RatingDialog } from '@/components/RatingDialog';
import { DismissTitleDialog } from '@/components/DismissTitleDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface RecommendedTitle {
  id: string;
  tmdb_id?: number;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  trailer_url?: string | null;
  runtime?: number | null;
  genres: string[];
  overview?: string | null;
  final_score: number;
  base_viib_score: number;
  intent_alignment_score: number;
  social_priority_score: number;
  transformation_score: number;
  recommendation_reason: string;
}

const Home = () => {
  const { profile, loading: authLoading } = useAuthContext();
  const [recommendations, setRecommendations] = useState<RecommendedTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userWatchlist, setUserWatchlist] = useState<Set<string>>(new Set());
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [titleToRate, setTitleToRate] = useState<{ id: string; name: string } | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<RecommendedTitle | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [titleToDismiss, setTitleToDismiss] = useState<{ id: string; name: string } | null>(null);

  // Wait for auth to load, then fetch recommendations
  useEffect(() => {
    if (authLoading) return;
    
    if (profile?.id) {
      fetchRecommendations();
      fetchUserWatchlist();
    } else {
      setLoading(false);
    }
  }, [authLoading, profile?.id]);

  // Listen for mood changes to refresh recommendations
  useEffect(() => {
    const handleMoodChange = () => {
      if (profile?.id) {
        setLoading(true);
        fetchRecommendations();
      }
    };
    
    window.addEventListener('viib-mood-changed', handleMoodChange);
    return () => window.removeEventListener('viib-mood-changed', handleMoodChange);
  }, [profile?.id]);

  const fetchUserWatchlist = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('user_title_interactions')
      .select('title_id')
      .eq('user_id', profile.id)
      .in('interaction_type', ['wishlisted', 'completed']);

    if (data) {
      setUserWatchlist(new Set(data.map(d => d.title_id)));
    }
  };

  const fetchRecommendations = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // Call the ViiB recommendation engine (v6)
      console.log('Fetching recommendations for user:', profile.id);
      
      const { data: recData, error: recError } = await supabase.rpc(
        'get_top_recommendations_v6',
        { p_user_id: profile.id, p_limit: 10 }
      );

      console.log('Recommendation RPC response:', { 
        hasData: !!recData, 
        count: recData?.length,
        error: recError,
        firstItem: recData?.[0] // Log first item to see structure
      });

      if (recError) {
        console.error('Recommendation function error:', recError);
        toast.error('Failed to load recommendations');
        setLoading(false);
        return;
      }

      if (!recData || recData.length === 0) {
        console.log('No recommendations returned');
        setRecommendations([]);
        setLoading(false);
        return;
      }

      // Fetch full title details including release dates
      const titleIds = recData.map((rec: any) => rec.title_id).filter(Boolean);
      const { data: titlesData } = await supabase
        .from('titles')
        .select('id, tmdb_id, title_type, release_date, first_air_date, backdrop_path, trailer_url, runtime, overview, title_genres')
        .in('id', titleIds);

      const titlesMap = new Map(titlesData?.map(t => [t.id, t]) || []);

      const enrichedRecs: RecommendedTitle[] = recData
        .map((rec: any) => {
          if (!rec.title_id) return null;

          const titleDetails = titlesMap.get(rec.title_id);

          // Parse genres from title_genres JSON
          const genres = Array.isArray(titleDetails?.title_genres) 
            ? (titleDetails.title_genres as any[]).map((g: any) => g.name || g).filter(Boolean)
            : [];

          // Get release year from release_date or first_air_date
          const releaseYear = titleDetails?.release_date 
            ? new Date(titleDetails.release_date).getFullYear()
            : titleDetails?.first_air_date 
              ? new Date(titleDetails.first_air_date).getFullYear()
              : undefined;

          return {
            id: rec.title_id,
            tmdb_id: titleDetails?.tmdb_id,
            title: rec.title || 'Unknown Title',
            type: titleDetails?.title_type === 'tv' ? 'series' : 'movie',
            year: releaseYear,
            poster_path: rec.poster_path,
            backdrop_path: titleDetails?.backdrop_path,
            trailer_url: titleDetails?.trailer_url,
            runtime: titleDetails?.runtime,
            genres,
            overview: titleDetails?.overview,
            final_score: rec.final_score,
            base_viib_score: rec.emotion_score,
            intent_alignment_score: rec.emotion_score,
            social_priority_score: rec.social_score,
            transformation_score: rec.vibe_boost,
            recommendation_reason: rec.recommendation_reason || '',
          };
        })
        .filter(Boolean) as RecommendedTitle[];

      setRecommendations(enrichedRecs);
    } catch (error) {
      console.error('Error in fetchRecommendations:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (titleId: string) => {
    if (!profile?.id) return;

    // Check if already in watchlist
    if (userWatchlist.has(titleId)) {
      toast.info('Already in your watchlist');
      return;
    }

    const { error } = await supabase.from('user_title_interactions').insert({
      user_id: profile.id,
      title_id: titleId,
      interaction_type: 'wishlisted',
    });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - already exists
        toast.info('Already in your watchlist');
        setUserWatchlist(prev => new Set(prev).add(titleId));
      } else {
        toast.error('Failed to add to watchlist');
      }
    } else {
      toast.success('Added to watchlist');
      setUserWatchlist(prev => new Set(prev).add(titleId));
    }
  };

  const handleMarkAsWatched = (titleId: string, titleName: string) => {
    // Open rating dialog instead of directly marking as watched
    setTitleToRate({ id: titleId, name: titleName });
    setRatingDialogOpen(true);
  };

  const handleRateAndMarkWatched = async (rating: 'love_it' | 'like_it' | 'dislike_it') => {
    if (!titleToRate || !profile?.id) return;

    // Check if already exists
    const { data: existing } = await supabase
      .from('user_title_interactions')
      .select('id')
      .eq('user_id', profile.id)
      .eq('title_id', titleToRate.id)
      .eq('interaction_type', 'completed')
      .maybeSingle();

    if (existing) {
      // Update rating if already marked as watched
      const { error } = await supabase
        .from('user_title_interactions')
        .update({ rating_value: rating })
        .eq('id', existing.id);

      if (error) {
        toast.error('Failed to update rating');
      } else {
        toast.success('Rating updated');
      }
    } else {
      // Delete any existing wishlisted entry first
      await supabase
        .from('user_title_interactions')
        .delete()
        .eq('user_id', profile.id)
        .eq('title_id', titleToRate.id)
        .eq('interaction_type', 'wishlisted');

      // Insert new completed entry with rating
      const { error } = await supabase.from('user_title_interactions').insert({
        user_id: profile.id,
        title_id: titleToRate.id,
        interaction_type: 'completed',
        rating_value: rating,
      });

      if (error) {
        toast.error('Failed to mark as watched');
      } else {
        const ratingLabel = rating === 'love_it' ? 'Loved it!' : rating === 'like_it' ? 'Liked it!' : 'Noted';
        toast.success(`Marked as watched - ${ratingLabel}`);
        setRecommendations((prev) => prev.filter((t) => t.id !== titleToRate.id));
        setUserWatchlist(prev => new Set(prev).add(titleToRate.id));
      }
    }

    setTitleToRate(null);
  };

  const handleDismissTitle = (titleId: string, titleName: string) => {
    setTitleToDismiss({ id: titleId, name: titleName });
    setDismissDialogOpen(true);
  };

  const handleNotMyTaste = async () => {
    if (!titleToDismiss || !profile?.id) return;

    // Record as disliked interaction
    const { error } = await supabase.from('user_title_interactions').insert({
      user_id: profile.id,
      title_id: titleToDismiss.id,
      interaction_type: 'disliked',
      rating_value: 'dislike_it',
    });

    if (error) {
      // If duplicate, just remove from UI
      if (error.code === '23505') {
        toast.success('Got it! We\'ll adjust your recommendations');
        setRecommendations((prev) => prev.filter((t) => t.id !== titleToDismiss.id));
      } else {
        console.error('Error recording preference:', error);
        toast.error('Failed to record preference');
      }
    } else {
      toast.success('Got it! We\'ll adjust your recommendations');
      setRecommendations((prev) => prev.filter((t) => t.id !== titleToDismiss.id));
    }
    setTitleToDismiss(null);
  };

  const handleSeenItFromDismiss = () => {
    if (!titleToDismiss) return;
    // Open rating dialog
    setTitleToRate({ id: titleToDismiss.id, name: titleToDismiss.name });
    setRatingDialogOpen(true);
    setTitleToDismiss(null);
  };

  const handleKeepIt = () => {
    // Just close the dialog, don't remove from recommendations
    setTitleToDismiss(null);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
          Your Recommendations
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Personalized picks based on your mood, taste, and social signals.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-2">No recommendations yet</p>
          <p className="text-sm text-muted-foreground/70">
            Complete your mood calibration and add streaming platforms to get personalized recommendations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {recommendations.map((title) => (
            <TitleCard
              key={title.id}
              title={{
                id: title.id,
                external_id: title.id,
                title: title.title,
                type: title.type,
                year: title.year,
                poster_path: title.poster_path,
                trailer_url: title.trailer_url,
                runtime_minutes: title.runtime,
                genres: title.genres,
              }}
              viibScore={title.final_score != null ? Math.round(title.final_score * 100) : undefined}
              isInWatchlist={userWatchlist.has(title.id)}
              onClick={() => {
                setSelectedTitle(title);
                setDetailsModalOpen(true);
              }}
              actions={{
                onWatchlist: () => handleAddToWatchlist(title.id),
                onWatched: () => handleMarkAsWatched(title.id, title.title),
                onPass: () => handleDismissTitle(title.id, title.title),
              }}
            />
          ))}
        </div>
      )}

      <TitleDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        title={selectedTitle ? {
          id: selectedTitle.id,
          tmdb_id: selectedTitle.tmdb_id,
          external_id: selectedTitle.id,
          title: selectedTitle.title,
          type: selectedTitle.type,
          year: selectedTitle.year,
          poster_path: selectedTitle.poster_path,
          backdrop_path: selectedTitle.backdrop_path,
          trailer_url: selectedTitle.trailer_url,
          runtime_minutes: selectedTitle.runtime,
          genres: selectedTitle.genres,
          overview: selectedTitle.overview,
        } : null}
        isInWatchlist={selectedTitle ? userWatchlist.has(selectedTitle.id) : false}
        onAddToWatchlist={(titleId) => handleAddToWatchlist(titleId)}
        onMarkAsWatched={(titleId, titleName) => {
          setDetailsModalOpen(false);
          handleMarkAsWatched(titleId, titleName);
        }}
      />

      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        titleName={titleToRate?.name || ''}
        onRate={handleRateAndMarkWatched}
      />

      <DismissTitleDialog
        open={dismissDialogOpen}
        onOpenChange={setDismissDialogOpen}
        titleName={titleToDismiss?.name || ''}
        onNotMyTaste={handleNotMyTaste}
        onSeenIt={handleSeenItFromDismiss}
        onKeepIt={handleKeepIt}
      />
    </div>
  );
};

export default Home;
