-- Mirror of database/07_itineraries.sql for Supabase CLI migrations
-- ==============================================================================
-- IV CONNECT — ITINERARY SYSTEM SCHEMA, RLS, AUDIT TRIGGERS, STORAGE & REALTIME
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.itineraries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  subtitle         TEXT CHECK (subtitle IS NULL OR char_length(subtitle) <= 160),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL CHECK (end_date >= start_date),
  cover_image_path TEXT,
  cover_alt        TEXT CHECK (cover_alt IS NULL OR char_length(cover_alt) <= 160),
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_itineraries_single_active
  ON public.itineraries (is_active)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id    UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number      INT NOT NULL CHECK (day_number >= 0),
  date            DATE NOT NULL,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  subtitle        TEXT CHECK (subtitle IS NULL OR char_length(subtitle) <= 160),
  hero_image_path TEXT,
  hero_alt        TEXT CHECK (hero_alt IS NULL OR char_length(hero_alt) <= 160),
  hero_blur       TEXT CHECK (hero_blur IS NULL OR octet_length(hero_blur) <= 2048),
  focal_x         INT NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y         INT NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (itinerary_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.itinerary_stops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id    UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_id          UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  sequence_no     INT NOT NULL CHECK (sequence_no >= 0),
  start_time      TIME,
  end_time        TIME,
  time_tbc        BOOLEAN NOT NULL DEFAULT FALSE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  location        TEXT CHECK (location IS NULL OR char_length(location) <= 160),
  category        TEXT NOT NULL DEFAULT 'activity'
                    CHECK (category IN ('travel', 'stay', 'industry', 'activity', 'meal', 'free')),
  description     TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  image_path      TEXT,
  image_alt       TEXT CHECK (image_alt IS NULL OR char_length(image_alt) <= 160),
  lat             DOUBLE PRECISION CHECK (lat IS NULL OR (lat BETWEEN -90 AND 90)),
  lng             DOUBLE PRECISION CHECK (lng IS NULL OR (lng BETWEEN -180 AND 180)),
  is_highlight    BOOLEAN NOT NULL DEFAULT FALSE,
  status_override TEXT CHECK (status_override IS NULL OR status_override IN ('now', 'done', 'skipped', 'delayed')),
  staff_note      TEXT CHECK (staff_note IS NULL OR char_length(staff_note) <= 300),
  updated_by      UUID REFERENCES public.profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_stops_day_seq
  ON public.itinerary_stops (day_id, sequence_no);

CREATE INDEX IF NOT EXISTS idx_itinerary_stops_itinerary
  ON public.itinerary_stops (itinerary_id);

CREATE TABLE IF NOT EXISTS public.bus_locations (
  bus_id       TEXT PRIMARY KEY,
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  lat          DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng          DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  speed_kmh    NUMERIC,
  heading      NUMERIC,
  accuracy_m   NUMERIC,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID NOT NULL REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.itinerary_changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL,
  entity       TEXT NOT NULL CHECK (entity IN ('itinerary', 'day', 'stop')),
  entity_id    UUID NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'publish', 'unpublish', 'shift', 'override')),
  before       JSONB,
  after        JSONB,
  actor        UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_changes_itinerary_created
  ON public.itinerary_changes (itinerary_id, created_at DESC);

DROP VIEW IF EXISTS public.student_itinerary_stops;
CREATE VIEW public.student_itinerary_stops
WITH (security_invoker = true)
AS
SELECT
  id,
  itinerary_id,
  day_id,
  sequence_no,
  start_time,
  end_time,
  time_tbc,
  title,
  location,
  category,
  description,
  image_path,
  image_alt,
  lat,
  lng,
  is_highlight,
  status_override,
  updated_by,
  updated_at
FROM public.itinerary_stops;

GRANT SELECT ON public.student_itinerary_stops TO authenticated;

CREATE OR REPLACE FUNCTION public.itinerary_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_itineraries_updated_at ON public.itineraries;
CREATE TRIGGER trg_itineraries_updated_at
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW EXECUTE FUNCTION public.itinerary_touch_updated_at();

DROP TRIGGER IF EXISTS trg_itinerary_days_updated_at ON public.itinerary_days;
CREATE TRIGGER trg_itinerary_days_updated_at
  BEFORE UPDATE ON public.itinerary_days
  FOR EACH ROW EXECUTE FUNCTION public.itinerary_touch_updated_at();

DROP TRIGGER IF EXISTS trg_itinerary_stops_updated_at ON public.itinerary_stops;
CREATE TRIGGER trg_itinerary_stops_updated_at
  BEFORE UPDATE ON public.itinerary_stops
  FOR EACH ROW EXECUTE FUNCTION public.itinerary_touch_updated_at();

