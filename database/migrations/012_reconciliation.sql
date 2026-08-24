-- Reconciliation compares local transaction state against what Digiflazz
-- reports. transaction_id is nullable because PROVIDER_ONLY mismatches, by
-- definition, have no matching local transaction to point to.

CREATE TABLE reconciliation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id),
  provider_reference text,
  local_status text,
  provider_status text,
  local_amount numeric(18, 0),
  provider_amount numeric(18, 0),
  category text NOT NULL CHECK (category IN ('MATCH', 'STATUS_MISMATCH', 'AMOUNT_MISMATCH', 'LOCAL_ONLY', 'PROVIDER_ONLY', 'NEED_REVIEW')),
  checked_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text
);
