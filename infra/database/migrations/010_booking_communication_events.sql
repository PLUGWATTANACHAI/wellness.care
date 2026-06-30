CREATE TABLE IF NOT EXISTS booking_communication_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('customer_message', 'provider_message', 'admin_note', 'support_note', 'incident_note')),
  visibility TEXT NOT NULL CHECK (visibility IN ('all_parties', 'customer_provider', 'admin_internal')),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_communication_events_booking
  ON booking_communication_events (booking_id, created_at DESC);
