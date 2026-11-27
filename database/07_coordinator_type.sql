-- ==============================================================================
-- Migration 07: Coordinator Type (Faculty Coordinator vs Student Coordinator)
-- ==============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coordinator_type TEXT DEFAULT 'faculty';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_profiles_coordinator_type;

ALTER TABLE public.profiles
  ADD CONSTRAINT check_profiles_coordinator_type
  CHECK (coordinator_type IS NULL OR coordinator_type IN ('faculty', 'student'));
