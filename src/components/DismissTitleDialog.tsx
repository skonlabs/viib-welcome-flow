import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ThumbsDown, Eye, X } from "lucide-react";

interface DismissTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleName: string;
  onNotMyTaste: () => void;
  onSeenIt: () => void;
  onKeepIt: () => void;
}

export function DismissTitleDialog({ 
  open, 
  onOpenChange, 
  titleName, 
  onNotMyTaste, 
  onSeenIt, 
  onKeepIt 
}: DismissTitleDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove "{titleName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            What would you like to do with this recommendation?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400"
            onClick={() => {
              onNotMyTaste();
              onOpenChange(false);
            }}
          >
            <ThumbsDown className="w-5 h-5 text-red-500" />
            <span>Not My Taste</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400"
            onClick={() => {
              onSeenIt();
              onOpenChange(false);
            }}
          >
            <Eye className="w-5 h-5 text-blue-500" />
            <span>Seen It</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-400"
            onClick={() => {
              onKeepIt();
              onOpenChange(false);
            }}
          >
            <X className="w-5 h-5 text-green-500" />
            <span>Keep It</span>
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
