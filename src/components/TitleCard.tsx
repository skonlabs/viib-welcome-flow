import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPosterUrl } from "@/lib/services/TitleCatalogService";
import { Play, Share2, Eye, Plus, X, Trash2, Check, Heart, ThumbsUp, ThumbsDown, Sparkles, Loader2 } from "lucide-react";
import { TrailerDialog } from "./TrailerDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Flexible title type to handle both database and TMDB API formats
type FlexibleTitle = {
  id?: string;
  external_id?: string;
  title: string;
  type: 'movie' | 'series';
  year?: number | null;
  poster_path?: string | null;  // TMDB path format
  poster_url?: string | null;   // Full URL format (legacy/search results)
  trailer_url?: string | null;
  runtime_minutes?: number | null;
  runtime?: number | null;
  avg_episode_minutes?: number | null;
  genres?: string[];
  mood_tags?: string[];
  cast?: string[];
  certification?: string;
  number_of_seasons?: number;
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
};

interface ExplainabilityData {
  reasons: string[];
  scores: Record<string, number>;
}

interface TitleCardProps {
  title: FlexibleTitle;
  onClick?: () => void;
  showAvailability?: boolean;
  showShare?: boolean;
  recommendedBy?: string;
  recommendationNote?: string;
  viibScore?: number;
  isInWatchlist?: boolean;
  compactRecommend?: boolean;
  userRating?: 'love_it' | 'like_it' | 'ok' | 'dislike_it' | 'not_rated' | null;
  explainability?: ExplainabilityData;
  actions?: {
    onWatched?: () => void;
    onWatchlist?: () => void;
    onPass?: () => void;
    onRecommend?: () => void;
  };
}

