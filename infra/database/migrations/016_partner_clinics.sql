CREATE TABLE IF NOT EXISTS partner_clinics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  partner_status TEXT NOT NULL DEFAULT 'active' CHECK (partner_status IN ('active', 'paused', 'draft')),
  category TEXT NOT NULL,
  area_label TEXT NOT NULL,
  address_text TEXT NOT NULL,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  phone TEXT,
  headline TEXT,
  description TEXT,
  promotion_title TEXT,
  promotion_body TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_clinic_services (
  clinic_id TEXT NOT NULL REFERENCES partner_clinics(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  display_name TEXT NOT NULL,
  display_price_thb INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, service_id)
);

CREATE TABLE IF NOT EXISTS partner_clinic_slots (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES partner_clinics(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  starts_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS partner_clinic_id TEXT REFERENCES partner_clinics(id),
  ADD COLUMN IF NOT EXISTS booking_channel TEXT NOT NULL DEFAULT 'home_service'
    CHECK (booking_channel IN ('home_service', 'partner_clinic'));

CREATE INDEX IF NOT EXISTS idx_partner_clinics_active_area
  ON partner_clinics (active, area_label);

CREATE INDEX IF NOT EXISTS idx_partner_clinic_slots_clinic_time
  ON partner_clinic_slots (clinic_id, starts_at)
  WHERE active = TRUE;

INSERT INTO partner_clinics (
  id,
  name,
  slug,
  category,
  area_label,
  address_text,
  lat,
  lng,
  headline,
  description,
  promotion_title,
  promotion_body,
  active
) VALUES
  (
    'clinic_sathorn_wellness',
    'Sathorn Wellness Clinic',
    'sathorn-wellness-clinic',
    'Recovery clinic',
    'Sathorn · 1.8 km',
    'Empire Tower, Sathorn',
    13.7209000,
    100.5307000,
    'Aroma recovery และ office stretch หลังเลิกงาน',
    'เหมาะกับลูกค้าที่ต้องการเข้าคลินิกพาร์ทเนอร์ใกล้ออฟฟิศหรือคอนโด',
    'After-work recovery',
    'รับส่วนลดเปิดตัวสำหรับรอบ 18:00-21:00 ในวันธรรมดา',
    TRUE
  ),
  (
    'clinic_langsuan_recovery',
    'Langsuan Recovery Studio',
    'langsuan-recovery-studio',
    'Recovery studio',
    'Langsuan · 2.4 km',
    'Langsuan Village, Chidlom',
    13.7419000,
    100.5422000,
    'Therapy room และ wellness kit สำหรับการฟื้นฟู',
    'เหมาะกับแพ็กเกจดูแลตัวเองที่ต้องใช้ห้องบริการของคลินิก',
    'Studio care bundle',
    'จอง service bundle พร้อม wellness kit ได้ในรอบเดียว',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  area_label = EXCLUDED.area_label,
  address_text = EXCLUDED.address_text,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  headline = EXCLUDED.headline,
  description = EXCLUDED.description,
  promotion_title = EXCLUDED.promotion_title,
  promotion_body = EXCLUDED.promotion_body,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO partner_clinic_services (
  clinic_id,
  service_id,
  display_name,
  display_price_thb,
  duration_minutes,
  active
) VALUES
  ('clinic_sathorn_wellness', 'svc_beauty_90', 'Aroma Recovery Session', 1590, 90, TRUE),
  ('clinic_sathorn_wellness', 'svc_massage_90', 'Neck & Shoulder Recovery', 1290, 90, TRUE),
  ('clinic_langsuan_recovery', 'svc_product_sleep', 'Wellness Kit Consultation', 690, 0, TRUE),
  ('clinic_langsuan_recovery', 'svc_beauty_90', 'Recovery Studio Session', 1590, 90, TRUE)
ON CONFLICT (clinic_id, service_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_price_thb = EXCLUDED.display_price_thb,
  duration_minutes = EXCLUDED.duration_minutes,
  active = EXCLUDED.active;

INSERT INTO partner_clinic_slots (
  id,
  clinic_id,
  service_id,
  starts_at,
  capacity,
  booked_count,
  active
) VALUES
  ('slot_sathorn_evening_1', 'clinic_sathorn_wellness', 'svc_beauty_90', now() + interval '1 day' + interval '18 hours', 2, 0, TRUE),
  ('slot_sathorn_evening_2', 'clinic_sathorn_wellness', 'svc_massage_90', now() + interval '2 days' + interval '19 hours', 2, 0, TRUE),
  ('slot_langsuan_morning_1', 'clinic_langsuan_recovery', 'svc_product_sleep', now() + interval '1 day' + interval '10 hours', 3, 0, TRUE),
  ('slot_langsuan_evening_1', 'clinic_langsuan_recovery', 'svc_beauty_90', now() + interval '2 days' + interval '18 hours', 2, 0, TRUE)
ON CONFLICT (id) DO UPDATE SET
  starts_at = EXCLUDED.starts_at,
  capacity = EXCLUDED.capacity,
  booked_count = EXCLUDED.booked_count,
  active = EXCLUDED.active;
