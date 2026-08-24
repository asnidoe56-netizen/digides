"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isConfirming?: boolean;
  /** Use for destructive actions (suspend, delete) — red confirm button. */
  variant?: "default" | "destructive";
}

// One confirmation dialog shared by every "are you sure?" moment in the
// app (suspend/activate/delete a user, and future equivalents) instead of
// each feature building its own — issue M03 section 9 lists ConfirmDialog
// explicitly as a Level 2 shared component.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isConfirming = false,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{description}</p>

        <DialogFooter className="flex-row gap-3 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
            className="h-11 flex-1"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isConfirming}
            className="h-11 flex-1"
          >
            {isConfirming ? "Memproses..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
