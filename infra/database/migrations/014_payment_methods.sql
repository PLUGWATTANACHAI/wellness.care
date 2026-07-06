ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'promptpay';

ALTER TABLE payment_webhook_events
ADD COLUMN IF NOT EXISTS payment_method TEXT;
