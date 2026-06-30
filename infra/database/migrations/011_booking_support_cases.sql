CREATE TABLE IF NOT EXISTS booking_support_cases (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  communication_event_id TEXT NOT NULL REFERENCES booking_communication_events(id),
  reporter_user_id TEXT NOT NULL REFERENCES users(id),
  reporter_role TEXT NOT NULL CHECK (reporter_role IN ('customer', 'provider')),
  reason_code TEXT NOT NULL CHECK (reason_code IN ('support_request', 'unsafe_message', 'arrival_issue', 'payment_issue')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
  resolution_note TEXT,
  resolved_by_user_id TEXT REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_support_cases_status_created
  ON booking_support_cases (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_support_cases_booking
  ON booking_support_cases (booking_id, created_at DESC);
