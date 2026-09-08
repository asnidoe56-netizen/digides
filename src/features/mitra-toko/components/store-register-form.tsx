"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Store as StoreIcon } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { registerStore } from "../services/toko-api";

export interface StoreRegisterFormProps {
  onCancel: () => void;
  onRegistered: () => void;
}

// Only the store's name is required — the address fields the API accepts
// are optional there too, and asking a warung owner for four cascading
// dropdowns before they've seen the feature work is the fastest way to
// lose them. Address can be completed later from the store profile.
export function StoreRegisterForm({ onCancel, onRegistered }: StoreRegisterFormProps) {
  const [name, setName] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await registerStore({
        name: trimmedName,
        addressDetail: addressDetail.trim() || undefined,
      });
      onRegistered();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal mendaftarkan toko, silakan coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-50"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold">Buka Toko</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4 py-6">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <StoreIcon className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Nama toko akan dilihat pembeli saat mereka memindai QR pembayaran Anda.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="store-name" className="text-sm font-medium">
            Nama Toko <span className="text-red-600">*</span>
          </label>
          <input
            id="store-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Contoh: Warung Bu Sri"
            className="rounded-xl border px-3 py-2.5 outline-none focus:border-red-600"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="store-address" className="text-sm font-medium">
            Alamat <span className="font-normal text-muted-foreground">(opsional)</span>
          </label>
          <textarea
            id="store-address"
            value={addressDetail}
            onChange={(event) => setAddressDetail(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Contoh: Jl. Melati No. 12, RT 03 / RW 05"
            className="rounded-xl border px-3 py-2.5 outline-none focus:border-red-600"
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-status-failed px-3 py-2.5 text-sm text-status-failed-foreground">{error}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Dengan membuka toko, Anda setuju saldo toko hanya dipakai untuk berbelanja di dalam Digides.
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting ? "Mendaftarkan..." : "Daftarkan Toko"}
          </button>
        </div>
      </form>
    </div>
  );
}
