-- Singleton settings row (same shape as support_settings) controlling
-- whether commission payout runs on its own each month or waits for an
-- explicit Super Admin action. last_auto_run_month ('YYYY-MM') is how the
-- monthly job (src/jobs/monthly-commission-payout.ts) avoids running twice
-- in the same month without needing a separate scheduling table.
CREATE TABLE commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_payout_enabled boolean NOT NULL DEFAULT false,
  payout_day_of_month smallint NOT NULL DEFAULT 1 CHECK (payout_day_of_month BETWEEN 1 AND 28),
  last_auto_run_month text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

INSERT INTO commission_settings (auto_payout_enabled) VALUES (false);

CREATE TRIGGER trg_commission_settings_updated_at
BEFORE UPDATE ON commission_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
