import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Heart, ThumbsUp, ThumbsDown } from "lucide-react";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleName: string;
  onRate: (rating: 'love_it' | 'like_it' | 'dislike_it') => void;
}

export function RatingDialog({ open, onOpenChange, titleName, onRate }: RatingDialogProps) {
  const handleRate = (rating: 'love_it' | 'like_it' | 'dislike_it') => {
    onRate(rating);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Rate "{titleName}"</AlertDialogTitle>
          <AlertDialogDescription>
            How did you like it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-400"
            onClick={() => handleRate('love_it')}
          >
            <Heart className="w-5 h-5 text-green-500" />
            <span>Love It</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400"
            onClick={() => handleRate('like_it')}
          >
            <ThumbsUp className="w-5 h-5 text-blue-500" />
            <span>Like It</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400"
            onClick={() => handleRate('dislike_it')}
          >
            <ThumbsDown className="w-5 h-5 text-red-500" />
            <span>Did Not Like</span>
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
