-- Notifications for the Super Admin bell icon — a generic, typed feed of
-- events other roles/flows already produce (a Mitra's top-up request, a
-- self-service Midtrans payment failing, a reconciliation mismatch, a
-- Mitra complaint) rather than a table per event type. Recipients are
-- scoped by role, not by individual user, since there is typically one
-- operationally-active Super Admin account — is_read is a shared flag,
-- not per-user, matching that reality rather than over-modeling it.
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role text NOT NULL CHECK (recipient_role IN ('SUPER_ADMIN', 'BUMDES_ADMIN', 'KONTER', 'AFFILIATE')),
  type text NOT NULL CHECK (type IN (
    'MITRA_TOPUP_REQUESTED', 'MITRA_COMPLAINT', 'RECONCILIATION_ISSUE', 'MIDTRANS_TOPUP_FAILED'
  )),
  title text NOT NULL,
  body text,
  entity text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Serves both the unread-count poll and the on-open list fetch — both
-- filter by recipient_role (+ is_read for the count) and sort by
-- created_at DESC.
CREATE INDEX notifications_recipient_idx ON notifications (recipient_role, is_read, created_at DESC);

-- A Mitra's complaint to Super Admin — its own table (not just a
-- notification body) so there's a real record to eventually build a
-- resolution workflow against, the same way reconciliation_records
-- backs the Rekonsiliasi menu.
CREATE TABLE mitra_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bumdes_id uuid NOT NULL REFERENCES bumdes(id),
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text
);

CREATE INDEX mitra_complaints_bumdes_idx ON mitra_complaints (bumdes_id, created_at DESC);
