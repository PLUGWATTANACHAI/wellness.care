ALTER TABLE payment_webhook_events
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS amount_thb INTEGER,
  ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_payment_id
  ON payment_webhook_events (payment_id);
