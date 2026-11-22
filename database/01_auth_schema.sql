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

-- 6. AUDIT LOGS TABLE (If not already created)
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
-- Reads app_metadata.role from the verified Supabase JWT directly (no DB recursion)
CREATE OR REPLACE FUNCTION public.jwt_role() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

-- 8. ENABLE ROW LEVEL SECURITY ACROSS ALL TABLES
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

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "own profile" ON public.profiles;
DROP POLICY IF EXISTS "staff read profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin write profiles" ON public.profiles;

DROP POLICY IF EXISTS "student reads own" ON public.student_details;
DROP POLICY IF EXISTS "staff read students" ON public.student_details;
DROP POLICY IF EXISTS "coordinator updates seats/rooms" ON public.student_details;
DROP POLICY IF EXISTS "admin manages students" ON public.student_details;

DROP POLICY IF EXISTS "coordinator reads own" ON public.coordinator_details;
DROP POLICY IF EXISTS "staff read coordinators" ON public.coordinator_details;
DROP POLICY IF EXISTS "admin manages coordinators" ON public.coordinator_details;

-- 9. RLS POLICIES FOR AUTH & USER TABLES

-- Profiles
CREATE POLICY "own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "staff read profiles"
  ON public.profiles FOR SELECT
  USING (public.jwt_role() IN ('coordinator', 'admin'));

CREATE POLICY "admin write profiles"
  ON public.profiles FOR ALL
  USING (public.jwt_role() = 'admin')
  WITH CHECK (public.jwt_role() = 'admin');

-- Student details
CREATE POLICY "student reads own"
  ON public.student_details FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "staff read students"
  ON public.student_details FOR SELECT
  USING (public.jwt_role() IN ('coordinator', 'admin'));

CREATE POLICY "coordinator updates seats/rooms"
  ON public.student_details FOR UPDATE
  USING (public.jwt_role() IN ('coordinator', 'admin'))
  WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));

CREATE POLICY "admin manages students"
  ON public.student_details FOR ALL
  USING (public.jwt_role() = 'admin')
  WITH CHECK (public.jwt_role() = 'admin');

-- Coordinator details
CREATE POLICY "coordinator reads own"
  ON public.coordinator_details FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "staff read coordinators"
  ON public.coordinator_details FOR SELECT
  USING (public.jwt_role() IN ('coordinator', 'admin'));

CREATE POLICY "admin manages coordinators"
  ON public.coordinator_details FOR ALL
  USING (public.jwt_role() = 'admin')
  WITH CHECK (public.jwt_role() = 'admin');

-- 10. RLS POLICIES FOR OPERATIONAL DOMAINS

-- Announcements: everyone authenticated can read; coordinator and admin can manage
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
    DROP POLICY IF EXISTS "read announcements" ON public.announcements;
    DROP POLICY IF EXISTS "staff manage announcements" ON public.announcements;

    CREATE POLICY "read announcements"
      ON public.announcements FOR SELECT
      USING (auth.role() = 'authenticated');

    CREATE POLICY "staff manage announcements"
      ON public.announcements FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;
END $$;

-- Industrial visits & itineraries: all authenticated users can view; staff can manage
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'industrial_visits') THEN
    DROP POLICY IF EXISTS "read industrial visits" ON public.industrial_visits;
    DROP POLICY IF EXISTS "staff manage industrial visits" ON public.industrial_visits;

    CREATE POLICY "read industrial visits"
      ON public.industrial_visits FOR SELECT
      USING (auth.role() = 'authenticated');

    CREATE POLICY "staff manage industrial visits"
      ON public.industrial_visits FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visit_days') THEN
    DROP POLICY IF EXISTS "read visit days" ON public.visit_days;
    DROP POLICY IF EXISTS "staff manage visit days" ON public.visit_days;

    CREATE POLICY "read visit days" ON public.visit_days FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "staff manage visit days" ON public.visit_days FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'itinerary_items') THEN
    DROP POLICY IF EXISTS "read itinerary items" ON public.itinerary_items;
    DROP POLICY IF EXISTS "staff manage itinerary items" ON public.itinerary_items;

    CREATE POLICY "read itinerary items" ON public.itinerary_items FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "staff manage itinerary items" ON public.itinerary_items FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;
