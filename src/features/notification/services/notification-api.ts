import { apiFetch } from "@/lib/api/client";
import type { Notification } from "@/types/notification";

export function getUnreadCount(signal?: AbortSignal) {
  return apiFetch<{ count: number }>("/api/notifications/unread-count", { signal });
}

export function getNotifications(signal?: AbortSignal) {
  return apiFetch<{ notifications: Notification[] }>("/api/notifications", { signal });
}

export function markNotificationRead(id: string) {
  return apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiFetch<{ count: number }>("/api/notifications/read-all", { method: "PATCH" });
}