export function TitleCard({ 
  title, 
  onClick, 
  showAvailability = true, 
  showShare = false, 
  recommendedBy, 
  recommendationNote, 
  viibScore, 
  isInWatchlist = false,
  compactRecommend = false,
  userRating,
  explainability: passedExplainability,
  actions 
}: TitleCardProps) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  // Use passed explainability data directly, or fetch if not provided
  const [fetchedExplanation, setFetchedExplanation] = useState<{ reasons: string[]; scores: Record<string, number> } | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const { profile } = useAuth();
  const trailerUrl = title.trailer_url;

  // Use passed explainability if available, otherwise use fetched
  const explanation = passedExplainability && (passedExplainability.reasons.length > 0 || Object.keys(passedExplainability.scores).length > 0)
    ? passedExplainability
    : fetchedExplanation;

  const handleTrailerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trailerUrl) {
      setTrailerOpen(true);
    }
  };

  const fetchExplanation = async () => {
    // Skip if we already have passed or fetched explanation
    if (!profile || !title.id || explanation) return;
    
    setLoadingExplanation(true);
    try {
      const { data, error } = await supabase.rpc('explain_recommendation', {
        p_user_id: profile.id,
        p_title_id: title.id
      });
      
      if (error) throw error;
      
      // Cast to any for flexible access - the RPC returns an array with one row
      const rawData = data as any;
      const row = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : rawData;
      
      // Build reasons from primary_reason and secondary_reasons
      const reasons: string[] = [];
      if (row?.primary_reason) {
        reasons.push(row.primary_reason);
      }
      if (row?.secondary_reasons && Array.isArray(row.secondary_reasons)) {
        reasons.push(...row.secondary_reasons.filter((r: string) => r));
      }
      if (row?.full_explanation && reasons.length === 0) {
        reasons.push(row.full_explanation);
      }
      
      // Build scores from the returned metrics (already 0-1 scale)
      const scores: Record<string, number> = {};
      if (typeof row?.emotional_match === 'number') scores['emotion'] = row.emotional_match;
      if (typeof row?.taste_similarity === 'number') scores['taste'] = row.taste_similarity;
      if (typeof row?.intent_confidence === 'number') scores['intent'] = row.intent_confidence;
      if (typeof row?.social_score === 'number') scores['social'] = row.social_score;
      if (typeof row?.transformation_score === 'number') scores['transformation'] = row.transformation_score;
      
      setFetchedExplanation({ 
        reasons: reasons.length > 0 ? reasons : ['Recommended based on your preferences.'], 
        scores 
      });
    } catch (err) {
      console.error('Failed to load explanation:', err);
      setFetchedExplanation({ reasons: ['Unable to load explanation'], scores: {} });
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <>
      <Card
        className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 group"
        onClick={onClick}
      >
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={getPosterUrl(title.poster_path || title.poster_url)}
            alt={title.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {recommendedBy && (
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 max-w-[calc(100%-3rem)]">
              <div className="bg-primary/95 backdrop-blur-sm px-2 py-1 rounded-md">
                <div className="flex items-center gap-1 text-xs text-primary-foreground font-medium">
                  <span className="truncate">Recommended by: {recommendedBy}</span>
                </div>
              </div>
              {recommendationNote && (
                <div className="mt-1 bg-background/95 backdrop-blur-sm p-2 rounded-md">
                  <p className="text-xs text-muted-foreground italic line-clamp-2">"{recommendationNote}"</p>
                </div>
              )}
            </div>
          )}
          {viibScore !== undefined && (
            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 animate-fade-in z-20">
              <Popover open={explanationOpen} onOpenChange={(open) => {
                setExplanationOpen(open);
                if (open) fetchExplanation();
              }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="font-bold backdrop-blur-sm shadow-lg text-xs sm:text-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-2 border-primary-foreground/20 cursor-pointer hover:scale-105 transition-transform rounded-full px-2 py-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Math.round(viibScore)}%
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-72 p-3" 
                  side="left" 
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Sparkles className="h-4 w-4" />
                      Why this recommendation?
                    </div>
                    {loadingExplanation ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : explanation ? (
                      <div className="space-y-2">
                        {explanation.reasons.length > 0 ? (
                          <ul className="text-xs text-muted-foreground space-y-1.5">
                            {explanation.reasons.map((reason, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            This title matches your viewing preferences and mood.
                          </p>
                        )}
                        {explanation.scores && Object.keys(explanation.scores).length > 0 && (
                          <div className="pt-2 border-t border-border mt-2">
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">Score Breakdown</p>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              {Object.entries(explanation.scores).map(([key, val]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}</span>
                                  <span className="font-medium">{typeof val === 'number' ? Math.round(val * 100) : val}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className={`absolute ${viibScore !== undefined ? 'top-10 sm:top-12' : (recommendedBy ? (recommendationNote ? 'top-24' : 'top-12') : 'top-1.5')} right-1.5 sm:right-2 animate-fade-in`}>
            <Badge
              variant={title.type === 'movie' ? 'default' : 'secondary'}
              className="font-semibold backdrop-blur-sm shadow-lg text-[10px] sm:text-xs"
            >
              {title.type === 'movie' ? '🎬 Movie' : '📺 Series'}
            </Badge>
          </div>
          {showShare && (
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 animate-fade-in">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Share clicked');
                }}
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </Button>
            </div>
          )}
          {actions?.onPass && (
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 animate-fade-in z-10">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.onPass?.();
                }}
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </Button>
            </div>
          )}
          {/* Action buttons positioned at bottom of poster */}
          <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center gap-2 px-2">
            <Button
              size="sm"
              onClick={handleTrailerClick}
              disabled={!trailerUrl}
              className="gap-1.5 shadow-xl hover:scale-105 transition-transform duration-300 h-8 sm:h-9 text-xs sm:text-sm w-full max-w-[150px] bg-black/70 backdrop-blur-sm hover:bg-black/80 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Trailer
            </Button>

            {actions && (
              <div className="flex gap-1 w-full">
                {actions.onWatched && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1 text-[9px] sm:text-xs bg-black/70 backdrop-blur-sm hover:bg-green-500/30 hover:text-green-300 hover:border-green-500/50 border-white/30 h-7 sm:h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.onWatched?.();
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    <span>Seen It</span>
                  </Button>
                )}

                {actions.onWatchlist && (
                  <Button
                    size="sm"
                    className={`flex-1 gap-1 text-[9px] sm:text-xs backdrop-blur-sm h-7 sm:h-8 ${
                      isInWatchlist 
                        ? 'bg-green-500/80 hover:bg-green-500/90 text-white' 
                        : 'bg-primary/90 hover:bg-primary'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.onWatchlist?.();
                    }}
                  >
                    {isInWatchlist ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    <span>{isInWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
                  </Button>
                )}

                {actions.onRecommend && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={`gap-1 text-[9px] sm:text-xs bg-black/70 backdrop-blur-sm hover:bg-purple-500/30 hover:text-purple-300 hover:border-purple-500/50 border-white/30 h-7 sm:h-8 ${compactRecommend ? 'px-2' : 'flex-1'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.onRecommend?.();
                    }}
                  >
                    <Share2 className="h-3 w-3" />
                    {!compactRecommend && <span>Recommend</span>}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold line-clamp-1 text-sm sm:text-base flex-1">{title.title}</h3>
            {userRating && userRating !== 'not_rated' && (
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                userRating === 'love_it' ? 'bg-pink-500/20 text-pink-400' :
                userRating === 'like_it' ? 'bg-green-500/20 text-green-400' :
                userRating === 'ok' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {userRating === 'love_it' && <Heart className="h-3 w-3 fill-current" />}
                {userRating === 'like_it' && <ThumbsUp className="h-3 w-3" />}
                {userRating === 'ok' && <span>OK</span>}
                {userRating === 'dislike_it' && <ThumbsDown className="h-3 w-3" />}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span>{title.year}</span>
            {title.certification && (
              <>
                <span>•</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold text-[10px]">
                  {title.certification}
                </span>
              </>
            )}
            <span>•</span>
            <span>{title.type === 'movie' ? `${title.runtime_minutes || title.runtime || '120'}min` : `${title.avg_episode_minutes || '45'}min/ep`}</span>
            {title.type === 'series' && title.number_of_seasons && (
              <>
                <span>•</span>
                <span>{title.number_of_seasons} {title.number_of_seasons === 1 ? 'Season' : 'Seasons'}</span>
              </>
            )}
          </div>

          {/* Display genres - always show if available */}
          {title.genres && title.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {title.genres.slice(0, 3).map((genre) => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {/* Display cast - show top 3 actors */}
          {title.cast && title.cast.length > 0 && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {title.cast.slice(0, 3).join(', ')}
            </p>
          )}

          {title.mood_tags && title.mood_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {title.mood_tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Display streaming services */}
          {showAvailability && title.availability && title.availability.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {title.availability.slice(0, 4).map((service, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-md overflow-hidden bg-background border border-border flex items-center justify-center p-1.5 hover:ring-2 hover:ring-primary transition-all"
                  title={`Available on ${service.service_name}`}
                >
                  {service.logo_url ? (
                    <img
                      src={service.logo_url}
                      alt={service.service_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[8px] text-center font-medium leading-tight">{service.service_name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <TrailerDialog
        open={trailerOpen}
        onOpenChange={setTrailerOpen}
        trailerUrl={trailerUrl || null}
        title={title.title}
      />
    </>
  );
}
