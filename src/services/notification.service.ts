import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import {
  countUnreadNotifications,
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/repositories/notification.repository";
import type { NotificationType } from "@/types/notification";
import type { RoleCode } from "@/types/user";

// The one call every notification-producing flow makes — wallet-topup
// service (a Mitra's deposit request, a failed Midtrans payment),
// reconciliation.service (a discrepancy needing review), and
// mitra-complaint.service (a Mitra's complaint) all go through here
// rather than inserting into `notifications` directly, so "what makes a
// notification" stays in one place.
export async function notifySuperAdmin(
  type: NotificationType,
  title: string,
  body?: string | null,
  entity?: string | null,
  entityId?: string | null,
  db: Queryable = pool,
): Promise<void> {
  await createNotification(
    { recipient_role: "SUPER_ADMIN", type, title, body, entity, entity_id: entityId },
    db,
  );
}

// recipientRole is the caller's own role — every role in RoleCode is a
// valid notifications.recipient_role (see migration 019_notifications.sql),
// even though only notifySuperAdmin() actually produces any today. A
// BUMDES_ADMIN/KONTER bell legitimately shows zero until a producer flow
// for their role exists, rather than being hardcoded to SUPER_ADMIN's feed.
export async function getUnreadNotificationCount(recipientRole: RoleCode): Promise<number> {
  return countUnreadNotifications(recipientRole);
}

export async function getNotifications(recipientRole: RoleCode) {
  return listNotifications(recipientRole);
}

export async function readNotification(id: string) {
  const notification = await markNotificationRead(id);
  if (!notification) {
    throw new Error("Notifikasi tidak ditemukan");
  }
  return notification;
}

export async function readAllNotifications(recipientRole: RoleCode) {
  return markAllNotificationsRead(recipientRole);
}
