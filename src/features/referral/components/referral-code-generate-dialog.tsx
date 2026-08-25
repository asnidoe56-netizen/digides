"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { generateReferralCode, searchUsers, type UserSearchResult } from "../services/referral-api";

// No self-service "buat kode saya sendiri" flow exists yet (AFFILIATE/
// BUMDes dashboards aren't built) — a Super Admin generates a code on a
// user's behalf here, the only real way a referral_codes row can be
// created today. One code per user; re-generating for the same user just
// returns their existing code (see referral.service.ts).
export function ReferralCodeGenerateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [customCode, setCustomCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchUsers(query.trim())
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, selected]);

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setCustomCode("");
    setError(null);
  }

  async function handleSubmit() {
    if (!selected) {
      setError("Pilih pengguna terlebih dahulu");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await generateReferralCode({ userId: selected.id, customCode });
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat kode referral.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" className="h-11">
          Buat Kode Referral
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Kode Referral</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {error ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="referral-user-search">Pengguna</Label>
            {selected ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selected.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Ganti
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="referral-user-search"
                  className="h-11"
                  placeholder="Cari nama atau email..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {results.length > 0 ? (
                  <ul className="max-h-48 overflow-y-auto rounded-md border">
                    {results.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-accent"
                          onClick={() => {
                            setSelected(user);
                            setResults([]);
                          }}
                        >
                          <span className="text-sm font-medium">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="referral-custom-code">Kode Kustom (opsional)</Label>
            <Input
              id="referral-custom-code"
              className="h-11"
              placeholder="Kosongkan untuk membuat kode acak"
              value={customCode}
              onChange={(event) => setCustomCode(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-3 sm:justify-stretch">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="h-11 flex-1">
            {isSubmitting ? "Membuat..." : "Buat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
