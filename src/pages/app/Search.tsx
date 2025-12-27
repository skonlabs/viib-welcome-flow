import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TitleCard } from "@/components/TitleCard";
import { RatingDialog } from "@/components/RatingDialog";
import { Input } from "@/components/ui/input";
import { useTitleActions } from "@/hooks/useTitleActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search as SearchIcon, X, SlidersHorizontal } from "@/icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TitleWithAvailability, getPosterUrl } from "@/lib/services/TitleCatalogService";
import { TitleDetailsModal } from "@/components/TitleDetailsModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

const GENRES = ["Action", "Comedy", "Drama", "Thriller", "Romance", "Sci-Fi", "Horror", "Documentary", "Animation", "Fantasy"];

// Generate year options (current year and past 9 years)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function Search() {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TitleWithAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [moodIntensity, setMoodIntensity] = useState<number>(0.5);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear, currentYear - 1, currentYear - 2]);
  const [services, setServices] = useState<any[]>([]);
  const [emotions, setEmotions] = useState<Array<{ id: string; emotion_label: string }>>([]);
  const [selectedTitle, setSelectedTitle] = useState<TitleWithAvailability | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TitleWithAvailability[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [userLanguage, setUserLanguage] = useState<string>('');
  const [userWatchlist, setUserWatchlist] = useState<Set<string>>(new Set());
  const [userServices, setUserServices] = useState<string[]>([]);

  useEffect(() => {
    loadServices();
    loadEmotions();
    loadUserPreferences();
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Store loadMoreResults in a ref to avoid recreating observer
  const loadMoreCallbackRef = useRef<() => Promise<void>>();

  // Store state refs for observer callback
  const stateRef = useRef({ hasMore, loadingMore, loading, resultsLength: results.length });
  stateRef.current = { hasMore, loadingMore, loading, resultsLength: results.length };

  // Infinite scroll observer - stable, doesn't recreate on state changes
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const state = stateRef.current;
        if (entries[0].isIntersecting && state.hasMore && !state.loadingMore && !state.loading && state.resultsLength > 0) {
          loadMoreCallbackRef.current();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []); // Empty dependency - observer is created once

  const loadUserPreferences = useCallback(async () => {
    if (!profile) return;

    try {
      // Batch all user preference queries in parallel
      const [userResult, watchlistResult] = await Promise.all([
        supabase
          .from('users')
          .select('language_preference')
          .eq('id', profile.id)
          .single(),
        supabase
          .from('user_title_interactions')
          .select('title_id')
          .eq('user_id', profile.id)
          .in('interaction_type', ['wishlisted', 'completed'])
      ]);

      if (userResult.data?.language_preference) {
        setUserLanguage(userResult.data.language_preference);
      }

      if (watchlistResult.data) {
        setUserWatchlist(new Set(watchlistResult.data.map(d => d.title_id)));
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }, [profile]);

  const loadServices = async () => {
    if (!profile) return;

    // Fetch both streaming services and user subscriptions in parallel
    const [servicesResult, subscriptionsResult] = await Promise.all([
      supabase
        .from('streaming_services')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('user_streaming_subscriptions')
        .select('streaming_service_id')
        .eq('user_id', profile.id)
        .eq('is_active', true)
    ]);

    const streamingServices = servicesResult.data || [];
    setServices(streamingServices);

    const userSubscriptions = subscriptionsResult.data || [];
    if (userSubscriptions.length > 0) {
      const userServiceIds = userSubscriptions.map(sub => sub.streaming_service_id);
      setSelectedServices(userServiceIds);
      
      // Map IDs to service names for sorting
      const userServiceNames = streamingServices
        .filter(s => userServiceIds.includes(s.id))
        .map(s => s.service_name);
      setUserServices(userServiceNames);
    }
  };

  const loadEmotions = async () => {
    const { data: emotionData } = await supabase
      .from('emotion_master')
      .select('id, emotion_label')
      .eq('category', 'user_state')
      .order('emotion_label');

    setEmotions(emotionData || []);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(async () => {
        if (!profile) return;
        setLoadingSuggestions(true);
        try {
          const { data, error } = await supabase.functions.invoke('search-tmdb', {
            body: {
              query: value,
              genres: selectedGenres.length > 0 ? selectedGenres : undefined,
              years: selectedYears.length > 0 ? selectedYears : undefined,
              language: 'en',
              limit: 8
            }
          });
          
          if (error) throw error;
          const sortedSuggestions = sortResults(data.titles || []);
          setSuggestions(sortedSuggestions);
          setShowDropdown(true);
        } catch (error) {
          console.error('Suggestions error:', error);
          setSuggestions([]);
        } finally {
          setLoadingSuggestions(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSuggestionClick = (title: TitleWithAvailability) => {
    setQuery(title.title);
    setShowDropdown(false);
    setSelectedTitle(title);
    setDetailsOpen(true);
  };

  const sortResults = useCallback((titles: TitleWithAvailability[]) => {
    return [...titles].sort((a, b) => {
      // 1. Sort by release date (newest first)
      const dateA = a.year || 0;
      const dateB = b.year || 0;
      if (dateA !== dateB) {
        return dateB - dateA;
      }

      // 2. Sort by language match (user's preferred language first)
      const langA = (a as any).original_language === userLanguage ? 1 : 0;
      const langB = (b as any).original_language === userLanguage ? 1 : 0;
      if (langA !== langB) {
        return langB - langA;
      }

      // 3. Sort by streaming service availability (user's services first)
      const aServices = (a as any).streaming_services || [];
      const bServices = (b as any).streaming_services || [];
      const hasServiceA = aServices.some((s: any) =>
        userServices.some(userService =>
          s.service_name?.toLowerCase().includes(userService.toLowerCase()) ||
          userService.toLowerCase().includes(s.service_name?.toLowerCase())
        )
      ) ? 1 : 0;
      const hasServiceB = bServices.some((s: any) =>
        userServices.some(userService =>
          s.service_name?.toLowerCase().includes(userService.toLowerCase()) ||
          userService.toLowerCase().includes(s.service_name?.toLowerCase())
        )
      ) ? 1 : 0;
      if (hasServiceA !== hasServiceB) {
        return hasServiceB - hasServiceA;
      }

      // 4. Finally, sort by popularity as tiebreaker
      return ((b as any).popularity || 0) - ((a as any).popularity || 0);
    });
  }, [userLanguage, userServices]);

  const handleSearchButtonClick = () => {
    setShowDropdown(false);
    handleSearch();
  };

  const handleSearch = useCallback(async () => {
    if (!profile) return;

    setShowDropdown(false);
    setSuggestions([]);
    setLoading(true);
    setPage(1);
    setHasMore(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-tmdb', {
        body: {
          query: query || 'popular',
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          years: selectedYears.length > 0 ? selectedYears : undefined,
          moods: selectedMoods.length > 0 ? selectedMoods : undefined,
          mood_intensity: selectedMoods.length > 0 ? moodIntensity : undefined,
          language: 'en',
          limit: 20
        }
      });

      if (error) throw error;
      const sortedResults = sortResults(data.titles || []);
      setResults(sortedResults);
      setHasMore((data.titles || []).length >= 20);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, query, selectedGenres, selectedYears, selectedMoods, moodIntensity, sortResults]);

  const loadMoreResults = useCallback(async () => {
    if (!profile || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data, error } = await supabase.functions.invoke('search-tmdb', {
        body: {
          query: query || 'popular',
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          years: selectedYears.length > 0 ? selectedYears : undefined,
          moods: selectedMoods.length > 0 ? selectedMoods : undefined,
          mood_intensity: selectedMoods.length > 0 ? moodIntensity : undefined,
          language: 'en',
          limit: 20,
          page: nextPage
        }
      });

      if (error) throw error;
      const newTitles = data.titles || [];
      const sortedNewTitles = sortResults(newTitles);
      setResults(prev => [...prev, ...sortedNewTitles]);
      setPage(nextPage);
      setHasMore(newTitles.length >= 20);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [profile, loadingMore, hasMore, page, query, selectedGenres, selectedYears, selectedMoods, moodIntensity, sortResults]);

  // Update ref after function is defined
  loadMoreCallbackRef.current = loadMoreResults;

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(s => s !== serviceId) : [...prev, serviceId]
    );
  };

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedMoods([]);
    setSelectedServices([]);
    setSelectedYears([currentYear, currentYear - 1, currentYear - 2]);
  };

  const {
    addToWatchlistByTmdb,
    openRatingDialog,
    handleRating,
    handleRatingByTmdb,
    ratingDialogOpen,
    setRatingDialogOpen,
    titleToRate,
  } = useTitleActions();

  const handleAddToWatchlist = async (tmdbId: string, seasonNumber?: number) => {
    await addToWatchlistByTmdb(tmdbId, seasonNumber);
  };

  const handleMarkAsWatched = (tmdbId: string, titleName: string) => {
    handleRatingByTmdb(tmdbId, titleName);
  };

  return (
    <div className="bg-gradient-to-br from-background to-accent/10 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Search</h1>

        {/* Active Filters Display */}
        {(selectedGenres.length > 0 || selectedMoods.length > 0 || selectedYears.length !== 3) && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Active Filters</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>

              {selectedYears.length > 0 && selectedYears.length !== 3 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Release Years</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedYears.sort((a, b) => b - a).map(year => (
                      <Badge
                        key={year}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleYear(year)}
                      >
                        {year} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedGenres.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedGenres.map(genre => (
                      <Badge
                        key={genre}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleGenre(genre)}
                      >
                        {genre} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedMoods.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Moods</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMoods.map(mood => (
                      <Badge
                        key={mood}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleMood(mood)}
                      >
                        {mood} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1" ref={dropdownRef}>
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for movies or series..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                  setShowDropdown(false);
                }
              }}
              onFocus={() => query.length >= 3 && suggestions.length > 0 && setShowDropdown(true)}
              className="pl-10"
            />

            {/* Autocomplete Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                {loadingSuggestions ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading suggestions...
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="py-2">
                    {suggestions.map((title) => (
                      <button
                        key={title.external_id}
                        onClick={() => handleSuggestionClick(title)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors text-left border-b border-border last:border-0"
                      >
                        {(title as any).poster_path || (title as any).poster_url ? (
                          <img
                            src={getPosterUrl((title as any).poster_path || (title as any).poster_url)}
                            alt={title.title}
                            className="w-12 h-18 object-cover rounded shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-18 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">{title.type === 'movie' ? '🎬' : '📺'}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium truncate text-foreground">{title.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              {title.type === 'movie' ? '🎬 Movie' : '📺 Series'}
                            </span>
                            {title.year && (
                              <>
                                <span>•</span>
                                <span>{title.year}</span>
                              </>
                            )}
                            {title.type === 'series' && (title as any).number_of_seasons && (
                              <>
                                <span>•</span>
                                <span>{(title as any).number_of_seasons} {(title as any).number_of_seasons === 1 ? 'Season' : 'Seasons'}</span>
                              </>
                            )}
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
                                {(title as any).certification || 'NR'}
                              </span>
                            </>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : query.length >= 3 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No results found
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto w-[280px] sm:w-[350px] max-h-screen">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Genres */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(genre => (
                      <Badge
                        key={genre}
                        variant={selectedGenres.includes(genre) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleGenre(genre)}
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Moods */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Moods</Label>
                  <div className="flex flex-wrap gap-2">
                    {emotions.map(emotion => (
                      <Badge
                        key={emotion.id}
                        variant={selectedMoods.includes(emotion.emotion_label) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleMood(emotion.emotion_label)}
                      >
                        {emotion.emotion_label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Mood Intensity */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Mood Intensity</Label>
                    <span className="text-sm text-muted-foreground">{Math.round(moodIntensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={moodIntensity}
                    onChange={(e) => setMoodIntensity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Release Years */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Release Years</Label>
                  <div className="flex flex-wrap gap-2">
                    {YEARS.map(year => (
                      <Badge
                        key={year}
                        variant={selectedYears.includes(year) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleYear(year)}
                      >
                        {year}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Streaming Services</Label>
                  <div className="space-y-2">
                    {services.map(service => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={service.id}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                        />
                        <Label htmlFor={service.id} className="cursor-pointer flex items-center gap-2">
                          {service.logo_url && (
                            <img src={service.logo_url} alt={service.service_name} className="w-5 h-5 object-contain" />
                          )}
                          {service.service_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={clearFilters} variant="outline" className="w-full gap-2">
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={handleSearchButtonClick} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Results */}
        {loading && <p className="text-center text-muted-foreground">Searching...</p>}

        {!loading && results.length === 0 && query && (
          <p className="text-center text-muted-foreground">No results found. Try different filters.</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {results.map(title => (
            <TitleCard
              key={title.external_id}
              title={title}
              onClick={() => {
                setSelectedTitle(title);
                setDetailsOpen(true);
              }}
              isInWatchlist={userWatchlist.has(title.external_id || '')}
              actions={title.type === 'movie' ? {
                onWatchlist: () => handleAddToWatchlist(String((title as any).tmdb_id || title.external_id)),
                onWatched: () => handleMarkAsWatched(String((title as any).tmdb_id || title.external_id), title.title)
              } : undefined}
            />
          ))}
        </div>

        {/* Load more trigger */}
        {results.length > 0 && (
          <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span>Loading more...</span>
              </div>
            )}
            {!hasMore && !loadingMore && (
              <p className="text-muted-foreground text-sm">No more results</p>
            )}
          </div>
        )}
      </div>

      <TitleDetailsModal
        title={selectedTitle}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onAddToWatchlist={handleAddToWatchlist}
      />

      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        titleName={titleToRate?.title || ''}
        onRate={handleRating}
      />
    </div>
  );
}
