CREATE TABLE users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN (
    'customer',
    'provider',
    'support_agent',
    'safety_manager',
    'finance_admin',
    'super_admin'
  )),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  tier TEXT NOT NULL DEFAULT 'Member',
  coins INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE provider_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  rating NUMERIC(3,2),
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  online_status TEXT NOT NULL DEFAULT 'offline',
  verified_at TIMESTAMPTZ
);

CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  condo_name TEXT NOT NULL,
  meeting_point TEXT NOT NULL,
  note TEXT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES service_categories(id),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_thb INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  address_id TEXT NOT NULL REFERENCES addresses(id),
  status TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  total_thb INTEGER NOT NULL,
  location_policy TEXT NOT NULL DEFAULT 'active_booking_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE booking_status_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  status TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consent_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  consent_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  source_screen TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE location_sessions (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  provider_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at TIMESTAMPTZ
);

CREATE TABLE location_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  provider_id TEXT NOT NULL REFERENCES users(id),
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  accuracy_meters INTEGER,
  visibility TEXT NOT NULL,
  retention_hours INTEGER NOT NULL DEFAULT 72,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_location_access_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id),
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  target_user_id TEXT NOT NULL REFERENCES users(id),
  access_level TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  reason_note TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  provider TEXT NOT NULL,
  provider_reference TEXT,
  payment_method TEXT NOT NULL DEFAULT 'promptpay',
  amount_thb INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
