CREATE TABLE IF NOT EXISTS booking_provider_assignments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  provider_id TEXT NOT NULL REFERENCES users(id),
  policy TEXT NOT NULL,
  assignment_score NUMERIC(6,3) NOT NULL,
  distance_meters INTEGER NOT NULL,
  service_radius_meters INTEGER NOT NULL,
  rating NUMERIC(3,2),
  active_job_count INTEGER NOT NULL DEFAULT 0,
  ranked_provider_count INTEGER NOT NULL DEFAULT 1,
  decision_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_provider_assignments_provider
  ON booking_provider_assignments (provider_id, created_at DESC);
