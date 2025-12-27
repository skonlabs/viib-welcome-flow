import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, Users, Globe, Trash2, UserPlus, Share2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { TitleCard } from "@/components/TitleCard";
import { RatingDialog } from "@/components/RatingDialog";
import { TitleDetailsModal } from "@/components/TitleDetailsModal";
import { AddTitlesToListDialog } from "@/components/AddTitlesToListDialog";
import { ManageTrustedCircleDialog } from "@/components/ManageTrustedCircleDialog";
import { ShareListDialog } from "@/components/ShareListDialog";
import { useTitleActions } from "@/hooks/useTitleActions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MOOD_OPTIONS = [
  "light", "cozy", "funny", "deep", "emotional", "intense",
  "thrilling", "mind_bending", "background", "feel_good", "high_energy"
];

export default function ViiBList() {
  const { profile } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [sharedWithMeLists, setSharedWithMeLists] = useState<any[]>([]);
  const [publicLists, setPublicLists] = useState<any[]>([]);
  const [followedLists, setFollowedLists] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [listTitles, setListTitles] = useState<any[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<any>(null);
  const [addTitlesOpen, setAddTitlesOpen] = useState(false);
  const [trustedCircleOpen, setTrustedCircleOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-lists" | "discover">("my-lists");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [removeTitleDialogOpen, setRemoveTitleDialogOpen] = useState(false);
  const [titleToRemove, setTitleToRemove] = useState<string | null>(null);
  const [userWatchlist, setUserWatchlist] = useState<Set<string>>(new Set());

  const {
    addToWatchlist,
    openRatingDialog,
    handleRating,
    ratingDialogOpen,
    setRatingDialogOpen,
    titleToRate,
  } = useTitleActions();

  const [newList, setNewList] = useState({
    name: "",
    description: "",
    mood_tags: [] as string[],
    visibility: "private"
  });

  useEffect(() => {
    if (profile) {
      loadLists();
      loadSharedWithMeLists();
      loadPublicLists();
      loadFollowedLists();
      loadUserWatchlist();
    }
  }, [profile]);

  const loadUserWatchlist = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('user_title_interactions')
      .select('title_id')
      .eq('user_id', profile.id)
      .in('interaction_type', ['wishlisted', 'completed']);

    if (data) {
      setUserWatchlist(new Set(data.map(d => d.title_id)));
    }
  };

  useEffect(() => {
    if (selectedList) {
      loadListTitles(selectedList.id);
    }
  }, [selectedList]);

  // Helper function to batch fetch list stats using direct queries
  const fetchListStats = async (listIds: string[]) => {
    if (listIds.length === 0) return new Map();

    const statsMap = new Map<string, { itemCount: number; viewCount: number; followerCount: number }>();

    // Fetch item counts
    const { data: itemsData } = await supabase
      .from('vibe_list_items')
      .select('vibe_list_id')
      .in('vibe_list_id', listIds);

    // Fetch view counts  
    const { data: viewsData } = await supabase
      .from('vibe_list_views')
      .select('vibe_list_id')
      .in('vibe_list_id', listIds);

    // Fetch follower counts
    const { data: followersData } = await supabase
      .from('vibe_list_followers')
      .select('vibe_list_id')
      .in('vibe_list_id', listIds);

    // Initialize all lists with zero counts
    listIds.forEach(id => {
      statsMap.set(id, { itemCount: 0, viewCount: 0, followerCount: 0 });
    });

    // Count items per list
    itemsData?.forEach((item: { vibe_list_id: string }) => {
      const stats = statsMap.get(item.vibe_list_id);
      if (stats) stats.itemCount++;
    });

    // Count views per list
    viewsData?.forEach((view: { vibe_list_id: string }) => {
      const stats = statsMap.get(view.vibe_list_id);
      if (stats) stats.viewCount++;
    });

    // Count followers per list
    followersData?.forEach((follower: { vibe_list_id: string }) => {
      const stats = statsMap.get(follower.vibe_list_id);
      if (stats) stats.followerCount++;
    });

    return statsMap;
  };

  const loadLists = async () => {
    if (!profile) return;

    const { data: listsData } = await supabase
      .from('vibe_lists')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!listsData) {
      setLists([]);
      return;
    }

    // Batch fetch all counts using RPC function
    const listIds = listsData.map(list => list.id);
    const statsMap = await fetchListStats(listIds);

    const listsWithCounts = listsData.map(list => ({
      ...list,
      itemCount: statsMap.get(list.id)?.itemCount || 0,
      viewCount: statsMap.get(list.id)?.viewCount || 0,
      followerCount: statsMap.get(list.id)?.followerCount || 0
    }));

    setLists(listsWithCounts);
  };

  const loadListTitles = async (listId: string) => {
    const { data } = await supabase
      .from('vibe_list_items')
      .select('*')
      .eq('vibe_list_id', listId);

    if (!data || data.length === 0) {
      setListTitles([]);
      return;
    }

    // Get the title IDs
    const titleIds = data.map(item => item.title_id);

    // Fetch actual title data from titles table
    const { data: titlesData } = await supabase
      .from('titles')
      .select('id, name, title_type, poster_path, release_date, first_air_date, tmdb_id, overview, runtime')
      .in('id', titleIds);

    const titlesMap = new Map((titlesData || []).map(t => [t.id, t]));

    // Map list items to enriched title data
    const enrichedTitles = data.map(item => {
      const titleData = titlesMap.get(item.title_id);
      if (titleData) {
        const releaseYear = titleData.release_date
          ? new Date(titleData.release_date).getFullYear()
          : titleData.first_air_date
            ? new Date(titleData.first_air_date).getFullYear()
            : undefined;

        return {
          external_id: item.title_id,
          tmdb_id: titleData.tmdb_id,
          title: titleData.name || 'Unknown Title',
          type: titleData.title_type === 'tv' ? 'series' as const : 'movie' as const,
          year: releaseYear,
          poster_url: titleData.poster_path
            ? `https://image.tmdb.org/t/p/w500${titleData.poster_path}`
            : undefined,
          overview: titleData.overview,
          runtime_minutes: titleData.runtime
        };
      }
      return {
        external_id: item.title_id,
        title: 'Unknown Title',
        type: 'movie' as const,
        year: undefined,
        poster_url: undefined
      };
    });

    setListTitles(enrichedTitles);
  };

  const loadPublicLists = async () => {
    const { data: listsData } = await supabase
      .from('vibe_lists')
      .select('*, users:user_id(full_name)')
      .eq('visibility', 'public')
      .neq('user_id', profile?.id || '')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!listsData) {
      setPublicLists([]);
      return;
    }

    // Batch fetch all counts using RPC function
    const listIds = listsData.map(list => list.id);
    const statsMap = await fetchListStats(listIds);

    const listsWithCounts = listsData.map(list => ({
      ...list,
      itemCount: statsMap.get(list.id)?.itemCount || 0,
      viewCount: statsMap.get(list.id)?.viewCount || 0,
      followerCount: statsMap.get(list.id)?.followerCount || 0
    }));

    setPublicLists(listsWithCounts);
  };

  const loadSharedWithMeLists = async () => {
    if (!profile) return;

    const { data: sharedData } = await supabase
      .from('vibe_list_shared_with')
      .select('vibe_list_id')
      .eq('shared_with_user_id', profile.id);

    if (!sharedData || sharedData.length === 0) {
      setSharedWithMeLists([]);
      return;
    }

    const listIds = sharedData.map(s => s.vibe_list_id);

    const { data: listsData } = await supabase
      .from('vibe_lists')
      .select('*, users:user_id(full_name)')
      .in('id', listIds)
      .order('created_at', { ascending: false });

    if (!listsData) {
      setSharedWithMeLists([]);
      return;
    }

    // Batch fetch all counts using RPC function
    const statsMap = await fetchListStats(listIds);

    const listsWithCounts = listsData.map(list => ({
      ...list,
      itemCount: statsMap.get(list.id)?.itemCount || 0,
      viewCount: statsMap.get(list.id)?.viewCount || 0,
      followerCount: statsMap.get(list.id)?.followerCount || 0
    }));

    setSharedWithMeLists(listsWithCounts);
  };

  const loadFollowedLists = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('vibe_list_followers')
      .select('vibe_list_id')
      .eq('follower_user_id', profile.id);

    setFollowedLists(data?.map(f => f.vibe_list_id) || []);
  };

  const createList = async () => {
    if (!profile || !newList.name) {
      toast.error('Please enter a list name');
      return;
    }

    const { data, error } = await supabase
      .from('vibe_lists')
      .insert({
        user_id: profile.id,
        name: newList.name,
        description: newList.description,
        mood_tags: newList.mood_tags,
        visibility: newList.visibility
      })
      .select()
      .single();

    if (error) {
      console.error('Create list error:', error);
      toast.error(error.message || 'Failed to create list');
      return;
    }

    toast.success('List created!');
    setCreateDialogOpen(false);
    setNewList({ name: "", description: "", mood_tags: [], visibility: "private" });
    loadLists();
  };

  const deleteList = async (listId: string) => {
    await supabase.from('vibe_lists').delete().eq('id', listId);
    toast.success('List deleted');
    setSelectedList(null);
    setDeleteListDialogOpen(false);
    setListToDelete(null);
    loadLists();
  };

  const confirmDeleteList = (listId: string) => {
    setListToDelete(listId);
    setDeleteListDialogOpen(true);
  };

  const openEditDialog = (list: any) => {
    setEditingList(list);
    setNewList({
      name: list.name,
      description: list.description || "",
      mood_tags: list.mood_tags || [],
      visibility: list.visibility || "private"
    });
    setEditDialogOpen(true);
  };

  const updateList = async () => {
    if (!profile || !editingList || !newList.name) {
      toast.error('Please enter a list name');
      return;
    }

    const { error } = await supabase
      .from('vibe_lists')
      .update({
        name: newList.name,
        description: newList.description,
        mood_tags: newList.mood_tags,
        visibility: newList.visibility
      })
      .eq('id', editingList.id);

    if (error) {
      console.error('Update list error:', error);
      toast.error(error.message || 'Failed to update list');
      return;
    }

    toast.success('List updated!');
    setEditDialogOpen(false);
    setEditingList(null);
    setNewList({ name: "", description: "", mood_tags: [], visibility: "private" });
    loadLists();

    if (selectedList?.id === editingList.id) {
      setSelectedList({ ...selectedList, ...newList });
    }
  };

  const toggleMoodTag = (tag: string) => {
    setNewList(prev => ({
      ...prev,
      mood_tags: prev.mood_tags.includes(tag)
        ? prev.mood_tags.filter(t => t !== tag)
        : [...prev.mood_tags, tag]
    }));
  };

  const handleTitleClick = (title: any) => {
    setSelectedTitle(title);
    setDetailsOpen(true);
  };

  const removeTitleFromList = async (titleId: string) => {
    if (!selectedList) return;

    try {
      const { error } = await supabase
        .from('vibe_list_items')
        .delete()
        .eq('vibe_list_id', selectedList.id)
        .eq('title_id', titleId);

      if (error) throw error;

      toast.success('Title removed from list');
      loadListTitles(selectedList.id);
      loadLists();
      setRemoveTitleDialogOpen(false);
      setTitleToRemove(null);
    } catch (error) {
      console.error('Remove title error:', error);
      toast.error('Failed to remove title');
    }
  };

  const confirmRemoveTitle = (titleId: string) => {
    setTitleToRemove(titleId);
    setRemoveTitleDialogOpen(true);
  };

  const toggleFollowList = async (listId: string) => {
    if (!profile) return;

    try {
      if (followedLists.includes(listId)) {
        const { error } = await supabase
          .from('vibe_list_followers')
          .delete()
          .eq('vibe_list_id', listId)
          .eq('follower_user_id', profile.id);

        if (error) throw error;
        setFollowedLists(prev => prev.filter(id => id !== listId));
        toast.success('Unfollowed list');
      } else {
        const { error } = await supabase
          .from('vibe_list_followers')
          .insert({
            vibe_list_id: listId,
            follower_user_id: profile.id
          });

        if (error) throw error;
        setFollowedLists(prev => [...prev, listId]);
        toast.success('Following list');
      }
    } catch (error) {
      console.error('Toggle follow error:', error);
      toast.error('Failed to update follow status');
    }
  };

  const isOwnList = selectedList?.user_id === profile?.id;

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mt-4 sm:mt-6 mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">ViiBList</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Create personalized playlists of your favorite movies and TV shows. Share them with friends and family, or keep them private.
            Organize your picks by mood, genre, or any theme you like - perfect for movie nights, recommendations, or tracking what to watch next.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Create List
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-lists">My Lists</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
        </TabsList>

        <TabsContent value="my-lists" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] gap-4 md:gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground px-2">My Lists</h3>
                {lists.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    <List className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No lists yet</p>
                  </Card>
                ) : (
                  lists.map((list) => (
                    <Card
                      key={list.id}
                      className={`p-4 transition-colors ${
                        selectedList?.id === list.id ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedList(list)}>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{list.name}</h3>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {list.itemCount} {list.itemCount === 1 ? 'title' : 'titles'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {list.visibility === 'public' && <Globe className="w-3 h-3 text-muted-foreground" />}
                            {list.visibility === 'trusted_circle' && <Users className="w-3 h-3 text-muted-foreground" />}
                            <span className="text-xs text-muted-foreground capitalize">{list.visibility}</span>
                          </div>
                          {(list.visibility === 'public' || list.visibility === 'link_share') && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>👁️ {list.viewCount || 0}</span>
                              <span>👥 {list.followerCount || 0}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedList(list);
                              setAddTitlesOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          {list.visibility === 'public' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedList(list);
                                setShareDialogOpen(true);
                              }}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          )}
                          {list.visibility === 'trusted_circle' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedList(list);
                                setTrustedCircleOpen(true);
                              }}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(list);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteList(list.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {list.mood_tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {sharedWithMeLists.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground px-2">Shared With Me</h3>
                  {sharedWithMeLists.map((list) => (
                    <Card
                      key={list.id}
                      className={`p-4 transition-colors ${
                        selectedList?.id === list.id ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedList(list)}>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{list.name}</h3>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {list.itemCount} {list.itemCount === 1 ? 'title' : 'titles'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">by {list.users?.full_name || 'Unknown'}</p>
                          {(list.visibility === 'public' || list.visibility === 'link_share') && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>👁️ {list.viewCount || 0}</span>
                              <span>👥 {list.followerCount || 0}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {list.mood_tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              {selectedList ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {listTitles.map((title) => (
                      <div key={title.external_id} className="relative group">
                        <TitleCard
                          title={title}
                          onClick={() => handleTitleClick(title)}
                          isInWatchlist={userWatchlist.has(title.external_id)}
                          actions={{
                            onWatchlist: () => addToWatchlist(title.external_id),
                            onWatched: () => openRatingDialog({ id: title.external_id, title: title.title }),
                          }}
                        />
                        {isOwnList && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmRemoveTitle(title.external_id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {listTitles.length === 0 && (
                      <Card className="p-6 col-span-full text-center text-muted-foreground">
                        <p>No titles in this list yet</p>
                        {isOwnList && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => setAddTitlesOpen(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Titles
                          </Button>
                        )}
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <Card className="p-12 text-center text-muted-foreground">
                  <p>Select a list to view its contents</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="discover" className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Public ViiBLists</h3>
            {publicLists.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No public lists to discover yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {publicLists.map((list) => (
                  <Card key={list.id} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold">{list.name}</h4>
                        <p className="text-sm text-muted-foreground">by {list.users?.full_name || 'Unknown'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>📺 {list.itemCount} titles</span>
                          <span>👁️ {list.viewCount} views</span>
                          <span>👥 {list.followerCount} followers</span>
                        </div>
                      </div>
                      {list.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{list.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {list.mood_tags?.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedList(list);
                            setActiveTab("my-lists");
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant={followedLists.includes(list.id) ? "secondary" : "default"}
                          onClick={() => toggleFollowList(list.id)}
                        >
                          {followedLists.includes(list.id) ? 'Following' : 'Follow'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create List Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Vibe List</DialogTitle>
            <DialogDescription>Set the name, description, mood tags and access level.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newList.name}
                onChange={(e) => setNewList(prev => ({ ...prev, name: e.target.value }))}
                placeholder="After Work Comfort Shows"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={newList.description}
                onChange={(e) => setNewList(prev => ({ ...prev, description: e.target.value }))}
                placeholder="My go-to shows for unwinding..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mood Tags</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {MOOD_OPTIONS.map(mood => (
                  <Badge
                    key={mood}
                    variant={newList.mood_tags.includes(mood) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleMoodTag(mood)}
                  >
                    {mood}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select
                value={newList.visibility}
                onValueChange={(value) => setNewList(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="trusted_circle">Trusted Circle</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createList} className="w-full">
              Create List
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vibe List</DialogTitle>
            <DialogDescription>Update the list name and who can access it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newList.name}
                onChange={(e) => setNewList(prev => ({ ...prev, name: e.target.value }))}
                placeholder="After Work Comfort Shows"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={newList.description}
                onChange={(e) => setNewList(prev => ({ ...prev, description: e.target.value }))}
                placeholder="My go-to shows for unwinding..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mood Tags</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {MOOD_OPTIONS.map(mood => (
                  <Badge
                    key={mood}
                    variant={newList.mood_tags.includes(mood) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleMoodTag(mood)}
                  >
                    {mood}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select
                value={newList.visibility}
                onValueChange={(value) => setNewList(prev => ({ ...prev, visibility: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="trusted_circle">Trusted Circle</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={updateList} className="w-full">
              Update List
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TitleDetailsModal
        title={selectedTitle}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <AddTitlesToListDialog
        open={addTitlesOpen}
        onOpenChange={setAddTitlesOpen}
        listId={selectedList?.id || ''}
        onTitlesAdded={() => {
          if (selectedList) {
            loadListTitles(selectedList.id);
            loadLists();
          }
        }}
      />

      <ManageTrustedCircleDialog
        open={trustedCircleOpen}
        onOpenChange={setTrustedCircleOpen}
        listId={selectedList?.id || ''}
      />

      <ShareListDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        listId={selectedList?.id || ''}
        listName={selectedList?.name || ''}
      />

      {/* Delete List Confirmation */}
      <AlertDialog open={deleteListDialogOpen} onOpenChange={setDeleteListDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this list? This will permanently remove the list and all its contents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => listToDelete && deleteList(listToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Title Confirmation */}
      <AlertDialog open={removeTitleDialogOpen} onOpenChange={setRemoveTitleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Title?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this title from the list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => titleToRemove && removeTitleFromList(titleToRemove)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        titleName={titleToRate?.title || ''}
        onRate={handleRating}
      />
    </div>
  );
}
