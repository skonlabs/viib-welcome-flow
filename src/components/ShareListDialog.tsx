import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { errorLogger } from "@/lib/services/ErrorLoggerService";
import { Copy, Share2 } from "lucide-react";
import { useState } from "react";

interface ShareListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
}

export function ShareListDialog({ open, onOpenChange, listId, listName }: ShareListDialogProps) {
  const [shareLink] = useState(`${window.location.origin}/list/${listId}`);

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listName,
          text: `Check out my ${listName} list on ViiB`,
          url: shareLink,
        });
      } catch (error) {
        await errorLogger.log(error, {
          operation: 'native_share',
          listId,
          listName
        });
      }
    } else {
      copyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Share List</DialogTitle>
          <DialogDescription className="text-sm">
            Share "{listName}" with friends
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={shareLink}
              readOnly
              className="flex-1"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={copyLink}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <Button
            className="w-full"
            onClick={shareNative}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
