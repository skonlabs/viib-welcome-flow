import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TitleDetailsModalProps {
  title: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TitleDetailsModal({ title, open, onOpenChange }: TitleDetailsModalProps) {
  if (!title) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {title.poster_url && (
            <img 
              src={title.poster_url} 
              alt={title.title}
              className="w-full max-w-sm mx-auto rounded-lg"
            />
          )}
          <div className="space-y-2">
            <p className="text-sm"><strong>Type:</strong> {title.type === 'movie' ? 'Movie' : 'Series'}</p>
            {title.year && <p className="text-sm"><strong>Year:</strong> {title.year}</p>}
            {title.overview && <p className="text-sm"><strong>Overview:</strong> {title.overview}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
