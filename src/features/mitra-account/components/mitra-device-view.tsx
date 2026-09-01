"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Laptop, Monitor, Shield, ShieldCheck, Smartphone } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { blockMyDevice, listMyDevices, type MyDevice, type MyDevicesOverview } from "../services/device-api";

export interface MitraDeviceViewProps {
  backHref: string;
  keamananHref: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Android/iOS get a phone icon, everything else (Windows/macOS/Linux/
// unrecognized) gets a monitor icon — the same platform string
// parseUserAgent already writes into user_devices.platform, no separate
// device-type column to introduce.
function DeviceIcon({ platform }: { platform: string }) {
  const isMobile = platform === "Android" || platform === "iOS";
  const Icon = isMobile ? Smartphone : Monitor;
  return <Icon className="size-5" />;
}

function DeviceRow({ device, isCurrent, onBlock, isBlocking }: { device: MyDevice; isCurrent: boolean; onBlock: () => void; isBlocking: boolean }) {
  const isBlocked = device.trust_status === "BLOCKED" || device.trust_status === "REVOKED";

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 ${
        isCurrent ? "border-red-300 bg-red-50/60" : "border-border bg-background"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <DeviceIcon platform={device.platform} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{device.device_name}</p>
          <p className="text-xs text-muted-foreground">
            {device.last_ip ?? "IP tidak tercatat"} · {isMobileLabel(device.platform)}
          </p>
          <p className="text-xs text-muted-foreground">Terdaftar: {formatDate(device.first_seen_at)}</p>
          {isCurrent ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
              <span className="size-1.5 rounded-full bg-red-600" /> Sedang digunakan
            </p>
          ) : isBlocked ? (
            <p className="mt-1 text-xs font-medium text-muted-foreground">Diblokir</p>
          ) : null}
        </div>
        {!isCurrent && !isBlocked ? (
          <button
            type="button"
            onClick={onBlock}
            disabled={isBlocking}
            className="shrink-0 rounded-full border border-destructive/30 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
          >
            {isBlocking ? "Memblokir..." : "Blokir"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function isMobileLabel(platform: string): string {
  return platform === "Android" || platform === "iOS" ? "HP" : "Komputer";
}

// Akun > Perangkat — a mitra's own view of the same user_devices/
// user_sessions rows Super Admin's Security module manages platform-wide
// (see security.service.ts's getMyDevices/blockMyDevice), scoped to just
// this account. "Batas Login Aplikasi" shows the platform's current
// max_devices_per_user policy (Super Admin's Kebijakan Keamanan) —
// read-only here, hence the link to Keamanan rather than an editable
// field on this page.
export function MitraDeviceView({ backHref, keamananHref }: MitraDeviceViewProps) {
  const [overview, setOverview] = useState<MyDevicesOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await listMyDevices();
      setOverview(data);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Gagal memuat data perangkat.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBlock(device: MyDevice) {
    setActionError(null);
    setBlockingId(device.id);
    try {
      await blockMyDevice(device.id);
      await load();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "Gagal memblokir perangkat.");
    } finally {
      setBlockingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <Link
          href={backHref}
          aria-label="Kembali"
          className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <p className="font-semibold">Perangkat Terdaftar</p>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

        {overview ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2 rounded-2xl border p-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Laptop className="size-4" />
                </span>
                <p className="text-2xl font-bold text-red-600">{overview.totalCount}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl border p-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <ShieldCheck className="size-4" />
                </span>
                <p className="text-2xl font-bold text-red-600">{overview.activeCount}</p>
                <p className="text-xs text-muted-foreground">Aktif</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <Shield className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Batas Login Aplikasi</p>
                    <p className="text-xs text-muted-foreground">
                      Maksimal <span className="font-medium text-red-600">{overview.maxDevices}</span> aplikasi dapat
                      login
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-status-success px-2.5 py-1 text-xs font-medium text-status-success-foreground">
                  ✓ {overview.activeCount}/{overview.maxDevices}
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                <p>
                  Batasi jumlah aplikasi yang dapat login untuk keamanan akun Anda. Jika ada pihak tidak bertanggung
                  jawab (scam) mencoba login, mereka tidak akan bisa masuk jika batas sudah tercapai.
                </p>
              </div>
              <Link
                href={keamananHref}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Shield className="size-3.5" /> Ubah di Akun → Keamanan
              </Link>
            </div>

            <p className="text-sm font-medium">Perangkat Anda</p>
            <div className="flex flex-col gap-2">
              {overview.devices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada perangkat terdaftar.</p>
              ) : (
                overview.devices.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    isCurrent={device.id === overview.currentDeviceId}
                    onBlock={() => handleBlock(device)}
                    isBlocking={blockingId === device.id}
                  />
                ))
              )}
            </div>
          </>
        ) : loadError ? null : (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        )}
      </div>
    </div>
  );
}
