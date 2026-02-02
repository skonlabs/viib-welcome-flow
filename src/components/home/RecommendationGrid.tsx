import { TitleCard } from "@/components/TitleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { RecommendedTitle } from "@/hooks/useRecommendations";

interface RecommendationGridProps {
  recommendations: RecommendedTitle[];
  loading: boolean;
  userWatchlist: Set<string>;
  onTitleClick: (title: RecommendedTitle) => void;
  onAddToWatchlist: (titleId: string) => void;
  onMarkAsWatched: (titleId: string, titleName: string) => void;
  onDismiss: (titleId: string, titleName: string) => void;
}

export function RecommendationGrid({
  recommendations,
  loading,
  userWatchlist,
  onTitleClick,
  onAddToWatchlist,
  onMarkAsWatched,
  onDismiss,
}: RecommendationGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg mb-2">No recommendations yet</p>
        <p className="text-sm text-muted-foreground/70">
          Complete your mood calibration and add streaming platforms to get personalized recommendations.
        </p>
      </div>
    );
  }

  return (
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
          explainability={{
            reasons: title.explainability?.reasons || [],
            scores: title.normalized_components || {},
          }}
          viibScore={title.final_score != null ? Math.round(title.final_score) : undefined}
          isInWatchlist={userWatchlist.has(title.id)}
          onClick={() => onTitleClick(title)}
          actions={{
            onWatchlist: () => onAddToWatchlist(title.id),
            onWatched: () => onMarkAsWatched(title.id, title.title),
            onPass: () => onDismiss(title.id, title.title),
          }}
        />
      ))}
    </div>
  );
}
