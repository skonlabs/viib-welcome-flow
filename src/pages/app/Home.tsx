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

  const fetchRecommendations = async () => {
    try {
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) {
        setLoading(false);
        return;
      }

      // Call the recommendation function
      const { data: recData, error: recError } = await supabase.rpc(
        'get_top_recommendations_with_intent',
        { p_user_id: userId, p_limit: 20 }
      );

      if (recError) {
        console.error('Error fetching recommendations:', recError);
        toast.error('Failed to load recommendations');
        setLoading(false);
        return;
      }

      if (!recData || recData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch title details for recommended titles
      const titleIds = recData.map((r: any) => r.title_id);
      const { data: titles, error: titlesError } = await supabase
        .from('titles')
        .select(`
          id,
          name,
          title_type,
          release_date,
          first_air_date,
          poster_path,
          trailer_url,
          runtime
        `)
        .in('id', titleIds);

      if (titlesError) {
        console.error('Error fetching title details:', titlesError);
        setLoading(false);
        return;
      }

      // Fetch genres for titles
      const { data: titleGenres } = await supabase
        .from('title_genres')
        .select('title_id, genres(genre_name)')
        .in('title_id', titleIds);

      // Map genres by title_id
      const genresMap: Record<string, string[]> = {};
      titleGenres?.forEach((tg: any) => {
        if (!genresMap[tg.title_id]) genresMap[tg.title_id] = [];
        if (tg.genres?.genre_name) genresMap[tg.title_id].push(tg.genres.genre_name);
      });

      // Combine recommendation scores with title details
      const enrichedRecs: RecommendedTitle[] = recData
        .map((rec: any) => {
          const title = titles?.find((t) => t.id === rec.title_id);
          if (!title) return null;

          const releaseYear = title.release_date 
            ? new Date(title.release_date).getFullYear()
            : title.first_air_date 
              ? new Date(title.first_air_date).getFullYear()
              : undefined;

          return {
            id: title.id,
            title: title.name || 'Unknown Title',
            type: title.title_type === 'tv' ? 'series' : 'movie',
            year: releaseYear,
            poster_path: title.poster_path,
            trailer_url: title.trailer_url,
            runtime: title.runtime,
            genres: genresMap[title.id] || [],
            final_score: rec.final_score,
            base_viib_score: rec.base_viib_score,
            intent_alignment_score: rec.intent_alignment_score,
            social_priority_score: rec.social_priority_score,
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
