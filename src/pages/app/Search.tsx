import { useState, useEffect, useRef } from "react";
import { TitleCard } from "@/components/TitleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search as SearchIcon, X, SlidersHorizontal } from "@/icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TitleWithAvailability } from "@/lib/services/TitleCatalogService";
import { TitleDetailsModal } from "@/components/TitleDetailsModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const GENRES = ["Action", "Comedy", "Drama", "Thriller", "Romance", "Sci-Fi", "Horror", "Documentary", "Animation", "Fantasy"];

export default function Search() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TitleWithAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [moodIntensity, setMoodIntensity] = useState<number>(0.5);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [emotions, setEmotions] = useState<Array<{ id: string; emotion_label: string }>>([]);
  const [selectedTitle, setSelectedTitle] = useState<TitleWithAvailability | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TitleWithAvailability[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadServices();
    loadEmotions();
  }, [user]);

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

  const loadServices = async () => {
    if (!user) return;

    const { data: streamingServices } = await supabase
      .from('streaming_services')
      .select('*')
      .eq('is_active', true);

    setServices(streamingServices || []);

    // Pre-select user's streaming subscriptions
    const { data: userSubscriptions } = await supabase
      .from('user_streaming_subscriptions')
      .select('streaming_service_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (userSubscriptions) {
      setSelectedServices(userSubscriptions.map(sub => sub.streaming_service_id));
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
        if (!user) return;
        setLoadingSuggestions(true);
        try {
          const { data, error } = await supabase.functions.invoke('search-tmdb', {
            body: {
              query: value,
              genres: selectedGenres.length > 0 ? selectedGenres : undefined,
              language: 'en',
              limit: 8
            }
          });
          
          if (error) throw error;
          setSuggestions(data.titles || []);
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

  const handleSearch = async () => {
    if (!user) return;

    setShowDropdown(false);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-tmdb', {
        body: {
          query: query || 'popular',
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          language: 'en'
        }
      });
      
      if (error) throw error;
      setResults(data.titles || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedMoods([]);
    setSelectedServices([]);
  };

  return (
    <div className="bg-gradient-to-br from-background to-accent/10">
      <div className="max-w-2xl mx-auto p-4 space-y-6 pt-6">
        <h1 className="text-3xl font-bold">Search</h1>

        {/* Active Filters Display */}
        {(selectedGenres.length > 0 || selectedMoods.length > 0) && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Active Filters</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>

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
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
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
                        {title.poster_url ? (
                          <img
                            src={title.poster_url}
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
                            {(title as any).certification && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
                                  {(title as any).certification}
                                </span>
                              </>
                            )}
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
            <SheetContent side="right" className="overflow-y-auto">
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
          <Button onClick={handleSearch} disabled={loading}>
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
            />
          ))}
        </div>
      </div>

      <TitleDetailsModal
        title={selectedTitle}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
