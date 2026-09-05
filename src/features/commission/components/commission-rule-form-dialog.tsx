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
import type { Category } from "@/types/product";
import type { CommissionRule } from "@/types/commission";
import { commissionRuleSchema, type CommissionRuleFormValues } from "../schemas/commission-rule.schema";
import { saveCommissionRuleForCategory } from "../services/commission-api";

const ALL_CATEGORIES = "ALL";

export interface CommissionRuleFormDialogProps {
  categories: Category[];
  /** This category's existing USER-tier rule, if any — present only when
   *  editing (the trigger came from an existing row), absent for "Tambah
   *  Aturan". */
  userRule?: CommissionRule;
  mitraRule?: CommissionRule;
  trigger: ReactNode;
}

function amountOf(rule?: CommissionRule): number | null {
  if (!rule) return null;
  return Number(rule.commission_type === "FLAT" ? rule.flat_amount : rule.percentage);
}

function toFormValues(userRule?: CommissionRule, mitraRule?: CommissionRule): CommissionRuleFormValues {
  const anyRule = userRule ?? mitraRule;
  return {
    eligibleCategoryId: anyRule?.eligible_category_id ?? null,
    commissionType: anyRule?.commission_type ?? "FLAT",
    userAmount: amountOf(userRule),
    mitraAmount: amountOf(mitraRule),
    minTransaction: anyRule?.min_transaction != null ? Number(anyRule.min_transaction) : null,
    minPayout: anyRule ? Number(anyRule.min_payout) : 0,
    holdingPeriodDays: anyRule ? anyRule.holding_period_days : 0,
    maxCommission: anyRule?.max_commission != null ? Number(anyRule.max_commission) : null,
  };
}

// One dialog, keyed by category — sets how much a category's direct
// downline transaction rewards a USER-tier referrer AND a MITRA-tier
// referrer at once, rather than editing one rule row at a time (see
// commission.service.ts's saveCommissionRuleForCategory). Editing an
// existing category locks the category selector — changing it would
// create a new pair instead of updating this one.
export function CommissionRuleFormDialog({ categories, userRule, mitraRule, trigger }: CommissionRuleFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = !!(userRule || mitraRule);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CommissionRuleFormValues>({
    resolver: zodResolver(commissionRuleSchema),
    defaultValues: toFormValues(userRule, mitraRule),
  });
  const commissionType = watch("commissionType");

  async function onSubmit(values: CommissionRuleFormValues) {
    setServerError(null);
    try {
      await saveCommissionRuleForCategory(values);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan aturan komisi.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset(toFormValues(userRule, mitraRule));
  }

  const amountLabel = commissionType === "FLAT" ? "Nominal (Rupiah)" : "Persentase (%)";
  const amountFieldProps = commissionType === "FLAT" ? { min: 0 } : { min: 0, max: 100, step: "0.01" };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Ubah Aturan Komisi" : "Tambah Aturan Komisi"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-1 flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="rule-category">Kategori</Label>
            <Controller
              control={control}
              name="eligibleCategoryId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ALL_CATEGORIES}
                  onValueChange={(value) => field.onChange(value === ALL_CATEGORIES ? null : value)}
                  disabled={isEditing}
                >
                  <SelectTrigger id="rule-category" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES}>Semua Kategori</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rule-commission-type">Tipe Komisi</Label>
            <Controller
              control={control}
              name="commissionType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="rule-commission-type" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLAT">Nominal Tetap</SelectItem>
                    <SelectItem value="PERCENTAGE">Persentase</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rule-user-amount">{amountLabel} — User Biasa</Label>
              <Input
                id="rule-user-amount"
                type="number"
                {...amountFieldProps}
                className="h-11"
                placeholder="0"
                aria-invalid={!!errors.userAmount}
                {...register("userAmount", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
              />
              {errors.userAmount ? <p className="text-sm text-destructive">{errors.userAmount.message}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rule-mitra-amount">{amountLabel} — Mitra</Label>
              <Input
                id="rule-mitra-amount"
                type="number"
                {...amountFieldProps}
                className="h-11"
                placeholder="0"
                aria-invalid={!!errors.mitraAmount}
                {...register("mitraAmount", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
              />
              {errors.mitraAmount ? <p className="text-sm text-destructive">{errors.mitraAmount.message}</p> : null}
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Kosongkan atau isi 0 pada salah satu kolom jika status itu tidak mendapat komisi untuk kategori ini.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rule-min-transaction">Min. Transaksi (opsional)</Label>
              <Input
                id="rule-min-transaction"
                type="number"
                min={0}
                className="h-11"
                {...register("minTransaction", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rule-max-commission">Maks. Komisi (opsional)</Label>
              <Input
                id="rule-max-commission"
                type="number"
                min={0}
                className="h-11"
                {...register("maxCommission", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rule-min-payout">Min. Payout (Rupiah)</Label>
              <Input
                id="rule-min-payout"
                type="number"
                min={0}
                className="h-11"
                aria-invalid={!!errors.minPayout}
                {...register("minPayout", { valueAsNumber: true })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rule-holding-period">Holding Period (hari)</Label>
              <Input
                id="rule-holding-period"
                type="number"
                min={0}
                className="h-11"
                aria-invalid={!!errors.holdingPeriodDays}
                {...register("holdingPeriodDays", { valueAsNumber: true })}
              />
            </div>
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
