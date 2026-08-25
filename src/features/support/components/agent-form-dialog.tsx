"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { SupportAgent } from "@/types/support";
import { supportAgentSchema, type SupportAgentFormValues } from "../schemas/support-agent.schema";
import { createAgent, updateAgent } from "../services/support-api";

export interface AgentFormDialogProps {
  agent?: SupportAgent;
  trigger: ReactNode;
}

function toFormValues(agent?: SupportAgent): SupportAgentFormValues {
  return {
    full_name: agent?.full_name ?? "",
    email: agent?.email ?? "",
    phone: agent?.phone ?? "",
    role: agent?.role ?? "AGENT",
  };
}

// One dialog for both "Tambah Agen" and "Ubah Agen" — the roster this
// feeds (support_agents) is a standalone staff directory, not a `users`
// login, so there's no separate account-creation step to worry about.
export function AgentFormDialog({ agent, trigger }: AgentFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportAgentFormValues>({
    resolver: zodResolver(supportAgentSchema),
    defaultValues: toFormValues(agent),
  });

  async function onSubmit(values: SupportAgentFormValues) {
    setServerError(null);
    try {
      if (agent) {
        await updateAgent(agent.id, values);
      } else {
        await createAgent(values);
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan agen.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset(toFormValues(agent));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{agent ? "Ubah Agen" : "Tambah Agen"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="agent-name">Nama Lengkap</Label>
            <Input id="agent-name" className="h-11" aria-invalid={!!errors.full_name} {...register("full_name")} />
            {errors.full_name ? <p className="text-sm text-destructive">{errors.full_name.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-email">Email</Label>
            <Input
              id="agent-email"
              type="email"
              className="h-11"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-phone">Nomor HP (opsional)</Label>
            <Input id="agent-phone" className="h-11" aria-invalid={!!errors.phone} {...register("phone")} />
            {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-role">Peran</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="agent-role" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENT">Agen</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 flex-1">
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
