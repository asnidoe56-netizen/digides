import { apiFetch } from "@/lib/api/client";
import type { DeviceTrustStatus } from "@/types/security";

export interface MyDevice {
  id: string;
  device_name: string;
  platform: string;
  browser: string;
  last_ip: string | null;
  trust_status: DeviceTrustStatus;
  first_seen_at: string;
  last_seen_at: string;
}

export interface MyDevicesOverview {
  devices: MyDevice[];
  totalCount: number;
  activeCount: number;
  maxDevices: number;
  currentDeviceId: string | null;
}

export function listMyDevices(): Promise<MyDevicesOverview> {
  return apiFetch<MyDevicesOverview>("/api/account/devices");
}

export function blockMyDevice(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/account/devices/${id}/block`, {
    method: "PATCH",
  });
}
