import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { TitleDetailsModal } from "@/components/TitleDetailsModal";
import { RatingDialog } from "@/components/RatingDialog";
import { DismissTitleDialog } from "@/components/DismissTitleDialog";
import { RecommendationGrid } from "@/components/home/RecommendationGrid";
import { useRecommendations, RecommendedTitle } from "@/hooks/useRecommendations";

const Home = () => {
  const { profile, loading: authLoading } = useAuthContext();
  const {
    recommendations,
    loading,
    userWatchlist,
    addToWatchlist,
    markAsWatched,
    dismissTitle,
    removeFromRecommendations,
  } = useRecommendations(authLoading ? undefined : profile?.id);

  // Dialog states
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [titleToRate, setTitleToRate] = useState<{ id: string; name: string } | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<RecommendedTitle | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [titleToDismiss, setTitleToDismiss] = useState<{ id: string; name: string } | null>(null);

  const handleTitleClick = (title: RecommendedTitle) => {
    setSelectedTitle(title);
    setDetailsModalOpen(true);
  };

  const handleMarkAsWatched = (titleId: string, titleName: string) => {
    setTitleToRate({ id: titleId, name: titleName });
    setRatingDialogOpen(true);
  };

  const handleRateAndMarkWatched = async (rating: "love_it" | "like_it" | "dislike_it") => {
    if (!titleToRate) return;

    const success = await markAsWatched(titleToRate.id, rating);
    if (success) {
      removeFromRecommendations(titleToRate.id);
    }
    setTitleToRate(null);
  };

  const handleDismissTitle = (titleId: string, titleName: string) => {
    setTitleToDismiss({ id: titleId, name: titleName });
    setDismissDialogOpen(true);
  };

  const handleNotMyTaste = async () => {
    if (!titleToDismiss) return;

    const success = await dismissTitle(titleToDismiss.id);
    if (success) {
      removeFromRecommendations(titleToDismiss.id);
    }
    setTitleToDismiss(null);
  };

  const handleSeenItFromDismiss = () => {
    if (!titleToDismiss) return;
    setTitleToRate({ id: titleToDismiss.id, name: titleToDismiss.name });
    setRatingDialogOpen(true);
    setTitleToDismiss(null);
  };

  const handleKeepIt = () => {
    setTitleToDismiss(null);
  };

  const isLoading = authLoading || loading;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">Your Recommendations</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Personalized picks based on your mood, taste, and social signals.
        </p>
      </div>

      <RecommendationGrid
        recommendations={recommendations}
        loading={isLoading}
        userWatchlist={userWatchlist}
        onTitleClick={handleTitleClick}
        onAddToWatchlist={addToWatchlist}
        onMarkAsWatched={handleMarkAsWatched}
        onDismiss={handleDismissTitle}
      />

      <TitleDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        title={
          selectedTitle
            ? {
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
              }
            : null
        }
        isInWatchlist={selectedTitle ? userWatchlist.has(selectedTitle.id) : false}
        onAddToWatchlist={(titleId) => addToWatchlist(titleId)}
        onMarkAsWatched={(titleId, titleName) => {
          setDetailsModalOpen(false);
          handleMarkAsWatched(titleId, titleName);
        }}
      />

      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        titleName={titleToRate?.name || ""}
        onRate={handleRateAndMarkWatched}
      />

      <DismissTitleDialog
        open={dismissDialogOpen}
        onOpenChange={setDismissDialogOpen}
        titleName={titleToDismiss?.name || ""}
        onNotMyTaste={handleNotMyTaste}
        onSeenIt={handleSeenItFromDismiss}
        onKeepIt={handleKeepIt}
      />
    </div>
  );
};

export default Home;
