import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, Heart, Clock, Star } from "@/icons";

interface WatchlistStatsProps {
  totalTitles: number;
  watchedCount: number;
  totalWatchTime: number;
  avgRating: number;
}

export const WatchlistStats = ({
  totalTitles,
  watchedCount,
  totalWatchTime,
  avgRating,
}: WatchlistStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalTitles}</p>
              <p className="text-sm text-muted-foreground">Total Titles</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{watchedCount}</p>
              <p className="text-sm text-muted-foreground">Watched</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalWatchTime}h</p>
              <p className="text-sm text-muted-foreground">Watch Time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
