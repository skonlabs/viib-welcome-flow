import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { errorLogger } from "@/lib/services/ErrorLoggerService";
import { getPosterUrl } from "@/lib/services/TitleCatalogService";

interface AddTitlesToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  onTitlesAdded: () => void;
}

export function AddTitlesToListDialog({ open, onOpenChange, listId, onTitlesAdded }: AddTitlesToListDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Simplified search - in production would call TMDB API
    searchTimeoutRef.current = setTimeout(() => {
      if (value.length >= 3) {
        setLoading(true);
        // Placeholder - would integrate with TMDB search
        setTimeout(() => {
          setSearchResults([]);
          setLoading(false);
          toast.info("TMDB integration needed for search");
        }, 500);
      } else {
        setSearchResults([]);
      }
    }, 500);
  };

  const addTitle = async (title: any) => {
    if (!user) return;

    try {
      // Verify ownership before adding
      const { data: isOwner } = await supabase.rpc('check_list_ownership', {
        p_list_id: listId,
        p_user_id: user.id
      });

      if (!isOwner) {
        toast.error('You do not have permission to modify this list');
        return;
      }

      const { error } = await supabase
        .from('vibe_list_items')
        .insert({
          vibe_list_id: listId,
          title_id: title.external_id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Title already in list');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Title added to list');
      onTitlesAdded();

      setSearchResults(prev => prev.filter(t => t.external_id !== title.external_id));
    } catch (error) {
      await errorLogger.log(error, {
        operation: 'add_title_to_list',
        listId,
        titleId: title.external_id
      });
      toast.error('Unable to add title. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add Titles to List</DialogTitle>
          <DialogDescription className="text-sm">
            Search and add movies or TV shows to your list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search for movies and TV shows..."
              className="pl-10"
            />
          </div>

          {loading && (
            <p className="text-center text-sm text-muted-foreground">Searching...</p>
          )}

          {searchResults.length === 0 && searchQuery.length >= 3 && !loading && (
            <p className="text-center text-sm text-muted-foreground">
              No results found. TMDB integration required.
            </p>
          )}

          <div className="space-y-2">
            {searchResults.map((title) => (
              <div
                key={title.external_id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                {(title.poster_path || title.poster_url) && (
                  <img
                    src={getPosterUrl(title.poster_path || title.poster_url)}
                    alt={title.title}
                    className="w-12 h-18 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{title.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {title.type === 'movie' ? '🎬 Movie' : '📺 Series'} • {title.year}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => addTitle(title)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
