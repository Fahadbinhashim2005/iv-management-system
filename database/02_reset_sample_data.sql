-- ==============================================================================
-- IV CONNECT — SAMPLE DATA TRUNCATION / RESET SCRIPT
-- ==============================================================================

-- Resets application tables while maintaining referential integrity
TRUNCATE TABLE
  public.audit_logs,
  public.attendance_records,
  public.attendance_sessions,
  public.transport_allocations,
  public.room_allocations,
  public.vehicles,
  public.accommodations,
  public.visit_enrollments,
  public.itinerary_items,
  public.visit_days,
  public.visit_coordinators,
  public.industrial_visits,
  public.announcements,
  public.student_details,
  public.coordinator_details,
  public.profiles
RESTART IDENTITY CASCADE;

-- Note: To wipe Supabase Auth users as well, run:
--   npm run seed -- --reset
-- (or node server/scripts/seed.js --reset)
