import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { useState } from "react";
import { TrailerDialog } from "./TrailerDialog";

interface TitleDetailsModalProps {
  title: {
    external_id?: string;
    title: string;
    type: 'movie' | 'series';
    year?: number | null;
    poster_url?: string | null;
    backdrop_url?: string | null;
    trailer_url?: string | null;
    runtime_minutes?: number | null;
    avg_episode_minutes?: number | null;
    genres?: string[];
    mood_tags?: string[];
    cast?: string[];
    description?: string | null;
    overview?: string | null;
    streaming_services?: Array<{
      service_code: string;
      service_name: string;
      logo_url?: string | null;
    }>;
    availability?: Array<{
      service_name: string;
      service_code: string;
      watch_url: string;
      logo_url?: string | null;
    }>;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TitleDetailsModal({ title, open, onOpenChange }: TitleDetailsModalProps) {
  const [trailerOpen, setTrailerOpen] = useState(false);

  if (!title) return null;

  const displayPoster = title.poster_url;
  const displayBackdrop = title.backdrop_url;
  const displayTrailer = title.trailer_url;
  const displayGenres = title.genres || [];
  const displayRuntime = title.runtime_minutes;
  const displayEpisodeLength = title.avg_episode_minutes;
  const displayAvailability = title.availability || title.streaming_services || [];
  const displayDescription = title.description || title.overview;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">{title.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Details for {title.title} ({title.year})
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            {/* Poster */}
            <div className="relative">
              <img
                src={displayPoster || 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600'}
                alt={title.title}
                className="w-full rounded-lg shadow-lg"
              />
              {displayTrailer && (
                <Button
                  size="lg"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 gap-2"
                  onClick={() => setTrailerOpen(true)}
                >
                  <Play className="w-5 h-5" />
                  Watch Trailer
                </Button>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h2 className="text-3xl font-bold">{title.title}</h2>
                <p className="text-muted-foreground">
                  {title.year} • {title.type === 'movie' ? 'Movie' : 'Series'} •
                  {title.type === 'movie' ? ` ${displayRuntime || '120'}min` : ` ${displayEpisodeLength || '45'}min/ep`}
                </p>
              </div>

              {/* Genres & Moods */}
              <div className="flex flex-wrap gap-2">
                {displayGenres.slice(0, 3).map(genre => (
                  <Badge key={genre} variant="secondary">{genre}</Badge>
                ))}
                {title.mood_tags?.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>

              {/* Description */}
              {displayDescription && (
                <p className="text-sm leading-relaxed">{displayDescription}</p>
              )}

              {/* Cast */}
              {title.cast && title.cast.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Cast:</p>
                  <p className="text-sm text-muted-foreground">
                    {title.cast.slice(0, 5).join(', ')}
                  </p>
                </div>
              )}

              {/* Streaming Services */}
              {displayAvailability.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Available on:</p>
                  <div className="flex flex-wrap gap-2">
                    {displayAvailability.map((service, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-muted/50"
                      >
                        {service.logo_url && (
                          <img src={service.logo_url} alt={service.service_name} className="w-5 h-5 object-contain" />
                        )}
                        <span className="text-sm">{service.service_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TrailerDialog
        open={trailerOpen}
        onOpenChange={setTrailerOpen}
        trailerUrl={displayTrailer}
        title={title.title}
      />
    </>
  );
}
