import { apiFetch } from "@/lib/api/client";

export interface MyDeviceLimit {
  currentLimit: number;
  isCustom: boolean;
  options: number[];
}

export function getMyDeviceLimit(): Promise<MyDeviceLimit> {
  return apiFetch<MyDeviceLimit>("/api/account/device-limit");
}

export function setMyDeviceLimit(maxActiveDevices: number): Promise<MyDeviceLimit> {
  return apiFetch<MyDeviceLimit>("/api/account/device-limit", {
    method: "PATCH",
    body: JSON.stringify({ maxActiveDevices }),
  });
}
