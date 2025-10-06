import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  itemName?: string;
  requiresTypeToConfirm?: boolean;
  isDeleting?: boolean;
}

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  requiresTypeToConfirm = false,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const canConfirm = requiresTypeToConfirm 
    ? confirmText === itemName 
    : true;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    
    setIsProcessing(true);
    try {
      await onConfirm();
      setConfirmText("");
      onOpenChange(false);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-gray-700">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-error" />
            </div>
            <div>
              <DialogTitle className="text-gray-100">{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <DialogDescription className="text-gray-300">
          {description}
        </DialogDescription>

        {requiresTypeToConfirm && itemName && (
          <div className="space-y-2 pt-4">
            <Label htmlFor="confirmText" className="text-gray-300">
              Type <span className="font-mono text-error">{itemName}</span> to confirm
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={itemName}
              className="bg-card border-gray-600 text-gray-100"
              disabled={isProcessing || isDeleting}
            />
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-gray-600 text-gray-300"
            disabled={isProcessing || isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || isProcessing || isDeleting}
            className="bg-error hover:bg-error/90 text-white"
          >
            {(isProcessing || isDeleting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
