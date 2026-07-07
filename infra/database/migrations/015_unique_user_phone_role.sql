CREATE UNIQUE INDEX IF NOT EXISTS idx_users_role_phone_unique
  ON users (role, phone)
  WHERE phone IS NOT NULL;
