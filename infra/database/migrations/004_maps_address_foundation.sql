ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS address_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS place_id_refreshed_at TIMESTAMPTZ;

ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS service_radius_meters INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS base_lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS base_lng NUMERIC(10,7);

UPDATE addresses
SET
  google_place_id = COALESCE(google_place_id, 'demo_google_place_the_river_bkk'),
  formatted_address = COALESCE(formatted_address, condo_name),
  address_source = 'google_places_demo',
  place_id_refreshed_at = COALESCE(place_id_refreshed_at, now())
WHERE id = 'addr_river_001';

UPDATE provider_profiles
SET
  service_radius_meters = COALESCE(service_radius_meters, 8000),
  base_lat = COALESCE(base_lat, 13.7214000),
  base_lng = COALESCE(base_lng, 100.5131000)
WHERE user_id = 'usr_provider_001';
