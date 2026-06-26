-- Adds database-backed prototype users and role assignments.
-- Do not execute this migration unless explicitly requested.

CREATE TYPE "UserRole" AS ENUM (
  'Admin',
  'OemUser',
  'DealerUser',
  'Reviewer'
);

CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role "UserRole" NOT NULL,
  dealer_id UUID REFERENCES dealers(id),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX app_users_role_is_active_idx ON app_users(role, is_active);
CREATE INDEX app_users_dealer_id_idx ON app_users(dealer_id);

WITH seeded_users AS (
  SELECT
    'admin'::text AS username,
    'Admin User'::text AS display_name,
    'Admin'::"UserRole" AS role,
    NULL::uuid AS dealer_id,
    'Feqma$ecure'::text AS plain_password
  UNION ALL
  SELECT
    'oem',
    'OEM User',
    'OemUser'::"UserRole",
    NULL::uuid,
    'Password123'
  UNION ALL
  SELECT
    'reviewer',
    'Review Specialist',
    'Reviewer'::"UserRole",
    NULL::uuid,
    'Password123'
  UNION ALL
  SELECT
    'dealer_' || lower(replace(code, '-', '_')),
    name || ' Dealer User',
    'DealerUser'::"UserRole",
    id,
    'Password123'
  FROM dealers
),
salted_users AS (
  SELECT
    username,
    display_name,
    role,
    dealer_id,
    'voc:user:' || username AS salt,
    plain_password
  FROM seeded_users
)
INSERT INTO app_users (username, display_name, role, dealer_id, password_hash, is_active)
SELECT
  username,
  display_name,
  role,
  dealer_id,
  'sha256:' || salt || ':' || encode(digest(salt || ':' || plain_password, 'sha256'), 'hex'),
  true
FROM salted_users
ON CONFLICT (username) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  dealer_id = EXCLUDED.dealer_id,
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  updated_at = now();