CREATE OR REPLACE FUNCTION public.guard_coordinator_stop_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() = 'coordinator' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.itinerary_id IS DISTINCT FROM OLD.itinerary_id
       OR NEW.day_id IS DISTINCT FROM OLD.day_id
       OR NEW.sequence_no IS DISTINCT FROM OLD.sequence_no
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.location IS DISTINCT FROM OLD.location
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.image_path IS DISTINCT FROM OLD.image_path
       OR NEW.image_alt IS DISTINCT FROM OLD.image_alt
       OR NEW.lat IS DISTINCT FROM OLD.lat
       OR NEW.lng IS DISTINCT FROM OLD.lng
       OR NEW.is_highlight IS DISTINCT FROM OLD.is_highlight
       OR NEW.staff_note IS DISTINCT FROM OLD.staff_note
    THEN
      RAISE EXCEPTION 'Coordinators may only update stop status_override, start_time, end_time, or time_tbc';
    END IF;
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_coordinator_stop_update ON public.itinerary_stops;
CREATE TRIGGER trg_guard_coordinator_stop_update
  BEFORE UPDATE ON public.itinerary_stops
  FOR EACH ROW EXECUTE FUNCTION public.guard_coordinator_stop_update();

CREATE OR REPLACE FUNCTION public.log_itinerary_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity TEXT;
  v_itinerary_id UUID;
  v_entity_id UUID;
  v_action TEXT;
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF TG_TABLE_NAME = 'itineraries' THEN
    v_entity := 'itinerary';
    v_itinerary_id := COALESCE(NEW.id, OLD.id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'itinerary_days' THEN
    v_entity := 'day';
    v_itinerary_id := COALESCE(NEW.itinerary_id, OLD.itinerary_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  ELSE
    v_entity := 'stop';
    v_itinerary_id := COALESCE(NEW.itinerary_id, OLD.itinerary_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_before := to_jsonb(OLD);
    v_after := NULL;
  ELSE
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_action := 'update';
    IF v_entity = 'itinerary' AND NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'published' THEN
        v_action := 'publish';
      ELSIF OLD.status = 'published' THEN
        v_action := 'unpublish';
      END IF;
    ELSIF v_entity = 'stop' AND NEW.status_override IS DISTINCT FROM OLD.status_override THEN
      v_action := 'override';
    END IF;
  END IF;

  INSERT INTO public.itinerary_changes (itinerary_id, entity, entity_id, action, before, after, actor)
  VALUES (v_itinerary_id, v_entity, v_entity_id, v_action, v_before, v_after, auth.uid());

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_itineraries ON public.itineraries;
CREATE TRIGGER trg_audit_itineraries
  AFTER INSERT OR UPDATE OR DELETE ON public.itineraries
  FOR EACH ROW EXECUTE FUNCTION public.log_itinerary_change();

DROP TRIGGER IF EXISTS trg_audit_itinerary_days ON public.itinerary_days;
CREATE TRIGGER trg_audit_itinerary_days
  AFTER INSERT OR UPDATE OR DELETE ON public.itinerary_days
  FOR EACH ROW EXECUTE FUNCTION public.log_itinerary_change();

DROP TRIGGER IF EXISTS trg_audit_itinerary_stops ON public.itinerary_stops;
CREATE TRIGGER trg_audit_itinerary_stops
  AFTER INSERT OR UPDATE OR DELETE ON public.itinerary_stops
  FOR EACH ROW EXECUTE FUNCTION public.log_itinerary_change();

DROP FUNCTION IF EXISTS public.set_active_itinerary(UUID);
CREATE OR REPLACE FUNCTION public.set_active_itinerary(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can set the active itinerary';
  END IF;

  UPDATE public.itineraries SET is_active = FALSE WHERE is_active = TRUE AND id <> target_id;
  UPDATE public.itineraries SET is_active = TRUE WHERE id = target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_itinerary(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.shift_itinerary_stops(UUID, INT);
CREATE OR REPLACE FUNCTION public.shift_itinerary_stops(p_stop_id UUID, p_delta_minutes INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_ref RECORD;
  v_delta INTERVAL;
  v_count INT := 0;
  v_row RECORD;
  v_new_start TIME;
  v_new_end TIME;
BEGIN
  v_role := public.current_user_role();
  IF v_role NOT IN ('admin', 'coordinator') THEN
    RAISE EXCEPTION 'Only staff can shift itinerary stops';
  END IF;

  SELECT id, itinerary_id, day_id, sequence_no INTO v_ref
  FROM public.itinerary_stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop not found';
  END IF;

  v_delta := make_interval(mins => p_delta_minutes);

  FOR v_row IN
    SELECT id, start_time, end_time
    FROM public.itinerary_stops
    WHERE day_id = v_ref.day_id
      AND sequence_no > v_ref.sequence_no
      AND time_tbc = FALSE
      AND start_time IS NOT NULL
    ORDER BY sequence_no ASC
  LOOP
    IF (DATE '2000-01-01' + v_row.start_time + v_delta)::DATE > DATE '2000-01-01' THEN
      v_new_start := TIME '23:59:00';
    ELSIF (DATE '2000-01-01' + v_row.start_time + v_delta)::DATE < DATE '2000-01-01' THEN
      v_new_start := TIME '00:00:00';
    ELSE
      v_new_start := (DATE '2000-01-01' + v_row.start_time + v_delta)::TIME;
    END IF;

    v_new_end := NULL;
    IF v_row.end_time IS NOT NULL THEN
      IF (DATE '2000-01-01' + v_row.end_time + v_delta)::DATE > DATE '2000-01-01' THEN
        v_new_end := TIME '23:59:00';
      ELSIF (DATE '2000-01-01' + v_row.end_time + v_delta)::DATE < DATE '2000-01-01' THEN
        v_new_end := TIME '00:00:00';
      ELSE
        v_new_end := (DATE '2000-01-01' + v_row.end_time + v_delta)::TIME;
      END IF;
    END IF;

    UPDATE public.itinerary_stops
    SET start_time = v_new_start,
        end_time = v_new_end,
        updated_by = auth.uid()
    WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.itinerary_changes (itinerary_id, entity, entity_id, action, before, after, actor)
  VALUES (
    v_ref.itinerary_id,
    'stop',
    v_ref.id,
    'shift',
    jsonb_build_object('from_sequence', v_ref.sequence_no),
    jsonb_build_object('delta_minutes', p_delta_minutes, 'shifted_count', v_count),
    auth.uid()
  );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shift_itinerary_stops(UUID, INT) TO authenticated;

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS itineraries_select_policy ON public.itineraries;
CREATE POLICY itineraries_select_policy
  ON public.itineraries FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR public.current_user_role() IN ('admin', 'coordinator')
  );

DROP POLICY IF EXISTS itineraries_admin_insert ON public.itineraries;
CREATE POLICY itineraries_admin_insert
  ON public.itineraries FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS itineraries_admin_update ON public.itineraries;
CREATE POLICY itineraries_admin_update
  ON public.itineraries FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS itineraries_admin_delete ON public.itineraries;
CREATE POLICY itineraries_admin_delete
  ON public.itineraries FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS itinerary_days_select_policy ON public.itinerary_days;
CREATE POLICY itinerary_days_select_policy
  ON public.itinerary_days FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'coordinator')
    OR EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_days.itinerary_id AND i.status = 'published'
    )
  );

DROP POLICY IF EXISTS itinerary_days_admin_insert ON public.itinerary_days;
CREATE POLICY itinerary_days_admin_insert
  ON public.itinerary_days FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS itinerary_days_admin_update ON public.itinerary_days;
CREATE POLICY itinerary_days_admin_update
  ON public.itinerary_days FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS itinerary_days_admin_delete ON public.itinerary_days;
CREATE POLICY itinerary_days_admin_delete
  ON public.itinerary_days FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS itinerary_stops_select_policy ON public.itinerary_stops;
CREATE POLICY itinerary_stops_select_policy
  ON public.itinerary_stops FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'coordinator')
    OR EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_stops.itinerary_id AND i.status = 'published'
    )
  );

