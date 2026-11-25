-- ==============================================================================
-- IV CONNECT — BROADCAST UPDATES, INSTRUCTIONS & GOOGLE MAPS LOCATIONS
-- ==============================================================================
-- Idempotent migration extending public.announcements with instructions,
-- Google Maps location metadata, sound alert flag, and RLS policies.
-- ==============================================================================

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS location_url TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS play_sound BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS author_name TEXT;

CREATE INDEX IF NOT EXISTS idx_announcements_pinned_created
  ON public.announcements (is_pinned DESC, created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_select_authenticated ON public.announcements;
CREATE POLICY announcements_select_authenticated
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    visit_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.industrial_visits iv
      WHERE iv.id = announcements.visit_id AND iv.lead_coordinator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visit_coordinators vc
      WHERE vc.visit_id = announcements.visit_id AND vc.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visit_enrollments ve
      WHERE ve.visit_id = announcements.visit_id
        AND ve.student_id = auth.uid()
        AND ve.status::text = 'approved'
    )
  );
