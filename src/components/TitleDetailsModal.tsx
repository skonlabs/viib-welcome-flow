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
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [seasonDetailsOpen, setSeasonDetailsOpen] = useState(false);
  const [seasonTrailerOpen, setSeasonTrailerOpen] = useState(false);
  const [currentTrailerUrl, setCurrentTrailerUrl] = useState<string | null>(null);

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
  const seasons = enrichedData?.seasons || [];

  const handleSeasonClick = (season: any) => {
    setSelectedSeason(season);
    setSeasonDetailsOpen(true);
  };

  const handleMainTrailerClick = () => {
    setCurrentTrailerUrl(displayTrailer);
    setTrailerOpen(true);
  };

  const handleSeasonTrailerClick = () => {
    setCurrentTrailerUrl(selectedSeason?.trailer_url);
    setSeasonTrailerOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">{title.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Details for {title.title} ({title.year})
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] gap-4 sm:gap-6">
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
                  onClick={handleMainTrailerClick}
                >
                  <Play className="w-5 h-5" />
                  Watch Trailer
                </Button>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">{title.title}</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
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

              {/* Seasons (for TV Shows) */}
              {title.type === 'series' && seasons.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Seasons:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {seasons.map((season: any) => (
                      <button
                        key={season.season_number}
                        onClick={() => handleSeasonClick(season)}
                        className="group relative overflow-hidden rounded-lg border border-border hover:border-primary transition-all hover:shadow-lg"
                      >
                        {season.poster_path ? (
                          <img
                            src={season.poster_path}
                            alt={season.name}
                            className="w-full aspect-[2/3] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                            <span className="text-4xl">📺</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                          <p className="text-white font-semibold text-sm">{season.name}</p>
                          <p className="text-white/80 text-xs">{season.episode_count} episodes</p>
                          {season.air_date && (
                            <p className="text-white/60 text-xs">{new Date(season.air_date).getFullYear()}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && title.type === 'series' && seasons.length === 0 && (
                <div className="text-sm text-muted-foreground">Loading seasons...</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Season Details Modal */}
      {selectedSeason && (
        <Dialog open={seasonDetailsOpen} onOpenChange={setSeasonDetailsOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{title.title} - {selectedSeason.name}</DialogTitle>
              <DialogDescription>
                {selectedSeason.episode_count} episodes
                {selectedSeason.air_date && ` • ${new Date(selectedSeason.air_date).getFullYear()}`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] gap-4 sm:gap-6">
              {/* Season Poster */}
              <div className="relative">
                {selectedSeason.poster_path ? (
                  <img
                    src={selectedSeason.poster_path}
                    alt={selectedSeason.name}
                    className="w-full rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-6xl">📺</span>
                  </div>
                )}
                {selectedSeason.trailer_url && (
                  <Button
                    size="lg"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 gap-2 text-xs sm:text-sm"
                    onClick={handleSeasonTrailerClick}
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                    Watch Trailer
                  </Button>
                )}
              </div>

              {/* Season Details */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{selectedSeason.name}</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Season {selectedSeason.season_number} • {selectedSeason.episode_count} episodes
                    {selectedSeason.air_date && ` • ${new Date(selectedSeason.air_date).getFullYear()}`}
                  </p>
                </div>

                {/* Season Overview */}
                {selectedSeason.overview && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Overview:</p>
                    <p className="text-sm leading-relaxed">{selectedSeason.overview}</p>
                  </div>
                )}

                {/* Streaming Services (inherited from main title) */}
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

                <Button
                  variant="outline"
                  onClick={() => setSeasonDetailsOpen(false)}
                  className="w-full"
                >
                  Back to All Seasons
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <TrailerDialog
        open={trailerOpen}
        onOpenChange={setTrailerOpen}
        trailerUrl={currentTrailerUrl}
        title={title.title}
      />

      <TrailerDialog
        open={seasonTrailerOpen}
        onOpenChange={setSeasonTrailerOpen}
        trailerUrl={currentTrailerUrl}
        title={`${title.title} - ${selectedSeason?.name || ''}`}
      />
    </>
  );
}
