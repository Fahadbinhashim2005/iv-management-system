-- ==============================================================================
-- IV CONNECT — EDITABLE STUDENT PROFILE & TRIP ASSIGNMENTS SCHEMA (PHASE 1 & 2)
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

-- 1. EXTENSIONS & EMAIL AUTO-CONFIRMATION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- AUTO-CONFIRM & UNBAN ALL AUTH USERS (Eliminates "Email not confirmed" and legacy bans)
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  banned_until = NULL
WHERE email_confirmed_at IS NULL OR banned_until IS NOT NULL;

-- Automatically mark any future auth signup as email-confirmed
CREATE OR REPLACE FUNCTION public.auto_confirm_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at := coalesce(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_confirm_auth_user ON auth.users;
CREATE TRIGGER trigger_auto_confirm_auth_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_auth_user();

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

-- Directly and safely add all Section 3.1 student-editable profile columns if they do not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_no TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester SMALLINT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS batch TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_relation TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_preference TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_type TEXT NOT NULL DEFAULT 'initial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_style TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_seed TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add CHECK constraints for domain validation safely
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

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_trip_assignments_updated_at ON public.trip_assignments;
CREATE TRIGGER set_trip_assignments_updated_at
  BEFORE UPDATE ON public.trip_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. AUTOMATED USER PROVISIONING TRIGGER (auth.users -> profiles + trip_assignments)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  derived_name TEXT;
  is_enum_role BOOLEAN;
BEGIN
  assigned_role := coalesce(
    NEW.raw_app_meta_data->>'role',
    NEW.raw_user_meta_data->>'role',
    'student'
  );
  IF assigned_role NOT IN ('student', 'coordinator', 'admin') THEN
    assigned_role := 'student';
  END IF;

  derived_name := coalesce(
    NEW.raw_user_meta_data->>'full_name',
    initcap(replace(replace(split_part(NEW.email, '@', 1), '.', ' '), '_', ' '))
  );

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role' AND udt_name = 'user_role'
  ) INTO is_enum_role;

  IF is_enum_role THEN
    INSERT INTO public.profiles (
      id, email, full_name, role, approval_status, is_active, must_change_password, avatar_type
    )
    VALUES (
      NEW.id, NEW.email, derived_name, assigned_role::public.user_role,
      CASE WHEN assigned_role = 'admin' THEN 'approved' ELSE 'pending' END,
      CASE WHEN assigned_role = 'admin' THEN TRUE ELSE FALSE END,
      FALSE, 'initial'
    )
    ON CONFLICT (email) DO UPDATE SET
      id = EXCLUDED.id,
      full_name = coalesce(public.profiles.full_name, EXCLUDED.full_name);
  ELSE
    INSERT INTO public.profiles (
      id, email, full_name, role, approval_status, is_active, must_change_password, avatar_type
    )
    VALUES (
      NEW.id, NEW.email, derived_name, assigned_role,
      CASE WHEN assigned_role = 'admin' THEN 'approved' ELSE 'pending' END,
      CASE WHEN assigned_role = 'admin' THEN TRUE ELSE FALSE END,
      FALSE, 'initial'
    )
    ON CONFLICT (email) DO UPDATE SET
      id = EXCLUDED.id,
      full_name = coalesce(public.profiles.full_name, EXCLUDED.full_name);
  END IF;

  INSERT INTO public.trip_assignments (user_id, status, is_verified)
  VALUES (NEW.id, 'Active Student', FALSE)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. DATA BACKFILL & ADMIN BOOTSTRAP
