CREATE TABLE IF NOT EXISTS booking_provider_offers (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  provider_id TEXT NOT NULL REFERENCES users(id),
  offer_status TEXT NOT NULL CHECK (offer_status IN ('offered', 'accepted', 'rejected', 'expired')),
  rank_position INTEGER NOT NULL,
  assignment_score NUMERIC(6,3) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_provider_offers_active
  ON booking_provider_offers (booking_id, provider_id, expires_at)
  WHERE offer_status = 'offered';

CREATE INDEX IF NOT EXISTS idx_booking_provider_offers_provider
  ON booking_provider_offers (provider_id, created_at DESC);
