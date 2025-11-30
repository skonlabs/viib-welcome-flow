import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { useState, useEffect } from "react";
import { TrailerDialog } from "./TrailerDialog";
import { supabase } from "@/integrations/supabase/client";

interface TitleDetailsModalProps {
  title: {
    tmdb_id?: number;
    external_id?: string;
    title: string;
    type: 'movie' | 'series';
    year?: number | null;
    poster_url?: string | null;
    backdrop_url?: string | null;
    trailer_url?: string | null;
    runtime_minutes?: number | null;
    avg_episode_minutes?: number | null;
    genres?: string[] | number[];
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
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && title && title.tmdb_id) {
      fetchEnrichedData();
    }
  }, [open, title?.tmdb_id]);

  const fetchEnrichedData = async () => {
    if (!title?.tmdb_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-title-details', {
        body: {
          tmdb_id: title.tmdb_id,
          type: title.type
        }
      });
      
      if (error) throw error;
      setEnrichedData(data);
    } catch (error) {
      console.error('Failed to fetch enriched data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!title) return null;

  const displayPoster = title.poster_url;
  const displayBackdrop = title.backdrop_url;
  const displayTrailer = enrichedData?.trailer_url || title.trailer_url;
  const displayGenres = enrichedData?.genres || title.genres || [];
  const displayCast = enrichedData?.cast || title.cast || [];
  const displayRuntime = enrichedData?.runtime_minutes || title.runtime_minutes;
  const displayEpisodeLength = enrichedData?.avg_episode_minutes || title.avg_episode_minutes;
  const displayAvailability = enrichedData?.streaming_services || title.availability || title.streaming_services || [];
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
              {(displayGenres.length > 0 || title.mood_tags?.length) && (
                <div className="flex flex-wrap gap-2">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading genres...</div>
                  ) : (
                    displayGenres.slice(0, 4).map((genre: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {typeof genre === 'string' ? genre : genre}
                      </Badge>
                    ))
                  )}
                  {title.mood_tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Description */}
              {displayDescription && (
                <p className="text-sm leading-relaxed">{displayDescription}</p>
              )}

              {/* Cast */}
              {displayCast.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Cast:</p>
                  <p className="text-sm text-muted-foreground">
                    {displayCast.slice(0, 5).join(', ')}
                  </p>
                </div>
              )}
              
              {loading && displayCast.length === 0 && (
                <div className="text-sm text-muted-foreground">Loading cast...</div>
              )}

              {/* Streaming Services */}
              {displayAvailability.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Available on:</p>
                  <div className="flex flex-wrap gap-2">
                    {displayAvailability.map((service: any, i: number) => (
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
              
              {loading && displayAvailability.length === 0 && (
                <div className="text-sm text-muted-foreground">Loading streaming availability...</div>
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
