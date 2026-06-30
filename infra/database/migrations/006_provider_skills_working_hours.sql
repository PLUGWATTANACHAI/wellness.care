CREATE TABLE IF NOT EXISTS provider_service_skills (
  provider_id TEXT NOT NULL REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, service_id)
);

CREATE TABLE IF NOT EXISTS provider_working_hours (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES users(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_working_hours_provider_day
  ON provider_working_hours (provider_id, day_of_week)
  WHERE active = TRUE;

INSERT INTO provider_service_skills (provider_id, service_id, active) VALUES
  ('usr_provider_001', 'svc_massage_90', TRUE),
  ('usr_provider_001', 'svc_beauty_90', TRUE)
ON CONFLICT (provider_id, service_id)
DO UPDATE SET active = EXCLUDED.active;

INSERT INTO provider_working_hours (id, provider_id, day_of_week, start_time, end_time, active) VALUES
  ('pwh_nida_mon', 'usr_provider_001', 1, '08:00', '22:00', TRUE),
  ('pwh_nida_tue', 'usr_provider_001', 2, '08:00', '22:00', TRUE),
  ('pwh_nida_wed', 'usr_provider_001', 3, '08:00', '22:00', TRUE),
  ('pwh_nida_thu', 'usr_provider_001', 4, '08:00', '22:00', TRUE),
  ('pwh_nida_fri', 'usr_provider_001', 5, '08:00', '22:00', TRUE),
  ('pwh_nida_sat', 'usr_provider_001', 6, '08:00', '22:00', TRUE),
  ('pwh_nida_sun', 'usr_provider_001', 7, '08:00', '22:00', TRUE)
ON CONFLICT (id) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  active = EXCLUDED.active;
