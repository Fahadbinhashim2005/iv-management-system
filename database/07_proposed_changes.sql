-- ==============================================================================
-- IV CONNECT — PROPOSED DATABASE CHANGES (DO NOT AUTO-APPLY WITHOUT REVIEW)
-- ==============================================================================
-- 1. Safe RPC to expose approved coordinator & chief faculty helpline numbers
--    to authenticated participants without exposing student PII in profiles.
-- 2. Idempotent RLS policies for visit_days & itinerary_items so coordinators
--    can update the shared itinerary and students can read it.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TRIP HELPLINES RPC (Faculty, Chief Faculty / Admin, Student Coordinators)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_trip_helplines() CASCADE;

CREATE OR REPLACE FUNCTION public.get_trip_helplines()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  role TEXT,
  coordinator_type TEXT,
  department TEXT,
  phone TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.role::text AS role,
    coalesce(p.coordinator_type, 'faculty') AS coordinator_type,
    p.department,
    p.phone
  FROM public.profiles p
  WHERE p.approval_status = 'approved'
    AND coalesce(p.is_active, TRUE) = TRUE
    AND p.role::text IN ('admin', 'coordinator')
  ORDER BY
    CASE
      WHEN p.role::text = 'admin' THEN 1
      WHEN coalesce(p.coordinator_type, 'faculty') = 'faculty' THEN 2
      ELSE 3
    END,
    p.full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_trip_helplines() TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. SHARED ITINERARY TABLES & RLS (visit_days, itinerary_items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visit_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.industrial_visits(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  UNIQUE(visit_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES public.visit_days(id) ON DELETE CASCADE,
  sequence_no INT NOT NULL,
  scheduled_time TEXT NOT NULL,
  activity_title TEXT NOT NULL,
  venue TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'Industry',
  officer_in_charge TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visit_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS visit_days_select_authenticated ON public.visit_days;
CREATE POLICY visit_days_select_authenticated
  ON public.visit_days
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS visit_days_staff_write ON public.visit_days;
CREATE POLICY visit_days_staff_write
  ON public.visit_days
  FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'coordinator'))
  WITH CHECK (public.current_user_role() IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS itinerary_items_select_authenticated ON public.itinerary_items;
CREATE POLICY itinerary_items_select_authenticated
  ON public.itinerary_items
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS itinerary_items_staff_write ON public.itinerary_items;
CREATE POLICY itinerary_items_staff_write
  ON public.itinerary_items
  FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'coordinator'))
  WITH CHECK (public.current_user_role() IN ('admin', 'coordinator'));
