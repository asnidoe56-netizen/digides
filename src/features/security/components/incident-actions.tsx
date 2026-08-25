"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { resolveIncidentSchema, type ResolveIncidentFormValues } from "../schemas/incident.schema";
import { setIncidentStatus } from "../services/security-api";

export function InvestigateIncidentButton({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setError(null);
    try {
      await setIncidentStatus(incidentId, "INVESTIGATING");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memperbarui status.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleClick} disabled={isSubmitting}>
        Mulai Investigasi
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ResolveIncidentDialog({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResolveIncidentFormValues>({
    resolver: zodResolver(resolveIncidentSchema),
    defaultValues: { note: "" },
  });

  async function onSubmit(values: ResolveIncidentFormValues) {
    setServerError(null);
    try {
      await setIncidentStatus(incidentId, "RESOLVED", values.note);
      setOpen(false);
      reset({ note: "" });
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyelesaikan insiden.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="h-9">
          Selesaikan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selesaikan Insiden</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="resolution-note">Catatan Penyelesaian</Label>
            <Input
              id="resolution-note"
              className="h-11"
              placeholder="Contoh: Sudah dikonfirmasi ke pengguna, akun dibuka kembali"
              aria-invalid={!!errors.note}
              {...register("note")}
            />
            <p className="text-xs text-muted-foreground">
              Menyelesaikan insiden ini juga otomatis membuka kembali akun/PIN yang terkunci karenanya.
            </p>
            {errors.note ? <p className="text-sm text-destructive">{errors.note.message}</p> : null}
          </div>

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 flex-1">
              {isSubmitting ? "Menyimpan..." : "Selesaikan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DismissIncidentButton({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setIncidentStatus(incidentId, "DISMISSED");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengabaikan insiden.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        Abaikan
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Abaikan Insiden?"
        description="Gunakan jika insiden ini bukan ancaman nyata (mis. false positive). Tidak ada pembukaan kunci akun/PIN otomatis."
        confirmLabel="Abaikan"
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