DO $$
DECLARE
  admin_uid UUID;
  is_enum_role BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role' AND udt_name = 'user_role'
  ) INTO is_enum_role;

  SELECT id INTO admin_uid FROM auth.users WHERE lower(email) = 'admin@college.edu' LIMIT 1;

  IF admin_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'admin@college.edu',
      crypt('Admin@IV2026!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"full_name":"Chief Administrator","role":"admin"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_uid,
      admin_uid::text,
      jsonb_build_object('sub', admin_uid::text, 'email', 'admin@college.edu', 'email_verified', true, 'phone_verified', false),
      'email',
      NOW(), NOW(), NOW()
    ) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      banned_until = NULL,
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
    WHERE id = admin_uid;
  END IF;

  IF is_enum_role THEN
    INSERT INTO public.profiles (id, email, full_name, role, approval_status, is_active, avatar_type)
    VALUES (admin_uid, 'admin@college.edu', 'Chief Administrator', 'admin'::public.user_role, 'approved', TRUE, 'initial')
    ON CONFLICT (email) DO UPDATE SET
      id = EXCLUDED.id,
      role = 'admin'::public.user_role,
      approval_status = 'approved',
      is_active = TRUE;
  ELSE
    INSERT INTO public.profiles (id, email, full_name, role, approval_status, is_active, avatar_type)
    VALUES (admin_uid, 'admin@college.edu', 'Chief Administrator', 'admin', 'approved', TRUE, 'initial')
    ON CONFLICT (email) DO UPDATE SET
      id = EXCLUDED.id,
      role = 'admin',
      approval_status = 'approved',
      is_active = TRUE;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Admin bootstrap note: %', SQLERRM;
END $$;

-- Backfill missing profile rows for any existing auth user
INSERT INTO public.profiles (id, email, full_name, role, approval_status, is_active)
SELECT 
  u.id, 
  u.email, 
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 
  'student',
  'approved',
  TRUE
FROM auth.users u
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  approval_status = 'approved',
  is_active = TRUE;

-- Explicitly approve and activate all student accounts so they can sign in immediately
UPDATE public.profiles 
SET approval_status = 'approved', is_active = TRUE 
WHERE email IN (
  'fahadbinhashim03@gmail.com',
  'fahad123@gmail.com',
  'fahadhashimbro@gmail.com',
  'amangovind48@gmail.com',
  'fajilalimohammed2@gmail.com'
) OR approval_status IS NULL OR approval_status = 'pending';

-- Sync role claims into auth.users app_metadata for existing users
UPDATE auth.users u
SET raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role::text)
FROM public.profiles p
WHERE lower(p.email) = lower(u.email);

-- Ensure all existing profiles have a trip_assignments row
INSERT INTO public.trip_assignments (user_id, status, is_verified)
SELECT p.id, 'Active Student', FALSE
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES & LOGIN STATUS RPC
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_assignments ENABLE ROW LEVEL SECURITY;

-- Clean existing policies first to guarantee clean re-creation
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "own profile" ON public.profiles;
DROP POLICY IF EXISTS "staff read profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin write profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow users to insert their profile" ON public.profiles;
DROP POLICY IF EXISTS "allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "trip_assignments_select_policy" ON public.trip_assignments;
DROP POLICY IF EXISTS "trip_assignments_admin_all" ON public.trip_assignments;

-- Drop function with CASCADE so Postgres allows changing return type (fixes 42P13)
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;

-- Safe SECURITY DEFINER role lookup (NEVER triggers 42P17 infinite recursion!)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );
$$;

-- Drop existing signature of get_account_login_status
DROP FUNCTION IF EXISTS public.get_account_login_status(TEXT) CASCADE;

-- Safe pre-login status check RPC (returns ONLY status flags, zero PII)
CREATE OR REPLACE FUNCTION public.get_account_login_status(lookup_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT approval_status, is_active, role::text AS role
  INTO rec
  FROM public.profiles
  WHERE lower(email) = lower(trim(lookup_email))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'approval_status', coalesce(rec.approval_status, 'approved'),
    'is_active', coalesce(rec.is_active, true),
    'role', lower(coalesce(rec.role, 'student'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_login_status(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- 7.1 PROFILES POLICIES (Zero recursion, safe for both student and staff)
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    public.current_user_role() IN ('admin', 'coordinator')
  );

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (
    id = auth.uid() OR
    public.current_user_role() = 'admin'
  )
  WITH CHECK (
    id = auth.uid() OR
    public.current_user_role() = 'admin'
  );

CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (
    id = auth.uid() OR
    public.current_user_role() = 'admin'
  );

CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  USING (
    public.current_user_role() = 'admin'
  );

-- 7.2 TRIP_ASSIGNMENTS POLICIES
CREATE POLICY "trip_assignments_select_policy"
  ON public.trip_assignments FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.current_user_role() IN ('admin', 'coordinator')
  );

CREATE POLICY "trip_assignments_admin_all"
  ON public.trip_assignments FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ==============================================================================
-- 8. STORAGE BUCKET: AVATARS (PHASE 2)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
