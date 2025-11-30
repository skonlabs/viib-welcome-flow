import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface TitleCardProps {
  title: {
    external_id?: string;
    title: string;
    type: 'movie' | 'series';
    year?: number | null;
    poster_url?: string | null;
  };
  onClick?: () => void;
}

export function TitleCard({ title, onClick }: TitleCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 group"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={title.poster_url || 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop'}
          alt={title.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-2 right-2">
          <Badge
            variant={title.type === 'movie' ? 'default' : 'secondary'}
            className="font-semibold backdrop-blur-sm shadow-lg text-xs"
          >
            {title.type === 'movie' ? '🎬 Movie' : '📺 Series'}
          </Badge>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold truncate text-sm">{title.title}</h3>
        {title.year && (
          <p className="text-xs text-muted-foreground">{title.year}</p>
        )}
      </div>
    </Card>
  );
}
