-- PRD Digides Toko §9 Tahap 2: the store entity itself. A store is owned
-- by exactly one users.id (the warung's operator) and goes through the
-- same DRAFT -> SUBMITTED -> ACTIVE -> SUSPENDED/CLOSED lifecycle the PRD
-- specifies in §4 — SUBMITTED means "registration form completed, waiting
-- for verification", ACTIVE means "verified, wallet usable for real
-- payments". registerStore (store.service.ts) inserts directly as
-- SUBMITTED for now (there is no draft-saving UI yet — Tahap 4); DRAFT
-- stays a valid status for when that UI exists, it's just unreachable
-- through today's single-step registration call.
--
-- One store per owner_user_id is a deliberate MVP simplification, not a
-- permanent business rule: the target merchant (§1) is a single warung
-- owner running one shop, and keeping it 1:1 avoids "which of this
-- owner's stores" ambiguity in every future call site before there's any
-- real need to support more. Relax the unique index later if multi-store
-- owners become a real request.
--
-- Address reuses the wilayah reference table from migration 039, the same
-- way users' registration address does (migration 040) — same four
-- cascading levels, same FK targets.
--
-- store_settings (mentioned in the PRD's migration table) is deliberately
-- NOT created here: nothing in Tahap 2/3's scope needs a concrete setting
-- yet, and a table with no real columns would be speculative schema.
-- Add it in whichever later migration first needs an actual setting.
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'ACTIVE', 'SUSPENDED', 'CLOSED')),
  province_code varchar(13) REFERENCES wilayah(kode),
  regency_code varchar(13) REFERENCES wilayah(kode),
  district_code varchar(13) REFERENCES wilayah(kode),
  village_code varchar(13) REFERENCES wilayah(kode),
  address_detail text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_stores_updated_at
BEFORE UPDATE ON stores
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
