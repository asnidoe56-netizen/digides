"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Fingerprint, ShieldCheck, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import type { BiometricCredentialSummary } from "@/types/biometric";
import {
  getBiometricRegistrationOptions,
  listMyBiometricCredentials,
  revokeBiometricCredential,
  submitBiometricRegistration,
} from "../services/biometric-api";

export interface MitraSecurityViewProps {
  backHref: string;
}

function formatDate(value: string | Date | null): string {
  if (!value) return "Belum pernah digunakan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

// Akun > Keamanan's "Biometrik untuk Transaksi" — registers a WebAuthn
// platform authenticator (fingerprint/face) for THIS device, as an
// alternative to typing the transaction PIN at checkout (see
// purchase-pin-screen.tsx's "Gunakan Biometrik"). "Enabled" is simply
// "at least one device below" — there is no separate on/off flag to fall
// out of sync with the actual credential list.
export function MitraSecurityView({ backHref }: MitraSecurityViewProps) {
  const [credentials, setCredentials] = useState<BiometricCredentialSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function loadCredentials() {
    try {
      const { credentials: list } = await listMyBiometricCredentials();
      setCredentials(list);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Gagal memuat data biometrik.");
    }
  }

  useEffect(() => {
    loadCredentials();
  }, []);

  async function handleRegister() {
    setActionError(null);
    setActionMessage(null);
    setIsRegistering(true);
    try {
      const optionsJSON = await getBiometricRegistrationOptions();
      const attestation = await startRegistration({ optionsJSON });
      const { credential } = await submitBiometricRegistration(attestation);
      setCredentials((prev) => [credential, ...(prev ?? [])]);
      setActionMessage(`Perangkat ini (${credential.device_label}) berhasil didaftarkan.`);
    } catch (error) {
      // startRegistration itself throws its own Error (permission denied,
      // no platform authenticator, user cancelled the prompt) — never an
      // ApiError in that case, so this still needs a fallback message.
      setActionError(error instanceof ApiError ? error.message : "Gagal mendaftarkan biometrik perangkat ini.");
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleRevoke(id: string) {
    setActionError(null);
    setActionMessage(null);
    setRevokingId(id);
    try {
      await revokeBiometricCredential(id);
      setCredentials((prev) => (prev ?? []).filter((item) => item.id !== id));
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Gagal menghapus biometrik.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3 rounded-b-3xl bg-gradient-to-br from-red-500 to-red-700 px-4 pt-4 pb-6 text-white sm:rounded-3xl">
        <Link
          href={backHref}
          aria-label="Kembali"
          className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <p className="font-semibold">Keamanan</p>
      </div>

      <div className="flex flex-col gap-4 px-4">
        <div className="flex items-start gap-3 rounded-2xl bg-background p-4 shadow-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Fingerprint className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Biometrik untuk Transaksi</p>
            <p className="text-xs text-muted-foreground">
              Daftarkan sidik jari atau wajah perangkat ini untuk mengonfirmasi transaksi sebagai pengganti PIN. PIN
              tetap bisa dipakai kapan saja.
            </p>
          </div>
        </div>

        {actionError ? (
          <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
            {actionError}
          </p>
        ) : null}
        {actionMessage ? (
          <p role="status" className="rounded-md bg-status-success px-3 py-2 text-sm text-status-success-foreground">
            {actionMessage}
          </p>
        ) : null}

        <Button
          type="button"
          onClick={handleRegister}
          disabled={isRegistering}
          className="h-11 bg-red-600 hover:bg-red-700"
        >
          {isRegistering ? "Menunggu verifikasi..." : "Daftarkan Perangkat Ini"}
        </Button>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Perangkat Terdaftar</p>
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {credentials === null && !loadError ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : null}
          {credentials !== null && credentials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada perangkat biometrik terdaftar.</p>
          ) : null}
          {(credentials ?? []).map((credential) => (
            <div
              key={credential.id}
              className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3 shadow-sm"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <ShieldCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{credential.device_label}</p>
                <p className="text-xs text-muted-foreground">
                  Didaftarkan {formatDate(credential.created_at)} · Terakhir dipakai{" "}
                  {formatDate(credential.last_used_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRevoke(credential.id)}
                disabled={revokingId === credential.id}
                aria-label={`Hapus ${credential.device_label}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