END $$;

-- Enrollments: students view own enrollment, staff view and manage all
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visit_enrollments') THEN
    DROP POLICY IF EXISTS "student read own enrollment" ON public.visit_enrollments;
    DROP POLICY IF EXISTS "staff manage enrollments" ON public.visit_enrollments;

    CREATE POLICY "student read own enrollment"
      ON public.visit_enrollments FOR SELECT
      USING (student_id = auth.uid());

    CREATE POLICY "staff manage enrollments"
      ON public.visit_enrollments FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;
END $$;

-- Attendance: students read own attendance; staff read and write
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_sessions') THEN
    DROP POLICY IF EXISTS "read attendance sessions" ON public.attendance_sessions;
    DROP POLICY IF EXISTS "staff manage attendance sessions" ON public.attendance_sessions;

    CREATE POLICY "read attendance sessions" ON public.attendance_sessions FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "staff manage attendance sessions" ON public.attendance_sessions FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_records') THEN
    DROP POLICY IF EXISTS "student read own attendance" ON public.attendance_records;
    DROP POLICY IF EXISTS "staff manage attendance records" ON public.attendance_records;

    CREATE POLICY "student read own attendance"
      ON public.attendance_records FOR SELECT
      USING (
        enrollment_id IN (
          SELECT id FROM public.visit_enrollments WHERE student_id = auth.uid()
        )
      );

    CREATE POLICY "staff manage attendance records"
      ON public.attendance_records FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;
END $$;

-- Transport and Accommodation allocations: students view own; staff view and manage
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicles') THEN
    DROP POLICY IF EXISTS "read vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "staff manage vehicles" ON public.vehicles;
    CREATE POLICY "read vehicles" ON public.vehicles FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "staff manage vehicles" ON public.vehicles FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transport_allocations') THEN
    DROP POLICY IF EXISTS "student read own seat" ON public.transport_allocations;
    DROP POLICY IF EXISTS "staff manage transport" ON public.transport_allocations;

    CREATE POLICY "student read own seat"
      ON public.transport_allocations FOR SELECT
      USING (
        enrollment_id IN (
          SELECT id FROM public.visit_enrollments WHERE student_id = auth.uid()
        )
      );

    CREATE POLICY "staff manage transport"
      ON public.transport_allocations FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accommodations') THEN
    DROP POLICY IF EXISTS "read accommodations" ON public.accommodations;
    DROP POLICY IF EXISTS "staff manage accommodations" ON public.accommodations;
    CREATE POLICY "read accommodations" ON public.accommodations FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "staff manage accommodations" ON public.accommodations FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'room_allocations') THEN
    DROP POLICY IF EXISTS "student read own room" ON public.room_allocations;
    DROP POLICY IF EXISTS "staff manage rooms" ON public.room_allocations;

    CREATE POLICY "student read own room"
      ON public.room_allocations FOR SELECT
      USING (
        enrollment_id IN (
          SELECT id FROM public.visit_enrollments WHERE student_id = auth.uid()
        )
      );

    CREATE POLICY "staff manage rooms"
      ON public.room_allocations FOR ALL
      USING (public.jwt_role() IN ('coordinator', 'admin'))
      WITH CHECK (public.jwt_role() IN ('coordinator', 'admin'));
  END IF;
END $$;

-- Audit logs: staff read, admin manages
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    DROP POLICY IF EXISTS "staff read audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "admin write audit logs" ON public.audit_logs;

    CREATE POLICY "staff read audit logs"
      ON public.audit_logs FOR SELECT
      USING (public.jwt_role() IN ('coordinator', 'admin'));

    CREATE POLICY "admin write audit logs"
      ON public.audit_logs FOR ALL
      USING (public.jwt_role() = 'admin')
      WITH CHECK (public.jwt_role() = 'admin');
  END IF;
END $$;
