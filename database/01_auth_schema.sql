-- ==============================================================================
-- IV CONNECT — AUTHENTICATION & AUTHORIZATION SCHEMA (RLS SECURED)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USER ROLE ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'coordinator', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. PROFILES TABLE (Mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  phone TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade existing profiles table if it already existed
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
EXCEPTION WHEN others THEN null; END $$;

-- Admin accounts are approved by default
UPDATE public.profiles SET approval_status = 'approved', is_active = TRUE WHERE role = 'admin';

-- 4. STUDENT DETAILS TABLE
CREATE TABLE IF NOT EXISTS public.student_details (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  roll_no TEXT UNIQUE NOT NULL,
  department TEXT,
  batch TEXT,
  bus_no TEXT,
  seat_no TEXT,
  room_no TEXT
);

-- 5. COORDINATOR DETAILS TABLE
CREATE TABLE IF NOT EXISTS public.coordinator_details (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  department TEXT,
  designation TEXT
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  actor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. JWT ROLE EXTRACTOR HELPER
CREATE OR REPLACE FUNCTION public.jwt_role() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

-- 8. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGN-UP
-- When any student or coordinator signs up, automatically create their pending profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    approval_status, 
    is_active, 
    must_change_password
  )
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')::user_role,
    CASE WHEN coalesce(new.raw_user_meta_data->>'role', 'student') = 'admin' THEN 'approved' ELSE 'pending' END,
    CASE WHEN coalesce(new.raw_user_meta_data->>'role', 'student') = 'admin' THEN true ELSE false END,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_details ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE IF EXISTS public.industrial_visits     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.visit_coordinators     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.visit_days             ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.itinerary_items        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.visit_enrollments      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.vehicles               ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.transport_allocations  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.accommodations         ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.room_allocations       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.attendance_sessions    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.attendance_records     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.announcements          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.audit_logs             ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN null; END $$;

-- Drop existing policies for clean idempotency
DROP POLICY IF EXISTS "own profile" ON public.profiles;
DROP POLICY IF EXISTS "staff read profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin write profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow users to insert their profile" ON public.profiles;
DROP POLICY IF EXISTS "allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "admin update all profiles" ON public.profiles;

-- RLS POLICIES FOR PROFILES
-- Anyone can see their own profile
CREATE POLICY "own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Staff & Admin can view all profiles (including pending requests)
CREATE POLICY "staff read profiles"
  ON public.profiles FOR SELECT
  USING (
    public.jwt_role() IN ('coordinator', 'admin') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow new sign-ups to insert their pending profile
CREATE POLICY "allow users to insert their profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "allow users to update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Allow Admins to manage and approve any profile
CREATE POLICY "admin write profiles"
  ON public.profiles FOR ALL
  USING (
    public.jwt_role() = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    public.jwt_role() = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Details tables
DROP POLICY IF EXISTS "student reads own" ON public.student_details;
DROP POLICY IF EXISTS "staff read students" ON public.student_details;
DROP POLICY IF EXISTS "admin manages students" ON public.student_details;
DROP POLICY IF EXISTS "allow insert student details" ON public.student_details;

CREATE POLICY "student reads own" ON public.student_details FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "staff read students" ON public.student_details FOR SELECT USING (true);
CREATE POLICY "allow insert student details" ON public.student_details FOR INSERT WITH CHECK (true);
CREATE POLICY "admin manages students" ON public.student_details FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "coordinator reads own" ON public.coordinator_details;
DROP POLICY IF EXISTS "staff read coordinators" ON public.coordinator_details;
DROP POLICY IF EXISTS "admin manages coordinators" ON public.coordinator_details;
DROP POLICY IF EXISTS "allow insert coordinator details" ON public.coordinator_details;

CREATE POLICY "coordinator reads own" ON public.coordinator_details FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "staff read coordinators" ON public.coordinator_details FOR SELECT USING (true);
CREATE POLICY "allow insert coordinator details" ON public.coordinator_details FOR INSERT WITH CHECK (true);
CREATE POLICY "admin manages coordinators" ON public.coordinator_details FOR ALL USING (true) WITH CHECK (true);
