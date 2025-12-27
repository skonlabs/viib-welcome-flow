import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type RatingValue = 'love_it' | 'like_it' | 'dislike_it';

interface TitleForAction {
  id?: string;
  title_id?: string;
  title: string;
  tmdb_id?: number;
}

export function useTitleActions(onSuccess?: () => void) {
  const { profile } = useAuth();
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [titleToRate, setTitleToRate] = useState<TitleForAction | null>(null);

  const getTitleIdFromTmdb = async (tmdbId: number | string): Promise<string | null> => {
    const { data: existingTitle } = await supabase
      .from('titles')
      .select('id')
      .eq('tmdb_id', typeof tmdbId === 'string' ? parseInt(tmdbId) : tmdbId)
      .maybeSingle();
    
    return existingTitle?.id || null;
  };

  const addToWatchlist = async (titleId: string, seasonNumber?: number) => {
    if (!profile) {
      toast.error("Please sign in to add to watchlist");
      return false;
    }

    try {
      // Check if already in watchlist
      let existingQuery = supabase
        .from('user_title_interactions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('title_id', titleId)
        .eq('interaction_type', 'wishlisted');

      if (seasonNumber) {
        existingQuery = existingQuery.eq('season_number', seasonNumber);
      } else {
        existingQuery = existingQuery.is('season_number', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        toast.info("Already in your watchlist");
        return false;
      }

      const { error } = await supabase
        .from('user_title_interactions')
        .insert({
          user_id: profile.id,
          title_id: titleId,
          interaction_type: 'wishlisted',
          season_number: seasonNumber || null
        });

      if (error) throw error;
      toast.success(seasonNumber ? `Season ${seasonNumber} added to watchlist!` : "Added to watchlist!");
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
      toast.error("Failed to add to watchlist");
      return false;
    }
  };

  const addToWatchlistByTmdb = async (tmdbId: number | string, seasonNumber?: number) => {
    const titleId = await getTitleIdFromTmdb(tmdbId);
    if (!titleId) {
      toast.error("This title is not yet in our catalog");
      return false;
    }
    return addToWatchlist(titleId, seasonNumber);
  };

  const openRatingDialog = (title: TitleForAction) => {
    setTitleToRate(title);
    setRatingDialogOpen(true);
  };

  const handleRating = async (rating: RatingValue) => {
    if (!profile || !titleToRate) return;

    const titleId = titleToRate.title_id || titleToRate.id;
    if (!titleId) {
      toast.error("Invalid title");
      return;
    }

    try {
      // Check if there's an existing wishlisted entry to update
      const { data: existingWishlisted } = await supabase
        .from('user_title_interactions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('title_id', titleId)
        .eq('interaction_type', 'wishlisted')
        .maybeSingle();

      // Check if there's an existing completed entry
      const { data: existingCompleted } = await supabase
        .from('user_title_interactions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('title_id', titleId)
        .eq('interaction_type', 'completed')
        .maybeSingle();

      if (existingCompleted) {
        // Update existing completed entry with new rating
        await supabase
          .from('user_title_interactions')
          .update({ rating_value: rating })
          .eq('id', existingCompleted.id);
      } else if (existingWishlisted) {
        // Move from wishlisted to completed with rating
        await supabase
          .from('user_title_interactions')
          .update({ 
            interaction_type: 'completed',
            rating_value: rating
          })
          .eq('id', existingWishlisted.id);
      } else {
        // Create new completed entry
        await supabase
          .from('user_title_interactions')
          .insert({
            user_id: profile.id,
            title_id: titleId,
            interaction_type: 'completed',
            rating_value: rating
          });
      }

      toast.success(`Marked as "${rating.replace('_', ' ')}"!`);
      setRatingDialogOpen(false);
      setTitleToRate(null);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to rate:', error);
      toast.error("Failed to save rating");
    }
  };

  const handleRatingByTmdb = async (tmdbId: number | string, titleName: string) => {
    const titleId = await getTitleIdFromTmdb(tmdbId);
    if (!titleId) {
      toast.error("This title is not yet in our catalog");
      return;
    }
    openRatingDialog({ id: titleId, title: titleName });
  };

  return {
    addToWatchlist,
    addToWatchlistByTmdb,
    openRatingDialog,
    handleRating,
    handleRatingByTmdb,
    ratingDialogOpen,
    setRatingDialogOpen,
    titleToRate,
  };
}
