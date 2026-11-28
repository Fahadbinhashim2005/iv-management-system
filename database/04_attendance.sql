-- ==============================================================================
-- IV CONNECT — ATTENDANCE MODULE MIGRATION (PHASE 1)
-- ==============================================================================
-- Idempotent migration for QR-based attendance sessions, secrets, records,
-- and append-only audit trail with Row Level Security (RLS).
-- Adapts to existing tables:
--   - public.industrial_visits(id)
--   - public.profiles(id, role)
--   - public.visit_coordinators(visit_id, faculty_id)
--   - public.visit_enrollments(visit_id, student_id, status)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ATTENDANCE SESSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id         UUID NOT NULL REFERENCES public.industrial_visits(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  purpose          TEXT NOT NULL CHECK (purpose IN (
                     'departure', 'boarding', 'hotel_checkin', 'company_entry', 'headcount', 'custom'
                   )),
  details          TEXT CHECK (char_length(details) <= 1000),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'closed', 'cancelled')),
  starts_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closes_at        TIMESTAMPTZ,
  rotate_seconds   INT NOT NULL DEFAULT 30 CHECK (rotate_seconds BETWEEN 15 AND 120),
  require_location BOOLEAN NOT NULL DEFAULT FALSE,
  geo_lat          DOUBLE PRECISION,
  geo_lng          DOUBLE PRECISION,
  geo_radius_m     INT CHECK (geo_radius_m BETWEEN 20 AND 5000),
  created_by       UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  closed_by        UUID REFERENCES public.profiles(id)
);

-- Upgrade legacy schema.sql attendance_sessions columns safely if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_sessions' AND column_name = 'checkpoint_name'
  ) THEN
    ALTER TABLE public.attendance_sessions ALTER COLUMN checkpoint_name DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_sessions' AND column_name = 'scheduled_time'
  ) THEN
    ALTER TABLE public.attendance_sessions ALTER COLUMN scheduled_time DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'custom';
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS rotate_seconds INT NOT NULL DEFAULT 30;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS require_location BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS geo_radius_m INT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_att_sessions_visit_status
  ON public.attendance_sessions (visit_id, status, created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. SESSION SECRETS (Server-only; NO client-readable RLS policy)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_session_secrets (
  session_id UUID PRIMARY KEY REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  secret     TEXT NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. PRESENT RECORDS (Absent = no row)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method      TEXT NOT NULL CHECK (method IN ('qr', 'manual')),
  marked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marked_by   UUID REFERENCES public.profiles(id),
  via_user_id UUID REFERENCES public.profiles(id),
  note        TEXT CHECK (char_length(note) <= 300),
  client_meta JSONB,
  CONSTRAINT uq_att_record UNIQUE (session_id, student_id)
);

-- Upgrade legacy schema.sql attendance_records columns safely if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'enrollment_id'
  ) THEN
    ALTER TABLE public.attendance_records ALTER COLUMN enrollment_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'qr';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS via_user_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS client_meta JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_att_record_session_student
  ON public.attendance_records (session_id, student_id);

CREATE INDEX IF NOT EXISTS idx_att_records_session_time
  ON public.attendance_records (session_id, marked_at DESC);

-- ------------------------------------------------------------------------------
-- 4. APPEND-ONLY AUDIT TRAIL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_audit_log (
  id         BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id),
  actor_id   UUID REFERENCES public.profiles(id),
  action     TEXT NOT NULL CHECK (action IN (
               'session_created', 'session_updated', 'session_closed', 'session_reopened',
               'session_cancelled', 'qr_mark', 'manual_mark', 'manual_unmark', 'scan_rejected'
             )),
  reason     TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_audit_session
  ON public.attendance_audit_log (session_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (Defense in depth; Node server uses service_role)
-- ------------------------------------------------------------------------------
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_session_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop & recreate policies idempotently
DROP POLICY IF EXISTS att_sessions_select_authenticated ON public.attendance_sessions;
CREATE POLICY att_sessions_select_authenticated
  ON public.attendance_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.industrial_visits iv
      WHERE iv.id = attendance_sessions.visit_id AND iv.lead_coordinator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visit_coordinators vc
      WHERE vc.visit_id = attendance_sessions.visit_id AND vc.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visit_enrollments ve
      WHERE ve.visit_id = attendance_sessions.visit_id
        AND ve.student_id = auth.uid()
        AND ve.status::text = 'approved'
    )
  );

DROP POLICY IF EXISTS att_records_select_student ON public.attendance_records;
CREATE POLICY att_records_select_student
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS att_records_select_staff ON public.attendance_records;
CREATE POLICY att_records_select_staff
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.attendance_sessions s
      JOIN public.industrial_visits iv ON iv.id = s.visit_id
      WHERE s.id = attendance_records.session_id
        AND iv.lead_coordinator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.attendance_sessions s
      JOIN public.visit_coordinators vc ON vc.visit_id = s.visit_id
      WHERE s.id = attendance_records.session_id
        AND vc.faculty_id = auth.uid()
    )
  );

-- attendance_session_secrets: intentionally NO policies (server service_role only)

DROP POLICY IF EXISTS att_audit_select_admin ON public.attendance_audit_log;
CREATE POLICY att_audit_select_admin
  ON public.attendance_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
  );

DROP POLICY IF EXISTS att_audit_select_coordinator_own ON public.attendance_audit_log;
CREATE POLICY att_audit_select_coordinator_own
  ON public.attendance_audit_log
  FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'coordinator'
    )
  );

-- Enable Supabase Realtime on attendance tables for instant Admin/Coordinator updates
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
