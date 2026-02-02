import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Explainability {
  summary?: Array<{ label: string; value: string; reason: string }>;
  reasons?: string[];
  scores?: Record<string, number>;
  reason_count?: number;
  raw_reasons?: Record<string, unknown>;
}

export interface RecommendedTitle {
  id: string;
  tmdb_id?: number;
  title: string;
  type: "movie" | "series";
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
  explainability?: Explainability;
  normalized_components?: Record<string, number>;
}

interface UseRecommendationsResult {
  recommendations: RecommendedTitle[];
  loading: boolean;
  userWatchlist: Set<string>;
  refreshRecommendations: () => Promise<void>;
  addToWatchlist: (titleId: string) => Promise<void>;
  markAsWatched: (titleId: string, rating: 'love_it' | 'like_it' | 'dislike_it') => Promise<boolean>;
  dismissTitle: (titleId: string) => Promise<boolean>;
  removeFromRecommendations: (titleId: string) => void;
}

export function useRecommendations(userId: string | undefined): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<RecommendedTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userWatchlist, setUserWatchlist] = useState<Set<string>>(new Set());

  const fetchUserWatchlist = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("user_title_interactions")
      .select("title_id")
      .eq("user_id", userId)
      .in("interaction_type", ["wishlisted", "completed"]);

    if (data) {
      setUserWatchlist(new Set(data.map((d) => d.title_id)));
    }
  }, [userId]);

  const fetchRecommendations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: recData, error: recError } = await supabase.rpc("get_top_recommendations_v13", {
        p_user_id: userId,
        p_limit: 10,
      });

      if (recError) {
        toast.error("Failed to load recommendations");
        setLoading(false);
        return;
      }

      if (!recData || recData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch full title details including release dates
      const titleIds = recData.map((rec: any) => rec.title_id).filter(Boolean);
      const { data: titlesData } = await supabase
        .from("titles")
        .select(
          `id, tmdb_id, name, poster_path, title_type, release_date, first_air_date, backdrop_path, trailer_url, runtime, overview, title_genres(genre:genres(name))`,
        )
        .in("id", titleIds);

      const titlesMap = new Map(titlesData?.map((t) => [t.id, t]) || []);

      const enrichedRecs: RecommendedTitle[] = recData
        .map((rec: any) => {
          if (!rec.title_id) return null;

          const titleDetails = titlesMap.get(rec.title_id);

          // Parse genres via relationship
          const genres = Array.isArray((titleDetails as any)?.title_genres)
            ? ((titleDetails as any).title_genres as any[]).map((tg: any) => tg?.genre?.name).filter(Boolean)
            : [];

          // Get release year
          const releaseYear = titleDetails?.release_date
            ? new Date(titleDetails.release_date).getFullYear()
            : titleDetails?.first_air_date
              ? new Date(titleDetails.first_air_date).getFullYear()
              : undefined;

          // Convert final_score (0-1) to percentage
          const matchPercent =
            rec.final_score != null
              ? Math.round(rec.final_score * 100)
              : rec.pick_prob_est != null
                ? Math.round(rec.pick_prob_est * 100)
                : 0;

          return {
            id: rec.title_id,
            tmdb_id: titleDetails?.tmdb_id,
            title: rec.title_name || titleDetails?.name || "Unknown Title",
            type: (rec.title_type || titleDetails?.title_type) === "tv" ? "series" : "movie",
            year: releaseYear,
            poster_path: rec.poster_path || titleDetails?.poster_path,
            backdrop_path: titleDetails?.backdrop_path,
            trailer_url: titleDetails?.trailer_url,
            runtime: titleDetails?.runtime,
            genres,
            overview: titleDetails?.overview,
            final_score: matchPercent,
            base_viib_score: rec.emotion_score || 0,
            intent_alignment_score: rec.intent_score || 0,
            social_priority_score: rec.social_score || 0,
            transformation_score: 0,
            recommendation_reason: "",
            explainability: {
              reasons: Array.isArray(rec.reasons) ? rec.reasons.filter(Boolean) : [],
              scores: {
                emotion: rec.emotion_score,
                intent: rec.intent_score,
                taste: rec.taste_score,
                social: rec.social_score,
                quality: rec.quality_score,
                novelty: rec.novelty_score,
                context: rec.context_score,
              },
            },
            normalized_components: {
              emotion: rec.emotion_score,
              intent: rec.intent_score,
              taste: rec.taste_score,
              social: rec.social_score,
              quality: rec.quality_score,
            },
          };
        })
        .filter(Boolean) as RecommendedTitle[];

      setRecommendations(enrichedRecs);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addToWatchlist = useCallback(async (titleId: string) => {
    if (!userId) return;

    if (userWatchlist.has(titleId)) {
      toast.info("Already in your watchlist");
      return;
    }

    const { error } = await supabase.from("user_title_interactions").insert({
      user_id: userId,
      title_id: titleId,
      interaction_type: "wishlisted",
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("Already in your watchlist");
        setUserWatchlist((prev) => new Set(prev).add(titleId));
      } else {
        toast.error("Failed to add to watchlist");
      }
    } else {
      toast.success("Added to watchlist");
      setUserWatchlist((prev) => new Set(prev).add(titleId));
    }
  }, [userId, userWatchlist]);

  const markAsWatched = useCallback(async (titleId: string, rating: 'love_it' | 'like_it' | 'dislike_it'): Promise<boolean> => {
    if (!userId) return false;

    // Check if already exists
    const { data: existing } = await supabase
      .from("user_title_interactions")
      .select("id")
      .eq("user_id", userId)
      .eq("title_id", titleId)
      .eq("interaction_type", "completed")
      .maybeSingle();

    if (existing) {
      // Update rating if already marked as watched
      const { error } = await supabase
        .from("user_title_interactions")
        .update({ rating_value: rating })
        .eq("id", existing.id);

      if (error) {
        toast.error("Failed to update rating");
        return false;
      } else {
        toast.success("Rating updated");
        return true;
      }
    } else {
      // Delete any existing wishlisted entry first
      await supabase
        .from("user_title_interactions")
        .delete()
        .eq("user_id", userId)
        .eq("title_id", titleId)
        .eq("interaction_type", "wishlisted");

      // Insert new completed entry with rating
      const { error } = await supabase.from("user_title_interactions").insert({
        user_id: userId,
        title_id: titleId,
        interaction_type: "completed",
        rating_value: rating,
      });

      if (error) {
        toast.error("Failed to mark as watched");
        return false;
      } else {
        const ratingLabel = rating === "love_it" ? "Loved it!" : rating === "like_it" ? "Liked it!" : "Noted";
        toast.success(`Marked as watched - ${ratingLabel}`);
        setUserWatchlist((prev) => new Set(prev).add(titleId));
        return true;
      }
    }
  }, [userId]);

  const dismissTitle = useCallback(async (titleId: string): Promise<boolean> => {
    if (!userId) return false;

    const { error } = await supabase.from("user_title_interactions").insert({
      user_id: userId,
      title_id: titleId,
      interaction_type: "disliked",
      rating_value: "dislike_it",
    });

    if (error) {
      if (error.code === "23505") {
        toast.success("Got it! We'll adjust your recommendations");
        return true;
      } else {
        toast.error("Failed to record preference");
        return false;
      }
    } else {
      toast.success("Got it! We'll adjust your recommendations");
      return true;
    }
  }, [userId]);

  const removeFromRecommendations = useCallback((titleId: string) => {
    setRecommendations((prev) => prev.filter((t) => t.id !== titleId));
  }, []);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchRecommendations();
      fetchUserWatchlist();
    } else {
      setLoading(false);
    }
  }, [userId, fetchRecommendations, fetchUserWatchlist]);

  // Listen for mood changes
  useEffect(() => {
    const handleMoodChange = () => {
      if (userId) {
        setLoading(true);
        fetchRecommendations();
      }
    };

    window.addEventListener("viib-mood-changed", handleMoodChange);
    return () => window.removeEventListener("viib-mood-changed", handleMoodChange);
  }, [userId, fetchRecommendations]);

  return {
    recommendations,
    loading,
    userWatchlist,
    refreshRecommendations: fetchRecommendations,
    addToWatchlist,
    markAsWatched,
    dismissTitle,
    removeFromRecommendations,
  };
}
