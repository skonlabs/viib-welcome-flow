import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface TrailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailerUrl: string | null;
  title: string;
}

export function TrailerDialog({ open, onOpenChange, trailerUrl, title }: TrailerDialogProps) {
  const videoId = trailerUrl && trailerUrl.includes('youtube.com')
    ? new URL(trailerUrl).searchParams.get('v')
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title} - Trailer</DialogTitle>
          <DialogDescription className="sr-only">
            Watch the trailer for {title}
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video">
          {!trailerUrl ? (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">No trailer available</p>
            </div>
          ) : videoId ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={`${title} Trailer`}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">Trailer not available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
