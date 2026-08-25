import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { Notification, NotificationType } from "@/types/notification";

export interface CreateNotificationInput {
  recipient_role: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  entity?: string | null;
  entity_id?: string | null;
}

// The one place every notification-producing flow writes through — see
// notification.service.ts's notifySuperAdmin() for the actual call sites
// (top-up requests, Midtrans failures, reconciliation issues, complaints).
export async function createNotification(
  input: CreateNotificationInput,
  db: Queryable = pool,
): Promise<Notification> {
  const result = await db.query<Notification>(
    `INSERT INTO notifications (recipient_role, type, title, body, entity, entity_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.recipient_role,
      input.type,
      input.title,
      input.body ?? null,
      input.entity ?? null,
      input.entity_id ?? null,
    ],
  );
  return result.rows[0];
}

// The bell's badge count — deliberately its own tiny, index-only query
// (recipient_role, is_read are both in notifications_recipient_idx) so
// polling it on an interval stays cheap; the full list below is only
// fetched when the panel is actually opened.
export async function countUnreadNotifications(recipientRole: string, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM notifications WHERE recipient_role = $1 AND is_read = false`,
    [recipientRole],
  );
  return Number(result.rows[0].count);
}

export async function listNotifications(
  recipientRole: string,
  limit = 20,
  db: Queryable = pool,
): Promise<Notification[]> {
  const result = await db.query<Notification>(
    `SELECT * FROM notifications WHERE recipient_role = $1 ORDER BY created_at DESC LIMIT $2`,
    [recipientRole, limit],
  );
  return result.rows;
}

export async function markNotificationRead(id: string, db: Queryable = pool): Promise<Notification | null> {
  const result = await db.query<Notification>(
    `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function markAllNotificationsRead(recipientRole: string, db: Queryable = pool): Promise<number> {
  const result = await db.query(
    `UPDATE notifications SET is_read = true WHERE recipient_role = $1 AND is_read = false`,
    [recipientRole],
  );
  return result.rowCount ?? 0;
}
