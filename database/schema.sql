-- SmartTable Full Database Schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  business_number TEXT,
  owner_name TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT NOT NULL,
  address TEXT,
  contract_number TEXT,
  technical_contact TEXT,
  notes_internal TEXT,
  max_tables INTEGER DEFAULT 20,
  status TEXT DEFAULT 'setup' CHECK (status IN ('active','inactive','setup','suspended')),
  promo_active BOOLEAN DEFAULT FALSE,
  promo_expires_at TIMESTAMPTZ,
  billing_day INTEGER DEFAULT 1,
  billing_amount DECIMAL(10,2) DEFAULT 0,
  billing_currency TEXT DEFAULT 'ILS',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','manager','waiter')),
  full_name TEXT NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT,
  pin TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE restaurant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'luxury' CHECK (theme IN ('luxury','premium','classic')),
  primary_color TEXT DEFAULT '#C9A84C',
  secondary_color TEXT DEFAULT '#1A1A1A',
  font_family TEXT DEFAULT 'Playfair Display',
  logo_url TEXT,
  default_language TEXT DEFAULT 'he',
  escalation_green_minutes INTEGER DEFAULT 2,
  escalation_orange_minutes INTEGER DEFAULT 4,
  escalation_alert_minutes INTEGER DEFAULT 5,
  operating_hours JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  qr_token TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  is_open BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMPTZ,
  guest_device_id TEXT,
  scratch_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('wine','dessert','drinks','food','other')),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image_url TEXT,
  pdf_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users(id),
  manager_name TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_busy_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shift_waiters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  waiter_id UUID REFERENCES users(id),
  waiter_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id),
  table_id UUID REFERENCES restaurant_tables(id),
  table_number INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('water','bill','waiter','wine_menu','dessert_menu','special','gift','adhoc')),
  special_note TEXT,
  gift_id UUID REFERENCES gifts(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal','urgent','manual_urgent')),
  assigned_waiter_id UUID REFERENCES users(id),
  assigned_waiter_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  response_seconds INTEGER
);

CREATE TABLE task_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_name TEXT,
  actor_role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE billing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','waived','promo')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id),
  actor_id UUID REFERENCES users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_restaurant ON tasks(restaurant_id);
CREATE INDEX idx_tasks_status ON tasks(restaurant_id, status);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX idx_tasks_table ON tasks(table_id);
CREATE INDEX idx_task_logs_task ON task_logs(task_id);
CREATE INDEX idx_task_logs_restaurant ON task_logs(restaurant_id);
CREATE INDEX idx_billing_restaurant ON billing_records(restaurant_id);
CREATE INDEX idx_tables_restaurant ON restaurant_tables(restaurant_id);
CREATE INDEX idx_tables_qr ON restaurant_tables(qr_token);
CREATE INDEX idx_users_restaurant ON users(restaurant_id);

-- RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_qr_read_tables" ON restaurant_tables FOR SELECT USING (true);
CREATE POLICY "public_read_settings" ON restaurant_settings FOR SELECT USING (true);
CREATE POLICY "public_read_gifts" ON gifts FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_menu" ON menu_items FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "service_role_all" ON tasks FOR ALL USING (true);
CREATE POLICY "service_role_users" ON users FOR ALL USING (true);
CREATE POLICY "service_role_billing" ON billing_records FOR ALL USING (true);
CREATE POLICY "service_role_logs" ON task_logs FOR ALL USING (true);
CREATE POLICY "service_role_activity" ON activity_logs FOR ALL USING (true);
CREATE POLICY "service_role_shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "service_role_shift_waiters" ON shift_waiters FOR ALL USING (true);
CREATE POLICY "service_role_restaurants_write" ON restaurants FOR ALL USING (true);
CREATE POLICY "service_role_settings_write" ON restaurant_settings FOR ALL USING (true);
CREATE POLICY "service_role_tables_write" ON restaurant_tables FOR ALL USING (true);
CREATE POLICY "service_role_gifts_write" ON gifts FOR ALL USING (true);
CREATE POLICY "service_role_menu_write" ON menu_items FOR ALL USING (true);
