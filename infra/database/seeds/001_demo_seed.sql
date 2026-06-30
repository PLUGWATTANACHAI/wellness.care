INSERT INTO users (id, role, name, phone, email, phone_verified) VALUES
  ('usr_customer_001', 'customer', 'พี่ปลั๊ก ปภาวิน', '08X-XXX-XXXX', 'plug@example.com', TRUE),
  ('usr_provider_001', 'provider', 'นิดา สุขสบาย', '08X-XXX-1111', 'nida@example.com', TRUE),
  ('usr_admin_001', 'safety_manager', 'มินท์ Ops', NULL, 'mint.ops@example.com', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_profiles (user_id, tier, coins, points) VALUES
  ('usr_customer_001', 'Gold', 2450, 860)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO provider_profiles (user_id, rating, completed_jobs, online_status, verified_at) VALUES
  ('usr_provider_001', 4.90, 428, 'online', now())
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO addresses (id, customer_id, condo_name, meeting_point, note, lat, lng) VALUES
  ('addr_river_001', 'usr_customer_001', 'The River Residence, Bangkok', 'Lobby A', 'รอที่โซฟาหน้า concierge', 13.7214000, 100.5131000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_categories (id, name, active) VALUES
  ('cat_massage', 'Massage', TRUE),
  ('cat_beauty', 'Beauty & Relax', TRUE),
  ('cat_products', 'Wellness Products', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, category_id, name, duration_minutes, price_thb, active) VALUES
  ('svc_massage_90', 'cat_massage', 'นวดคอ บ่า ไหล่ 90 นาที', 90, 1290, TRUE),
  ('svc_beauty_90', 'cat_beauty', 'สปาเท้า + ทำเล็บ 90 นาที', 90, 1590, TRUE),
  ('svc_product_sleep', 'cat_products', 'Aroma Sleep Set พร้อมจัดส่ง', 0, 690, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (id, code, customer_id, provider_id, service_id, address_id, status, scheduled_at, total_thb) VALUES
  ('book_240618', '#WN-240618', 'usr_customer_001', 'usr_provider_001', 'svc_massage_90', 'addr_river_001', 'payment_confirmed', '2026-06-19T19:30:00+07:00', 1405)
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_status_events (id, booking_id, status, actor_user_id) VALUES
  ('bse_001', 'book_240618', 'payment_confirmed', 'usr_customer_001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO consent_records (id, user_id, consent_type, document_version, source_screen) VALUES
  ('consent_001', 'usr_customer_001', 'privacy_notice', 'v1.0', 'checkout'),
  ('consent_002', 'usr_provider_001', 'location_sharing', 'provider_location_v1.0', 'provider_accept_job')
ON CONFLICT (id) DO NOTHING;
