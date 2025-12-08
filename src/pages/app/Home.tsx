import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TitleCard } from '@/components/TitleCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface RecommendedTitle {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  poster_path?: string | null;
  trailer_url?: string | null;
  runtime?: number | null;
  genres: string[];
  final_score: number;
  base_viib_score: number;
  intent_alignment_score: number;
  social_priority_score: number;
}

const Home = () => {
  const [recommendations, setRecommendations] = useState<RecommendedTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchSimpleRecommendations = async (userId: string) => {
    // Fallback: simple query based on user's streaming services and language preferences
    // Get user's streaming services
    const { data: userSubs } = await supabase
      .from('user_streaming_subscriptions')
      .select('streaming_service_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Get user's language preferences
    const { data: userLangs } = await supabase
      .from('user_language_preferences')
      .select('language_code')
      .eq('user_id', userId);

    // Get titles user hasn't interacted with
    const { data: interactedTitles } = await supabase
      .from('user_title_interactions')
      .select('title_id')
      .eq('user_id', userId)
      .in('interaction_type', ['completed', 'disliked']);

    const excludeIds = interactedTitles?.map(t => t.title_id) || [];
    const langCodes = userLangs?.map(l => l.language_code) || ['en'];
    const serviceIds = userSubs?.map(s => s.streaming_service_id) || [];

    // Build query for titles
    let query = supabase
      .from('titles')
      .select(`
        id,
        name,
        title_type,
        release_date,
        first_air_date,
        poster_path,
        trailer_url,
        runtime,
        popularity,
        vote_average
      `)
      .in('original_language', langCodes)
      .gte('vote_average', 6)
      .order('popularity', { ascending: false })
      .limit(20);

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data: titles, error } = await query;

    if (error || !titles || titles.length === 0) {
      return [];
    }

    // If user has streaming subs, filter to available titles
    let filteredTitles = titles;
    if (serviceIds.length > 0) {
      const { data: availableTitles } = await supabase
        .from('title_streaming_availability')
        .select('title_id')
        .in('title_id', titles.map(t => t.id))
        .in('streaming_service_id', serviceIds);

      const availableIds = new Set(availableTitles?.map(t => t.title_id) || []);
      filteredTitles = titles.filter(t => availableIds.has(t.id));
    }

    // Take top 10
    filteredTitles = filteredTitles.slice(0, 10);

    // Fetch genres
    const { data: titleGenres } = await supabase
      .from('title_genres')
      .select('title_id, genres(genre_name)')
      .in('title_id', filteredTitles.map(t => t.id));

    const genresMap: Record<string, string[]> = {};
    titleGenres?.forEach((tg: any) => {
      if (!genresMap[tg.title_id]) genresMap[tg.title_id] = [];
      if (tg.genres?.genre_name) genresMap[tg.title_id].push(tg.genres.genre_name);
    });

    return filteredTitles.map(title => {
      const releaseYear = title.release_date 
        ? new Date(title.release_date).getFullYear()
        : title.first_air_date 
          ? new Date(title.first_air_date).getFullYear()
          : undefined;

      return {
        id: title.id,
        title: title.name || 'Unknown Title',
        type: (title.title_type === 'tv' ? 'series' : 'movie') as 'movie' | 'series',
        year: releaseYear,
        poster_path: title.poster_path,
        trailer_url: title.trailer_url,
        runtime: title.runtime,
        genres: genresMap[title.id] || [],
        final_score: (title.vote_average || 7) / 10,
        base_viib_score: 0.7,
        intent_alignment_score: 0.7,
        social_priority_score: 0,
      };
    });
  };

  const fetchRecommendations = async () => {
    try {
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) {
        setLoading(false);
        return;
      }

      // Use simple recommendations directly (the RPC function has a SQL bug)
      // TODO: Re-enable RPC once viib_score_components is fixed (rating_label -> rating_value)
      const fallbackRecs = await fetchSimpleRecommendations(userId);
      
      if (fallbackRecs.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }
      
      setRecommendations(fallbackRecs);
      setLoading(false);
      return;
    } catch (error) {
      console.error('Error in fetchRecommendations:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (titleId: string) => {
    const userId = localStorage.getItem('viib_user_id');
    if (!userId) return;

    const { error } = await supabase.from('user_title_interactions').insert({
      user_id: userId,
      title_id: titleId,
      interaction_type: 'wishlisted',
    });

    if (error) {
      toast.error('Failed to add to watchlist');
    } else {
      toast.success('Added to watchlist');
    }
  };

  const handleMarkAsWatched = async (titleId: string) => {
    const userId = localStorage.getItem('viib_user_id');
    if (!userId) return;

    const { error } = await supabase.from('user_title_interactions').insert({
      user_id: userId,
      title_id: titleId,
      interaction_type: 'completed',
    });

    if (error) {
      toast.error('Failed to mark as watched');
    } else {
      toast.success('Marked as watched');
      setRecommendations((prev) => prev.filter((t) => t.id !== titleId));
    }
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
              viibScore={title.final_score * 100}
              actions={{
                onWatchlist: () => handleAddToWatchlist(title.id),
                onWatched: () => handleMarkAsWatched(title.id),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
