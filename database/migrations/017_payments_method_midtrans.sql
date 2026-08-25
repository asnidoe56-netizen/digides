-- Self-service top-up via Midtrans is a new payments.method alongside the
-- existing QRIS/VA/MANUAL — a real gateway-initiated row, created PENDING
-- with gateway_reference = Midtrans's order_id, resolved by the
-- /api/webhooks/midtrans notification handler rather than an admin click.
ALTER TABLE payments DROP CONSTRAINT payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('QRIS', 'VA', 'MANUAL', 'MIDTRANS'));
