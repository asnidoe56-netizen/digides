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
import { createCommissionRule, updateCommissionRule } from "../services/commission-api";

const ALL_CATEGORIES = "ALL";

export interface CommissionRuleFormDialogProps {
  categories: Category[];
  rule?: CommissionRule;
  trigger: ReactNode;
}

function toFormValues(rule?: CommissionRule): CommissionRuleFormValues {
  return {
    level: rule ? rule.level : 1,
    percentage: rule ? Number(rule.percentage) : 0,
    minTransaction: rule?.min_transaction != null ? Number(rule.min_transaction) : null,
    minPayout: rule ? Number(rule.min_payout) : 0,
    holdingPeriodDays: rule ? rule.holding_period_days : 0,
    eligibleCategoryId: rule?.eligible_category_id ?? null,
    maxCommission: rule?.max_commission != null ? Number(rule.max_commission) : null,
  };
}

// One dialog for both create and edit — level/percentage/category define
// *when* a commission applies, min_transaction/max_commission bound *how
// much*, min_payout/holding_period_days control *when it can be cashed
// out* (see commission.service.ts's awardCommissionForTransaction and
// settlePendingCommissions for exactly how each field is used).
export function CommissionRuleFormDialog({ categories, rule, trigger }: CommissionRuleFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommissionRuleFormValues>({
    resolver: zodResolver(commissionRuleSchema),
    defaultValues: toFormValues(rule),
  });

  async function onSubmit(values: CommissionRuleFormValues) {
    setServerError(null);
    try {
      if (rule) {
        await updateCommissionRule(rule.id, values, rule.is_active);
      } else {
        await createCommissionRule(values);
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan aturan komisi.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset(toFormValues(rule));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? "Ubah Aturan Komisi" : "Tambah Aturan Komisi"}</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rule-level">Level Referral</Label>
              <Input
                id="rule-level"
                type="number"
                min={1}
                className="h-11"
                aria-invalid={!!errors.level}
                {...register("level", { valueAsNumber: true })}
              />
              {errors.level ? <p className="text-sm text-destructive">{errors.level.message}</p> : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rule-percentage">Persentase (%)</Label>
              <Input
                id="rule-percentage"
                type="number"
                step="0.01"
                min={0}
                max={100}
                className="h-11"
                aria-invalid={!!errors.percentage}
                {...register("percentage", { valueAsNumber: true })}
              />
              {errors.percentage ? <p className="text-sm text-destructive">{errors.percentage.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rule-category">Kategori</Label>
            <Controller
              control={control}
              name="eligibleCategoryId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ALL_CATEGORIES}
                  onValueChange={(value) => field.onChange(value === ALL_CATEGORIES ? null : value)}
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
