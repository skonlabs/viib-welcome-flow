import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Heart, PlayCircle, Search, Star, Clock, Trash2, Eye, Bookmark } from '@/icons';
import { Loader2 } from '@/icons';

interface Title {
  id: string;
  title_name: string;
  content_type: string;
  release_year: number | null;
  runtime_minutes: number | null;
  synopsis: string | null;
  popularity_score: number | null;
}

interface UserInteraction {
  id: string;
  title_id: string;
  interaction_type: string;
  rating_value: string | null;
  watch_duration_percentage: number | null;
  created_at: string;
  title: Title;
}

interface Recommendation {
  id: string;
  title_id: string;
  was_selected: boolean;
  rating_value: string | null;
  recommended_at: string;
  title: Title;
}

export default function ViiBList() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('wishlisted');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [wishlistedTitles, setWishlistedTitles] = useState<UserInteraction[]>([]);
  const [watchedTitles, setWatchedTitles] = useState<UserInteraction[]>([]);
  const [recommendedTitles, setRecommendedTitles] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWishlistedTitles(),
        fetchWatchedTitles(),
        fetchRecommendedTitles(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load your list');
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlistedTitles = async () => {
    const { data, error } = await supabase
      .from('user_title_interactions')
      .select(`
        id,
        title_id,
        interaction_type,
        rating_value,
        watch_duration_percentage,
        created_at,
        title:titles (
          id,
          title_name,
          content_type,
          release_year,
          runtime_minutes,
          synopsis,
          popularity_score
        )
      `)
      .eq('user_id', user?.id)
      .eq('interaction_type', 'wishlisted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setWishlistedTitles(data || []);
  };

  const fetchWatchedTitles = async () => {
    const { data, error } = await supabase
      .from('user_title_interactions')
      .select(`
        id,
        title_id,
        interaction_type,
        rating_value,
        watch_duration_percentage,
        created_at,
        title:titles (
          id,
          title_name,
          content_type,
          release_year,
          runtime_minutes,
          synopsis,
          popularity_score
        )
      `)
      .eq('user_id', user?.id)
      .in('interaction_type', ['started', 'completed'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setWatchedTitles(data || []);
  };

  const fetchRecommendedTitles = async () => {
    const { data, error } = await supabase
      .from('recommendation_outcomes')
      .select(`
        id,
        title_id,
        was_selected,
        rating_value,
        recommended_at,
        title:titles (
          id,
          title_name,
          content_type,
          release_year,
          runtime_minutes,
          synopsis,
          popularity_score
        )
      `)
      .eq('user_id', user?.id)
      .order('recommended_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setRecommendedTitles(data || []);
  };

  const removeFromWishlist = async (interactionId: string) => {
    try {
      const { error } = await supabase
        .from('user_title_interactions')
        .delete()
        .eq('id', interactionId);

      if (error) throw error;

      setWishlistedTitles(prev => prev.filter(item => item.id !== interactionId));
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    }
  };

  const getRatingBadge = (rating: string | null) => {
    if (!rating || rating === 'not_rated') return null;

    const ratingConfig: Record<string, { variant: 'success' | 'warning' | 'destructive', label: string }> = {
      love_it: { variant: 'success', label: '❤️ Love It' },
      like_it: { variant: 'success', label: '👍 Like It' },
      ok: { variant: 'warning', label: '😐 OK' },
      dislike_it: { variant: 'destructive', label: '👎 Dislike' },
    };

    const config = ratingConfig[rating];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : null;
  };

  const filterTitles = (items: any[]) => {
    if (!searchQuery.trim()) return items;
    
    return items.filter(item => 
      item.title?.title_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderTitleCard = (item: UserInteraction | Recommendation, showRemove = false) => {
    const title = item.title;
    const isInteraction = 'interaction_type' in item;

    return (
      <Card key={item.id} className="glass-card hover:border-primary/30 transition-all">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Placeholder Image */}
            <div className="w-24 h-36 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-8 h-8 text-icon-muted" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg line-clamp-1">
                  {title?.title_name || 'Unknown Title'}
                </h3>
                {showRemove && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => removeFromWishlist(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-icon-danger" />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline">{title?.content_type || 'Unknown'}</Badge>
                {title?.release_year && (
                  <Badge variant="outline">{title.release_year}</Badge>
                )}
                {title?.runtime_minutes && (
                  <Badge variant="outline">{title.runtime_minutes} min</Badge>
                )}
              </div>

              {title?.synopsis && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {title.synopsis}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {getRatingBadge(item.rating_value)}
                
                {isInteraction && item.watch_duration_percentage !== null && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.round(item.watch_duration_percentage)}%
                  </Badge>
                )}

                {title?.popularity_score !== null && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    {title.popularity_score.toFixed(1)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My ViiBList</h1>
        <p className="text-muted-foreground">
          Your personalized collection of saved, watched, and recommended content
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-icon-muted" />
          <Input
            placeholder="Search your list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="wishlisted" className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Wishlist</span>
            <Badge variant="secondary" className="ml-1">
              {wishlistedTitles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="watched" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Watched</span>
            <Badge variant="secondary" className="ml-1">
              {watchedTitles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Recommended</span>
            <Badge variant="secondary" className="ml-1">
              {recommendedTitles.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wishlisted" className="space-y-4">
          {filterTitles(wishlistedTitles).length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Bookmark className="w-12 h-12 text-icon-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No items in wishlist</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No results found for your search' : 'Start adding titles to build your wishlist'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTitles(wishlistedTitles).map(item => renderTitleCard(item, true))
          )}
        </TabsContent>

        <TabsContent value="watched" className="space-y-4">
          {filterTitles(watchedTitles).length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Eye className="w-12 h-12 text-icon-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No watched content</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No results found for your search' : 'Your viewing history will appear here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTitles(watchedTitles).map(item => renderTitleCard(item))
          )}
        </TabsContent>

        <TabsContent value="recommended" className="space-y-4">
          {filterTitles(recommendedTitles).length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Heart className="w-12 h-12 text-icon-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No results found for your search' : 'Complete your profile to get personalized recommendations'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTitles(recommendedTitles).map(item => renderTitleCard(item))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
