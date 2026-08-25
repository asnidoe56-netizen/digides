"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { DeviceTrustStatus } from "@/types/security";
import { setDeviceStatus } from "../services/security-api";

const OPTIONS: Array<{ value: DeviceTrustStatus; label: string }> = [
  { value: "TRUSTED", label: "Trusted" },
  { value: "PENDING", label: "Pending" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "REVOKED", label: "Revoked" },
];

export function DeviceTrustSelect({ deviceId, status }: { deviceId: string; status: DeviceTrustStatus }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    setIsSaving(true);
    setError(null);
    try {
      await setDeviceStatus(deviceId, next as DeviceTrustStatus);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <Select value={status} onValueChange={handleChange} disabled={isSaving}>
        <SelectTrigger className="h-9 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
