"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { resolveReconciliationRecord } from "../services/reconciliation-api";

export function ReconciliationResolveDialog({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (note.trim().length < 3) {
      setError("Catatan minimal 3 karakter");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await resolveReconciliationRecord(recordId, note);
      setOpen(false);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyelesaikan catatan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9">
          Selesaikan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selesaikan Catatan Rekonsiliasi</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {error ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="reconciliation-note">Catatan Penyelesaian</Label>
            <Input
              id="reconciliation-note"
              className="h-11"
              placeholder="Contoh: Sudah dikonfirmasi manual ke Digiflazz, dana sudah masuk"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-3 sm:justify-stretch">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="h-11 flex-1">
            {isSubmitting ? "Menyimpan..." : "Selesaikan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
