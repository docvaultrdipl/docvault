-- Run this once against your database:
--   psql -U your_user -d license_tracker -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Administrator', -- kept for display/legacy; real access control is in `permissions`
  permissions JSONB NOT NULL DEFAULT '{
    "licenses": {"view": true, "add": true, "edit": true, "delete": true},
    "vehicles": {"view": true, "add": true, "edit": true, "delete": true},
    "manage_users": true
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  license_key VARCHAR(150) NOT NULL,
  type VARCHAR(100),
  validity_start DATE,
  validity_end DATE,
  remarks TEXT,
  attachment_path VARCHAR(255),
  attachment_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  category VARCHAR(20) NOT NULL CHECK (category IN ('rc', 'tax', 'od', 'tp', 'pollution')),
  user_name VARCHAR(150) NOT NULL,
  place VARCHAR(150),
  vehicle_type VARCHAR(100),
  vehicle_number VARCHAR(50) NOT NULL,
  validity DATE NOT NULL,
  attachment_path VARCHAR(255),
  attachment_name VARCHAR(255),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category);

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'created' | 'updated' | 'deleted'
  entity_type VARCHAR(20) NOT NULL DEFAULT 'license', -- 'license' | 'vehicle'
  license_id INTEGER,
  license_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Generic key-value app settings (e.g. alert_recipients for the email digest)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

-- Optional: seed a default admin user.
-- Password below is the bcrypt hash of "admin123" (change it before using in production!)
-- Generate your own hash with: node -e "console.log(require('bcrypt').hashSync('yourpassword', 10))"
-- INSERT INTO users (name, email, password_hash, role)
-- VALUES ('Admin User', 'admin@licensetracker.com', '<paste-bcrypt-hash-here>', 'Administrator');