DROP POLICY IF EXISTS itinerary_stops_admin_insert ON public.itinerary_stops;
CREATE POLICY itinerary_stops_admin_insert
  ON public.itinerary_stops FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS itinerary_stops_staff_update ON public.itinerary_stops;
CREATE POLICY itinerary_stops_staff_update
  ON public.itinerary_stops FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'coordinator'))
  WITH CHECK (public.current_user_role() IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS itinerary_stops_admin_delete ON public.itinerary_stops;
CREATE POLICY itinerary_stops_admin_delete
  ON public.itinerary_stops FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS bus_locations_select_policy ON public.bus_locations;
CREATE POLICY bus_locations_select_policy
  ON public.bus_locations FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS bus_locations_staff_insert ON public.bus_locations;
CREATE POLICY bus_locations_staff_insert
  ON public.bus_locations FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'coordinator')
    AND updated_by = auth.uid()
  );

DROP POLICY IF EXISTS bus_locations_staff_update ON public.bus_locations;
CREATE POLICY bus_locations_staff_update
  ON public.bus_locations FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'coordinator'))
  WITH CHECK (
    public.current_user_role() IN ('admin', 'coordinator')
    AND updated_by = auth.uid()
  );

DROP POLICY IF EXISTS bus_locations_staff_delete ON public.bus_locations;
CREATE POLICY bus_locations_staff_delete
  ON public.bus_locations FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS itinerary_changes_select_staff ON public.itinerary_changes;
CREATE POLICY itinerary_changes_select_staff
  ON public.itinerary_changes FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'coordinator'));

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['itineraries', 'itinerary_days', 'itinerary_stops', 'bus_locations']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'supabase_realtime publication not present in this environment';
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'itinerary-media',
  'itinerary-media',
  true,
  3145728,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

DROP POLICY IF EXISTS itinerary_media_public_read ON storage.objects;
CREATE POLICY itinerary_media_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'itinerary-media');

DROP POLICY IF EXISTS itinerary_media_admin_insert ON storage.objects;
CREATE POLICY itinerary_media_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'itinerary-media'
    AND public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS itinerary_media_admin_update ON storage.objects;
CREATE POLICY itinerary_media_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'itinerary-media'
    AND public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS itinerary_media_admin_delete ON storage.objects;
CREATE POLICY itinerary_media_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'itinerary-media'
    AND public.current_user_role() = 'admin'
  );
