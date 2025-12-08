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

  const fetchSmartRecommendations = async (userId: string) => {
    // Enhanced fallback: uses intent data, user preferences, and social signals
    
    // Parallel fetch user preferences and data
    const [
      { data: userSubs },
      { data: userLangs },
      { data: interactedTitles },
      { data: userEmotionState },
      { data: socialRecs },
      { data: friendInteractions }
    ] = await Promise.all([
      supabase
        .from('user_streaming_subscriptions')
        .select('streaming_service_id')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('user_language_preferences')
        .select('language_code')
        .eq('user_id', userId),
      supabase
        .from('user_title_interactions')
        .select('title_id')
        .eq('user_id', userId)
        .in('interaction_type', ['completed', 'disliked']),
      supabase
        .from('user_emotion_states')
        .select('emotion_id, intensity')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('user_social_recommendations')
        .select('title_id')
        .eq('receiver_user_id', userId),
      supabase
        .from('friend_connections')
        .select('friend_user_id')
        .eq('user_id', userId)
        .eq('is_blocked', false)
    ]);

    const excludeIds = interactedTitles?.map(t => t.title_id) || [];
    const langCodes = userLangs?.map(l => l.language_code) || ['en'];
    const serviceIds = userSubs?.map(s => s.streaming_service_id) || [];
    const socialRecIds = new Set(socialRecs?.map(r => r.title_id) || []);
    const friendIds = friendInteractions?.map(f => f.friend_user_id) || [];
    const currentEmotionId = userEmotionState?.[0]?.emotion_id;

    // Fetch intent-classified titles matching user's emotional state
    let intentTitles: string[] = [];
    if (currentEmotionId) {
      // Get emotion-to-intent mapping
      const { data: intentMap } = await supabase
        .from('emotion_to_intent_map')
        .select('intent_type, weight')
        .eq('emotion_id', currentEmotionId)
        .order('weight', { ascending: false })
        .limit(3);

      if (intentMap && intentMap.length > 0) {
        const intentTypes = intentMap.map(i => i.intent_type);
        const { data: matchedTitles } = await supabase
          .from('viib_intent_classified_titles')
          .select('title_id')
          .in('intent_type', intentTypes)
          .gte('confidence_score', 0.6)
          .limit(50);
        intentTitles = matchedTitles?.map(t => t.title_id) || [];
      }
    }

    // Get friend-liked titles
    let friendLikedTitles: string[] = [];
    if (friendIds.length > 0) {
      const { data: friendLikes } = await supabase
        .from('user_title_interactions')
        .select('title_id')
        .in('user_id', friendIds)
        .in('interaction_type', ['completed', 'liked'])
        .limit(30);
      friendLikedTitles = friendLikes?.map(t => t.title_id) || [];
    }

    // Combine title sources with priority
    const priorityTitles = new Set([
      ...socialRecIds, // Highest priority: direct recommendations
      ...intentTitles.slice(0, 20), // Intent-matched titles
      ...friendLikedTitles.slice(0, 15), // Friend-liked titles
    ]);

    // Build query for titles
    const { data: allTitles, error } = await supabase
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
      .limit(100);

    if (error || !allTitles || allTitles.length === 0) {
      return [];
    }

    // Filter out already interacted
    let candidateTitles = allTitles.filter(t => !excludeIds.includes(t.id));

    // Score and rank titles
    const scoredTitles = candidateTitles.map(title => {
      let score = 0;
      
      // Base score from TMDB rating
      score += ((title.vote_average || 6) / 10) * 0.3;
      
      // Popularity bonus
      score += Math.min((title.popularity || 0) / 1000, 0.2);
      
      // Social recommendation bonus (highest weight)
      if (socialRecIds.has(title.id)) score += 0.35;
      
      // Intent match bonus
      if (intentTitles.includes(title.id)) score += 0.25;
      
      // Friend-liked bonus
      if (friendLikedTitles.includes(title.id)) score += 0.15;
      
      return { ...title, calculatedScore: Math.min(score, 1) };
    });

    // Sort by score descending
    scoredTitles.sort((a, b) => b.calculatedScore - a.calculatedScore);

    // If user has streaming subs, prioritize available titles
    let filteredTitles = scoredTitles;
    if (serviceIds.length > 0) {
      const { data: availableTitles } = await supabase
        .from('title_streaming_availability')
        .select('title_id')
        .in('title_id', scoredTitles.slice(0, 50).map(t => t.id))
        .in('streaming_service_id', serviceIds);

      const availableIds = new Set(availableTitles?.map(t => t.title_id) || []);
      const available = scoredTitles.filter(t => availableIds.has(t.id));
      const notAvailable = scoredTitles.filter(t => !availableIds.has(t.id));
      
      // Prefer available but include some non-available if needed
      filteredTitles = [...available.slice(0, 10), ...notAvailable.slice(0, 5)].slice(0, 10);
    } else {
      filteredTitles = scoredTitles.slice(0, 10);
    }

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
        final_score: title.calculatedScore,
        base_viib_score: ((title.vote_average || 6) / 10),
        intent_alignment_score: intentTitles.includes(title.id) ? 0.8 : 0.5,
        social_priority_score: socialRecIds.has(title.id) ? 1 : friendLikedTitles.includes(title.id) ? 0.5 : 0,
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

      // Call the ViiB recommendation engine
      const { data: recData, error: recError } = await supabase.rpc(
        'get_top_recommendations_with_intent',
        { p_user_id: userId, p_limit: 10 }
      );

      // If error or timeout, use smart fallback
      if (recError) {
        console.error('Recommendation function error, using smart fallback:', recError);
        const fallbackRecs = await fetchSmartRecommendations(userId);
        setRecommendations(fallbackRecs);
        return;
      }

      if (!recData || recData.length === 0) {
        // Try fallback if no results
        const fallbackRecs = await fetchSmartRecommendations(userId);
        setRecommendations(fallbackRecs);
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
