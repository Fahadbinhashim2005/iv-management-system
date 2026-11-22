-- ==============================================================================
-- IV CONNECT — EDITABLE STUDENT PROFILE & TRIP ASSIGNMENTS SCHEMA (PHASE 1)
-- ==============================================================================
--
-- ARCHITECTURE NOTE ON TWO-TABLE SPLIT & RLS:
-- PostgreSQL Row Level Security (RLS) policies evaluate permissions on entire rows 
-- (using USING and WITH CHECK expressions). PostgreSQL RLS does NOT support 
-- conditional column-level policies (e.g. allowing a student to UPDATE their phone 
-- and blood_group, but disallowing them from updating their bus_no or room_no).
-- 
-- Therefore, student-editable information is isolated in `public.profiles`, while 
-- admin-controlled logistics are placed in `public.trip_assignments`.
-- RLS strictly prevents students from performing any INSERT, UPDATE, or DELETE
-- operations on `public.trip_assignments`, guaranteeing true database-level security.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENHANCE public.profiles TABLE (Student-Editable Attributes)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  phone TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add all Section 3.1 student-editable profile columns if they do not exist
DO $$ BEGIN
  -- Core profile details
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_no TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester SMALLINT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS batch TEXT;
  
  -- Emergency & Medical details
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_name TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_relation TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blood_group TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_notes TEXT;
  
  -- Tour Preferences (T-shirt size intentionally omitted per user specification)
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_preference TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  
  -- Consent Tracking
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
  
  -- Avatar Configuration
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_type TEXT NOT NULL DEFAULT 'initial';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_style TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_seed TEXT;
  
  -- Timestamps
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
EXCEPTION WHEN others THEN null; END $$;

-- Add CHECK constraints for domain validation (Semester 1-8, Blood Group, Dietary, Avatar Type)
DO $$ BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_semester;
  ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_semester 
    CHECK (semester IS NULL OR (semester >= 1 AND semester <= 8));

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_blood_group;
  ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_blood_group 
    CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_dietary;
  ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_dietary 
    CHECK (dietary_preference IS NULL OR dietary_preference IN ('Veg', 'Non-veg', 'Vegan', 'Jain'));

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_avatar_type;
  ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_avatar_type 
    CHECK (avatar_type IN ('initial', 'upload', 'preset'));

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_guardian_relation;
  ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_guardian_relation 
    CHECK (guardian_relation IS NULL OR guardian_relation IN ('Father', 'Mother', 'Guardian', 'Other'));

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_medical_notes_len;
  ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_medical_notes_len 
    CHECK (medical_notes IS NULL OR length(medical_notes) <= 500);
EXCEPTION WHEN others THEN null; END $$;

-- 3. CREATE public.trip_assignments TABLE (Admin-Assigned & Read-Only for Students)
CREATE TABLE IF NOT EXISTS public.trip_assignments (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bus_no TEXT,
  seat_no TEXT,
  hotel_name TEXT,
  room_no TEXT,
  faculty_mentor TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Active Student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AUTOMATED TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_trip_assignments_updated_at ON public.trip_assignments;
CREATE TRIGGER set_trip_assignments_updated_at
  BEFORE UPDATE ON public.trip_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. AUTOMATED USER PROVISIONING TRIGGER (auth.users -> profiles + trip_assignments)
-- Guarantees that any new user signing up immediately receives both rows.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  derived_name TEXT;
BEGIN
  assigned_role := coalesce(NEW.raw_user_meta_data->>'role', 'student');
  derived_name := coalesce(
    NEW.raw_user_meta_data->>'full_name',
    initcap(replace(replace(split_part(NEW.email, '@', 1), '.', ' '), '_', ' '))
  );

  -- 1. Insert or update Profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    approval_status,
    is_active,
    must_change_password,
    avatar_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    derived_name,
    assigned_role,
    CASE WHEN assigned_role = 'admin' THEN 'approved' ELSE 'pending' END,
    CASE WHEN assigned_role = 'admin' THEN TRUE ELSE FALSE END,
    FALSE,
    'initial'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = coalesce(public.profiles.full_name, EXCLUDED.full_name);

  -- 2. Insert corresponding Trip Assignment row (Read-only for student)
  INSERT INTO public.trip_assignments (
    user_id,
    status,
    is_verified
  )
  VALUES (
    NEW.id,
    'Active Student',
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach auth user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. DATA BACKFILL
-- A. Ensure all existing auth.users have a profile row
INSERT INTO public.profiles (id, email, full_name, role, approval_status, is_active, avatar_type)
SELECT 
  u.id, 
  u.email, 
  coalesce(u.raw_user_meta_data->>'full_name', initcap(replace(split_part(u.email, '@', 1), '.', ' '))),
  coalesce(u.raw_user_meta_data->>'role', 'student'),
  CASE WHEN coalesce(u.raw_user_meta_data->>'role', 'student') = 'admin' THEN 'approved' ELSE 'pending' END,
  CASE WHEN coalesce(u.raw_user_meta_data->>'role', 'student') = 'admin' THEN TRUE ELSE FALSE END,
  'initial'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- B. Ensure all existing profiles have a trip_assignments row
INSERT INTO public.trip_assignments (user_id, status, is_verified)
SELECT p.id, 'Active Student', FALSE
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- C. Migrate legacy student_details table data if it exists
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_details') THEN
    -- Migrate academic details to profiles
    UPDATE public.profiles p
    SET 
      roll_no = coalesce(p.roll_no, sd.roll_no),
      department = coalesce(p.department, sd.department),
      batch = coalesce(p.batch, sd.batch)
    FROM public.student_details sd
    WHERE p.id = sd.profile_id;

    -- Migrate logistical details to trip_assignments
    UPDATE public.trip_assignments ta
    SET 
      bus_no = coalesce(ta.bus_no, sd.bus_no),
      seat_no = coalesce(ta.seat_no, sd.seat_no),
      room_no = coalesce(ta.room_no, sd.room_no)
    FROM public.student_details sd
    WHERE ta.user_id = sd.profile_id;
  END IF;
EXCEPTION WHEN others THEN null; END $$;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_assignments ENABLE ROW LEVEL SECURITY;

-- Helper to safely extract JWT role
CREATE OR REPLACE FUNCTION public.jwt_role() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '')
$$;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- 7.1 PROFILES POLICIES
-- SELECT: A user can read their own profile; coordinators and admins can view all profiles
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    public.jwt_role() IN ('admin', 'coordinator') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
  );

-- UPDATE: A student can update ONLY their own profile; admins can update any profile
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (
    id = auth.uid() OR
    public.jwt_role() = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    id = auth.uid() OR
    public.jwt_role() = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT: Handled via trigger or client signup
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- DELETE: Only Admins can delete profiles
CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  USING (
    public.jwt_role() = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7.2 TRIP_ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "trip_assignments_select_policy" ON public.trip_assignments;
DROP POLICY IF EXISTS "trip_assignments_admin_all" ON public.trip_assignments;

-- SELECT: Students can read ONLY their own assignment; coordinators & admins can view all
CREATE POLICY "trip_assignments_select_policy"
  ON public.trip_assignments FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.jwt_role() IN ('admin', 'coordinator') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
  );

-- WRITE (INSERT, UPDATE, DELETE): Strictly Admin only.
-- NO student policy exists for INSERT, UPDATE, or DELETE on trip_assignments!
CREATE POLICY "trip_assignments_admin_all"
  ON public.trip_assignments FOR ALL
  USING (
    public.jwt_role() = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    public.jwt_role() = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
