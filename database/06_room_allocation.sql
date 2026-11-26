-- ==============================================================================
-- IV CONNECT — ROOM ALLOCATION MODULE MIGRATION (PHASE 1)
-- ==============================================================================
-- Idempotent migration for hotel stays, room types, rooms, occupants,
-- append-only audit log, RLS policies, grid view, and atomic PL/pgSQL functions.
-- Guarantees:
--   - No room ever exceeds capacity (row-level FOR UPDATE + CHECK constraint)
--   - No user ever holds two rooms in the same stay (UNIQUE (stay_id, user_id))
--   - Zero deadlocks on simultaneous swaps (ascending UUID lock ordering)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ADD GENDER TO public.profiles (needed for boys/girls room eligibility)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;

DO $$ BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_gender;
  ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_gender
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
EXCEPTION WHEN others THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- 2. STAYS (one hotel / lodging stay per city/stop)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stays (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id                        UUID REFERENCES public.industrial_visits(id) ON DELETE SET NULL,
  name                            TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  selection_status                TEXT NOT NULL DEFAULT 'draft'
                                    CHECK (selection_status IN ('draft', 'open', 'closed')),
  opens_at                        TIMESTAMPTZ,
  closes_at                       TIMESTAMPTZ,
  coordinator_can_use_gender_rooms BOOLEAN NOT NULL DEFAULT FALSE,
  created_by                      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stays_created_at ON public.stays (created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_stays_updated_at ON public.stays;
CREATE TRIGGER set_stays_updated_at
  BEFORE UPDATE ON public.stays
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. ROOM TYPES (per stay: girls, boys, staff, or custom)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id         UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,
  label           TEXT NOT NULL,
  color_hex       TEXT NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  allowed_roles   TEXT[] NOT NULL DEFAULT ARRAY['student']::TEXT[],
  allowed_genders TEXT[],
  UNIQUE (stay_id, key)
);

CREATE INDEX IF NOT EXISTS idx_room_types_stay ON public.room_types (stay_id);

-- Seed default room types automatically when a stay is created
CREATE OR REPLACE FUNCTION public.seed_default_room_types_for_stay()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_types (stay_id, key, label, color_hex, allowed_roles, allowed_genders)
  VALUES
    (NEW.id, 'girls', 'Girls', '#EC4899', ARRAY['student']::TEXT[], ARRAY['female']::TEXT[]),
    (NEW.id, 'boys',  'Boys',  '#3B82F6', ARRAY['student']::TEXT[], ARRAY['male']::TEXT[]),
    (NEW.id, 'staff', 'Staff', '#F59E0B', ARRAY['coordinator', 'admin']::TEXT[], NULL)
  ON CONFLICT (stay_id, key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_room_types ON public.stays;
CREATE TRIGGER trg_seed_default_room_types
  AFTER INSERT ON public.stays
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_room_types_for_stay();

-- ------------------------------------------------------------------------------
-- 4. ROOMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id        UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  room_no        TEXT NOT NULL CHECK (char_length(trim(room_no)) BETWEEN 1 AND 32),
  floor          TEXT,
  capacity       INT NOT NULL CHECK (capacity BETWEEN 1 AND 20),
  room_type_id   UUID NOT NULL REFERENCES public.room_types(id),
  occupant_count INT NOT NULL DEFAULT 0 CHECK (occupant_count >= 0),
  is_locked      BOOLEAN NOT NULL DEFAULT FALSE,
  version        INT NOT NULL DEFAULT 0,
  UNIQUE (stay_id, room_no),
  CHECK (occupant_count <= capacity)
);

CREATE INDEX IF NOT EXISTS idx_rooms_stay ON public.rooms (stay_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON public.rooms (room_type_id);

-- ------------------------------------------------------------------------------
-- 5. ROOM OCCUPANTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_occupants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  stay_id     UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stay_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_occupants_room ON public.room_occupants (room_id);
CREATE INDEX IF NOT EXISTS idx_room_occupants_stay_user ON public.room_occupants (stay_id, user_id);

-- ------------------------------------------------------------------------------
-- 6. ROOM AUDIT LOG (append-only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_audit_log (
  id         BIGSERIAL PRIMARY KEY,
  stay_id    UUID,
  room_id    UUID,
  user_id    UUID,
  actor_id   UUID,
  action     TEXT NOT NULL,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_audit_stay_created
  ON public.room_audit_log (stay_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. CASCADE SAFETY TRIGGER ON PROFILE DELETE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_profile_delete_room_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT ro.room_id, ro.stay_id
    FROM public.room_occupants ro
    WHERE ro.user_id = OLD.id
    ORDER BY ro.room_id ASC
  LOOP
    PERFORM 1 FROM public.rooms WHERE id = rec.room_id FOR UPDATE;
    UPDATE public.rooms
    SET occupant_count = GREATEST(0, occupant_count - 1),
        version = version + 1
    WHERE id = rec.room_id;

    INSERT INTO public.room_audit_log (stay_id, room_id, user_id, actor_id, action, detail)
    VALUES (rec.stay_id, rec.room_id, OLD.id, NULL, 'user_deleted_cascade', jsonb_build_object('email', OLD.email));
  END LOOP;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_delete_room_cleanup ON public.profiles;
CREATE TRIGGER trg_profile_delete_room_cleanup
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_delete_room_cleanup();

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) & GRID VIEW
-- ------------------------------------------------------------------------------
ALTER TABLE public.stays          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_occupants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_audit_log ENABLE ROW LEVEL SECURITY;

-- Non-recursive helper to check if caller occupies a specific room
CREATE OR REPLACE FUNCTION public.is_user_in_room(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_occupants
    WHERE room_id = p_room_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_in_room(UUID) TO authenticated;

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

GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- Read-only policies for authenticated clients; NO client write policies exist.
DROP POLICY IF EXISTS stays_select_authenticated ON public.stays;
CREATE POLICY stays_select_authenticated
  ON public.stays FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS room_types_select_authenticated ON public.room_types;
CREATE POLICY room_types_select_authenticated
  ON public.room_types FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS rooms_select_authenticated ON public.rooms;
CREATE POLICY rooms_select_authenticated
  ON public.rooms FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS room_occupants_select_scoped ON public.room_occupants;
CREATE POLICY room_occupants_select_scoped
  ON public.room_occupants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_role() IN ('admin', 'coordinator')
    OR public.is_user_in_room(room_id)
  );

DROP POLICY IF EXISTS room_audit_select_admin ON public.room_audit_log;
CREATE POLICY room_audit_select_admin
  ON public.room_audit_log FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

-- Grid view (returns room metadata & occupancy counts + caller is_mine; zero occupant names)
CREATE OR REPLACE VIEW public.room_grid_view AS
SELECT
  r.id,
  r.stay_id,
  r.room_no,
  r.floor,
  r.capacity,
  r.room_type_id,
  rt.key AS type_key,
  rt.label AS type_label,
  rt.color_hex,
  rt.allowed_roles,
  rt.allowed_genders,
  r.occupant_count,
  r.is_locked,
  r.version,
  EXISTS (
    SELECT 1 FROM public.room_occupants ro
    WHERE ro.room_id = r.id AND ro.user_id = auth.uid()
  ) AS is_mine
FROM public.rooms r
JOIN public.room_types rt ON rt.id = r.room_type_id;

GRANT SELECT ON public.room_grid_view TO authenticated;

-- Enable Supabase Realtime on public.rooms (only counts/flags, never names)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 9. ELIGIBILITY HELPER (used inside atomic functions)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._check_room_eligibility(
  p_role TEXT,
  p_gender TEXT,
  p_type_key TEXT,
  p_allowed_roles TEXT[],
  p_allowed_genders TEXT[],
  p_coord_gender_rooms BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_role TEXT := lower(coalesce(p_role, 'student'));
  v_gender TEXT := lower(nullif(trim(coalesce(p_gender, '')), ''));
  v_role_ok BOOLEAN := FALSE;
BEGIN
  v_role_ok := (v_role = ANY(p_allowed_roles))
    OR (v_role = 'coordinator' AND coalesce(p_coord_gender_rooms, FALSE) = TRUE AND p_type_key IN ('girls', 'boys'));

  IF NOT v_role_ok THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'INELIGIBLE_ROLE',
      'message', format('This room type is not open to %ss.', v_role)
    );
  END IF;

  IF p_allowed_genders IS NOT NULL AND cardinality(p_allowed_genders) > 0 THEN
    IF v_gender IS NULL OR v_gender NOT IN ('male', 'female', 'other') THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'GENDER_REQUIRED',
        'message', 'Contact admin to update your profile.'
      );
    END IF;

    IF NOT (v_gender = ANY(p_allowed_genders)) THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'INELIGIBLE_GENDER',
        'message', format('This room is restricted to %s occupants.', array_to_string(p_allowed_genders, ' / '))
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', TRUE);
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. ATOMIC TRANSACTIONAL FUNCTIONS
-- ------------------------------------------------------------------------------

-- 10.1 select_room(p_user, p_room)
CREATE OR REPLACE FUNCTION public.select_room(p_user UUID, p_room UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_room RECORD;
  v_user RECORD;
  v_elig JSONB;
  v_existing RECORD;
  v_updated public.rooms%ROWTYPE;
BEGIN
  -- 1. Lock target room row
  SELECT
    r.*,
    s.selection_status,
    s.opens_at,
    s.closes_at,
    s.coordinator_can_use_gender_rooms,
    rt.key AS type_key,
    rt.label AS type_label,
    rt.color_hex,
    rt.allowed_roles,
    rt.allowed_genders
  INTO v_room
  FROM public.rooms r
  JOIN public.stays s ON s.id = r.stay_id
  JOIN public.room_types rt ON rt.id = r.room_type_id
  WHERE r.id = p_room
  FOR UPDATE OF r;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_NOT_FOUND', 'message', 'Room not found.');
  END IF;

  -- Load caller profile from DB (never trust client claims)
  SELECT id, role::text AS role, gender, approval_status, is_active
  INTO v_user
  FROM public.profiles
  WHERE id = p_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'USER_NOT_FOUND', 'message', 'User profile not found.');
  END IF;

  IF lower(v_user.role) <> 'admin' AND (v_user.approval_status <> 'approved' OR v_user.is_active = FALSE) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'USER_INACTIVE', 'message', 'Your account is not active.');
  END IF;

  -- 2. Verify selection window & lock state
  IF v_room.selection_status <> 'open' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'WINDOW_CLOSED', 'message', 'Room selection is currently closed.');
  END IF;
  IF v_room.opens_at IS NOT NULL AND NOW() < v_room.opens_at THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'WINDOW_NOT_OPEN', 'message', 'Room selection has not opened yet.');
  END IF;
  IF v_room.closes_at IS NOT NULL AND NOW() > v_room.closes_at THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'WINDOW_CLOSED', 'message', 'Room selection deadline has passed.');
  END IF;
  IF v_room.is_locked THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_LOCKED', 'message', 'This room is locked by the administrator.');
  END IF;

  -- Check eligibility
  v_elig := public._check_room_eligibility(
    v_user.role,
    v_user.gender,
    v_room.type_key,
    v_room.allowed_roles,
    v_room.allowed_genders,
    v_room.coordinator_can_use_gender_rooms
  );
  IF NOT (v_elig->>'ok')::BOOLEAN THEN
    RETURN v_elig;
  END IF;

  -- 3. Check if user already holds a room in this stay
  SELECT ro.room_id, r2.room_no
  INTO v_existing
  FROM public.room_occupants ro
  JOIN public.rooms r2 ON r2.id = ro.room_id
  WHERE ro.stay_id = v_room.stay_id AND ro.user_id = p_user
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'ALREADY_HAS_ROOM',
      'message', format('You already hold Room %s. Switch rooms instead.', v_existing.room_no),
      'currentRoomId', v_existing.room_id,
      'currentRoomNo', v_existing.room_no
    );
  END IF;

  -- 4. Check capacity
  IF v_room.occupant_count >= v_room.capacity THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_FULL', 'message', 'Just taken, pick another.');
  END IF;

  -- 5. Insert occupant (unique(stay_id, user_id) backstop)
  BEGIN
    INSERT INTO public.room_occupants (room_id, stay_id, user_id, assigned_by)
    VALUES (p_room, v_room.stay_id, p_user, NULL);
  EXCEPTION WHEN unique_violation THEN
    SELECT ro.room_id, r2.room_no
    INTO v_existing
    FROM public.room_occupants ro
    JOIN public.rooms r2 ON r2.id = ro.room_id
    WHERE ro.stay_id = v_room.stay_id AND ro.user_id = p_user
    LIMIT 1;

    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'ALREADY_HAS_ROOM',
      'message', format('You already hold Room %s.', coalesce(v_existing.room_no, '')),
      'currentRoomId', v_existing.room_id,
      'currentRoomNo', v_existing.room_no
    );
  END;

  -- 6. Increment denormalised count & version
  UPDATE public.rooms
  SET occupant_count = occupant_count + 1,
      version = version + 1
  WHERE id = p_room
  RETURNING * INTO v_updated;

  -- 7. Audit
  INSERT INTO public.room_audit_log (stay_id, room_id, user_id, actor_id, action, detail)
  VALUES (v_room.stay_id, p_room, p_user, p_user, 'select', jsonb_build_object('room_no', v_room.room_no));

  RETURN jsonb_build_object(
    'ok', TRUE,
    'room', jsonb_build_object(
      'id', v_updated.id,
      'stay_id', v_updated.stay_id,
      'room_no', v_updated.room_no,
      'floor', v_updated.floor,
      'capacity', v_updated.capacity,
      'occupant_count', v_updated.occupant_count,
      'is_locked', v_updated.is_locked,
      'version', v_updated.version,
      'room_type_id', v_updated.room_type_id,
      'is_mine', TRUE
    )
  );
EXCEPTION
  WHEN lock_not_available OR query_canceled THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'BUSY_RETRY', 'message', 'High traffic on this room. Retrying...');
END;
$$;

-- 10.2 deselect_room(p_user, p_room)
CREATE OR REPLACE FUNCTION public.deselect_room(p_user UUID, p_room UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_room RECORD;
  v_deleted_id UUID;
  v_updated public.rooms%ROWTYPE;
BEGIN
  SELECT r.*, s.selection_status, s.opens_at, s.closes_at
  INTO v_room
  FROM public.rooms r
  JOIN public.stays s ON s.id = r.stay_id
  WHERE r.id = p_room
  FOR UPDATE OF r;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_NOT_FOUND', 'message', 'Room not found.');
  END IF;

  IF v_room.selection_status <> 'open'
     OR (v_room.opens_at IS NOT NULL AND NOW() < v_room.opens_at)
     OR (v_room.closes_at IS NOT NULL AND NOW() > v_room.closes_at) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'WINDOW_CLOSED', 'message', 'Room selection is closed; contact admin to release your room.');
  END IF;

  IF v_room.is_locked THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_LOCKED', 'message', 'This room is locked by the administrator.');
  END IF;

  DELETE FROM public.room_occupants
  WHERE room_id = p_room AND user_id = p_user
  RETURNING id INTO v_deleted_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'NOT_IN_ROOM', 'message', 'You are not assigned to this room.');
  END IF;

  UPDATE public.rooms
  SET occupant_count = GREATEST(0, occupant_count - 1),
      version = version + 1
  WHERE id = p_room
  RETURNING * INTO v_updated;

  INSERT INTO public.room_audit_log (stay_id, room_id, user_id, actor_id, action, detail)
  VALUES (v_room.stay_id, p_room, p_user, p_user, 'deselect', jsonb_build_object('room_no', v_room.room_no));

  RETURN jsonb_build_object(
    'ok', TRUE,
    'room', jsonb_build_object(
      'id', v_updated.id,
      'stay_id', v_updated.stay_id,
      'room_no', v_updated.room_no,
      'occupant_count', v_updated.occupant_count,
      'capacity', v_updated.capacity,
      'version', v_updated.version,
      'is_mine', FALSE
    )
  );
EXCEPTION
  WHEN lock_not_available OR query_canceled THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'BUSY_RETRY', 'message', 'Server busy. Please try again.');
END;
$$;

-- 10.3 switch_room(p_user, p_from, p_to) — ascending UUID lock order prevents deadlocks
CREATE OR REPLACE FUNCTION public.switch_room(p_user UUID, p_from UUID, p_to UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_first UUID;
  v_second UUID;
  v_from RECORD;
  v_to RECORD;
  v_user RECORD;
  v_elig JSONB;
  v_occ_id UUID;
  v_updated_from public.rooms%ROWTYPE;
  v_updated_to public.rooms%ROWTYPE;
BEGIN
  IF p_from = p_to THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'SAME_ROOM', 'message', 'Target room is the same as your current room.');
  END IF;

  -- Ascending UUID lock order (non-negotiable deadlock prevention)
  IF p_from < p_to THEN
    v_first := p_from;
    v_second := p_to;
  ELSE
    v_first := p_to;
    v_second := p_from;
  END IF;

  PERFORM 1 FROM public.rooms WHERE id = v_first FOR UPDATE;
  PERFORM 1 FROM public.rooms WHERE id = v_second FOR UPDATE;

  SELECT r.*, s.selection_status, s.opens_at, s.closes_at
  INTO v_from
  FROM public.rooms r
  JOIN public.stays s ON s.id = r.stay_id
  WHERE r.id = p_from;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_NOT_FOUND', 'message', 'Source room not found.');
  END IF;

  SELECT r.*, s.selection_status, s.opens_at, s.closes_at, s.coordinator_can_use_gender_rooms,
         rt.key AS type_key, rt.allowed_roles, rt.allowed_genders
  INTO v_to
  FROM public.rooms r
  JOIN public.stays s ON s.id = r.stay_id
  JOIN public.room_types rt ON rt.id = r.room_type_id
  WHERE r.id = p_to;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_NOT_FOUND', 'message', 'Target room not found.');
  END IF;

  IF v_from.stay_id <> v_to.stay_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'STAY_MISMATCH', 'message', 'Cannot switch rooms across different stays.');
  END IF;

  SELECT id, role::text AS role, gender, approval_status, is_active
  INTO v_user
  FROM public.profiles
  WHERE id = p_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'USER_NOT_FOUND', 'message', 'User profile not found.');
  END IF;

  IF v_to.selection_status <> 'open'
     OR (v_to.opens_at IS NOT NULL AND NOW() < v_to.opens_at)
     OR (v_to.closes_at IS NOT NULL AND NOW() > v_to.closes_at) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'WINDOW_CLOSED', 'message', 'Room selection is currently closed.');
  END IF;

  IF v_from.is_locked THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_LOCKED', 'message', 'Your current room is locked by the administrator.');
  END IF;
  IF v_to.is_locked THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_LOCKED', 'message', 'Target room is locked by the administrator.');
  END IF;

  SELECT id INTO v_occ_id
  FROM public.room_occupants
  WHERE room_id = p_from AND user_id = p_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'NOT_IN_ROOM', 'message', 'You are no longer in the source room.');
  END IF;

  v_elig := public._check_room_eligibility(
    v_user.role,
    v_user.gender,
    v_to.type_key,
    v_to.allowed_roles,
    v_to.allowed_genders,
    v_to.coordinator_can_use_gender_rooms
  );
  IF NOT (v_elig->>'ok')::BOOLEAN THEN
    RETURN v_elig;
  END IF;

  IF v_to.occupant_count >= v_to.capacity THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_FULL', 'message', 'Target room is full. Just taken, pick another.');
  END IF;

  UPDATE public.room_occupants
  SET room_id = p_to, assigned_by = NULL, created_at = NOW()
  WHERE id = v_occ_id;

  UPDATE public.rooms
  SET occupant_count = GREATEST(0, occupant_count - 1),
      version = version + 1
  WHERE id = p_from
  RETURNING * INTO v_updated_from;

  UPDATE public.rooms
  SET occupant_count = occupant_count + 1,
      version = version + 1
  WHERE id = p_to
  RETURNING * INTO v_updated_to;

  INSERT INTO public.room_audit_log (stay_id, room_id, user_id, actor_id, action, detail)
  VALUES (
    v_to.stay_id, p_to, p_user, p_user, 'switch',
    jsonb_build_object('from_room_id', p_from, 'from_room_no', v_from.room_no, 'to_room_id', p_to, 'to_room_no', v_to.room_no)
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'fromRoom', jsonb_build_object('id', v_updated_from.id, 'occupant_count', v_updated_from.occupant_count, 'version', v_updated_from.version),
    'room', jsonb_build_object(
      'id', v_updated_to.id,
      'stay_id', v_updated_to.stay_id,
      'room_no', v_updated_to.room_no,
      'floor', v_updated_to.floor,
      'capacity', v_updated_to.capacity,
      'occupant_count', v_updated_to.occupant_count,
      'is_locked', v_updated_to.is_locked,
      'version', v_updated_to.version,
      'room_type_id', v_updated_to.room_type_id,
      'is_mine', TRUE
    )
  );
EXCEPTION
  WHEN lock_not_available OR query_canceled THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'BUSY_RETRY', 'message', 'Server busy. Retrying...');
END;
$$;

-- 10.4 admin_assign(p_admin, p_user, p_room, p_force)
CREATE OR REPLACE FUNCTION public.admin_assign(p_admin UUID, p_user UUID, p_room UUID, p_force BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_existing RECORD;
  v_user_exists BOOLEAN;
  v_new_capacity INT;
  v_updated public.rooms%ROWTYPE;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_NOT_FOUND', 'message', 'Room not found.');
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) INTO v_user_exists;
  IF NOT v_user_exists THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'USER_NOT_FOUND', 'message', 'User not found.');
  END IF;

  SELECT ro.room_id, r2.room_no
  INTO v_existing
  FROM public.room_occupants ro
  JOIN public.rooms r2 ON r2.id = ro.room_id
  WHERE ro.stay_id = v_room.stay_id AND ro.user_id = p_user
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'ALREADY_HAS_ROOM',
      'message', format('User is already assigned to Room %s. Use Move instead.', v_existing.room_no),
      'currentRoomId', v_existing.room_id,
      'currentRoomNo', v_existing.room_no
    );
  END IF;

  IF NOT coalesce(p_force, FALSE) AND v_room.occupant_count >= v_room.capacity THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_FULL', 'message', 'Room is at full capacity.');
  END IF;

  v_new_capacity := GREATEST(v_room.capacity, v_room.occupant_count + 1);

  INSERT INTO public.room_occupants (room_id, stay_id, user_id, assigned_by)
  VALUES (p_room, v_room.stay_id, p_user, p_admin);

  UPDATE public.rooms
  SET occupant_count = occupant_count + 1,
      capacity = CASE WHEN coalesce(p_force, FALSE) THEN v_new_capacity ELSE capacity END,
      version = version + 1
  WHERE id = p_room
  RETURNING * INTO v_updated;

  INSERT INTO public.room_audit_log (stay_id, room_id, user_id, actor_id, action, detail)
  VALUES (
    v_room.stay_id, p_room, p_user, p_admin, 'admin_assign',
    jsonb_build_object('room_no', v_room.room_no, 'force', coalesce(p_force, FALSE), 'override', TRUE)
  );

  RETURN jsonb_build_object('ok', TRUE, 'room', row_to_json(v_updated)::jsonb);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ALREADY_HAS_ROOM', 'message', 'User already has a room in this stay.');
  WHEN lock_not_available OR query_canceled THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'BUSY_RETRY', 'message', 'Server busy. Please retry.');
END;
$$;

-- 10.5 admin_remove(p_admin, p_user, p_stay)
CREATE OR REPLACE FUNCTION public.admin_remove(p_admin UUID, p_user UUID, p_stay UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_room_id UUID;
  v_room public.rooms%ROWTYPE;
  v_deleted_id UUID;
  v_updated public.rooms%ROWTYPE;
BEGIN
  SELECT room_id INTO v_room_id
  FROM public.room_occupants
  WHERE stay_id = p_stay AND user_id = p_user
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'NOT_IN_ROOM', 'message', 'User does not hold a room in this stay.');
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = v_room_id FOR UPDATE;

  DELETE FROM public.room_occupants
  WHERE stay_id = p_stay AND user_id = p_user AND room_id = v_room_id
  RETURNING id INTO v_deleted_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'NOT_IN_ROOM', 'message', 'User assignment changed concurrently.');
  END IF;

  UPDATE public.rooms
  SET occupant_count = GREATEST(0, occupant_count - 1),
      version = version + 1
  WHERE id = v_room_id
  RETURNING * INTO v_updated;

  INSERT INTO public.room_audit_log (stay_id, room_id, user_id, actor_id, action, detail)
  VALUES (p_stay, v_room_id, p_user, p_admin, 'admin_remove', jsonb_build_object('room_no', v_room.room_no));

  RETURN jsonb_build_object('ok', TRUE, 'room', row_to_json(v_updated)::jsonb);
EXCEPTION
  WHEN lock_not_available OR query_canceled THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'BUSY_RETRY', 'message', 'Server busy. Please retry.');
END;
$$;

-- 10.6 admin_move(p_admin, p_user, p_to_room, p_force)
CREATE OR REPLACE FUNCTION public.admin_move(p_admin UUID, p_user UUID, p_to_room UUID, p_force BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_to_stay UUID;
  v_from_room UUID;
  v_first UUID;
  v_second UUID;
  v_from public.rooms%ROWTYPE;
  v_to public.rooms%ROWTYPE;
  v_occ_id UUID;
  v_new_cap INT;
BEGIN
  SELECT stay_id INTO v_to_stay FROM public.rooms WHERE id = p_to_room;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_NOT_FOUND', 'message', 'Target room not found.');
  END IF;

  SELECT room_id INTO v_from_room
  FROM public.room_occupants
  WHERE stay_id = v_to_stay AND user_id = p_user
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN public.admin_assign(p_admin, p_user, p_to_room, p_force);
  END IF;

  IF v_from_room = p_to_room THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'SAME_ROOM', 'message', 'User is already in this room.');
  END IF;

  IF v_from_room < p_to_room THEN
    v_first := v_from_room;
    v_second := p_to_room;
  ELSE
    v_first := p_to_room;
    v_second := v_from_room;
  END IF;

  PERFORM 1 FROM public.rooms WHERE id = v_first FOR UPDATE;
  PERFORM 1 FROM public.rooms WHERE id = v_second FOR UPDATE;

  SELECT * INTO v_from FROM public.rooms WHERE id = v_from_room;
  SELECT * INTO v_to FROM public.rooms WHERE id = p_to_room;

  SELECT id INTO v_occ_id
  FROM public.room_occupants
  WHERE room_id = v_from_room AND user_id = p_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'BUSY_RETRY', 'message', 'User room changed concurrently. Please retry.');
  END IF;

  IF NOT coalesce(p_force, FALSE) AND v_to.occupant_count >= v_to.capacity THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_FULL', 'message', 'Target room is at full capacity.');
  END IF;

  v_new_cap := GREATEST(v_to.capacity, v_to.occupant_count + 1);

  UPDATE public.room_occupants
  SET room_id = p_to_room, assigned_by = p_admin, created_at = NOW()
  WHERE id = v_occ_id;

  UPDATE public.rooms
  SET occupant_count = GREATEST(0, occupant_count - 1),
      version = version + 1
  WHERE id = v_from_room;

  UPDATE public.rooms
  SET occupant_count = occupant_count + 1,
      capacity = CASE WHEN coalesce(p_force, FALSE) THEN v_new_cap ELSE capacity END,
      version = version + 1
  WHERE id = p_to_room
  RETURNING * INTO v_to;

  INSERT INTO public.room_audit_log (stay_id, room_id, user_id, actor_id, action, detail)
  VALUES (
    v_to_stay, p_to_room, p_user, p_admin, 'admin_move',
    jsonb_build_object('from_room_id', v_from_room, 'from_room_no', v_from.room_no, 'to_room_id', p_to_room, 'to_room_no', v_to.room_no, 'force', coalesce(p_force, FALSE))
  );

  RETURN jsonb_build_object('ok', TRUE, 'room', row_to_json(v_to)::jsonb);
EXCEPTION
  WHEN lock_not_available OR query_canceled THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'BUSY_RETRY', 'message', 'Server busy. Please retry.');
END;
$$;

-- 10.7 update_room_safe (validates capacity & type changes against live occupants)
CREATE OR REPLACE FUNCTION public.update_room_safe(
  p_admin UUID,
  p_room UUID,
  p_room_no TEXT DEFAULT NULL,
  p_floor TEXT DEFAULT NULL,
  p_capacity INT DEFAULT NULL,
  p_room_type_id UUID DEFAULT NULL,
  p_is_locked BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_stay public.stays%ROWTYPE;
  v_new_type public.room_types%ROWTYPE;
  v_names TEXT[];
  v_ineligible TEXT[] := ARRAY[]::TEXT[];
  v_occ RECORD;
  v_elig JSONB;
  v_updated public.rooms%ROWTYPE;
  v_action TEXT := 'room_updated';
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_NOT_FOUND', 'message', 'Room not found.');
  END IF;

  SELECT * INTO v_stay FROM public.stays WHERE id = v_room.stay_id;

  IF p_capacity IS NOT NULL THEN
    IF p_capacity < 1 OR p_capacity > 20 THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'VALIDATION_ERROR', 'message', 'Capacity must be between 1 and 20.');
    END IF;
    IF p_capacity < v_room.occupant_count THEN
      SELECT array_agg(p.full_name ORDER BY p.full_name)
      INTO v_names
      FROM public.room_occupants ro
      JOIN public.profiles p ON p.id = ro.user_id
      WHERE ro.room_id = p_room;

      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'CAPACITY_BELOW_OCCUPANCY',
        'message', format('Cannot set capacity to %s while %s occupants are in this room (%s).', p_capacity, v_room.occupant_count, array_to_string(coalesce(v_names, ARRAY[]::TEXT[]), ', ')),
        'occupants', to_jsonb(coalesce(v_names, ARRAY[]::TEXT[]))
      );
    END IF;
  END IF;

  IF p_room_type_id IS NOT NULL AND p_room_type_id <> v_room.room_type_id THEN
    SELECT * INTO v_new_type FROM public.room_types WHERE id = p_room_type_id AND stay_id = v_room.stay_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'INVALID_ROOM_TYPE', 'message', 'Room type does not belong to this stay.');
    END IF;

    IF v_room.occupant_count > 0 THEN
      FOR v_occ IN
        SELECT p.full_name, p.role::text AS role, p.gender
        FROM public.room_occupants ro
        JOIN public.profiles p ON p.id = ro.user_id
        WHERE ro.room_id = p_room
      LOOP
        v_elig := public._check_room_eligibility(
          v_occ.role, v_occ.gender, v_new_type.key,
          v_new_type.allowed_roles, v_new_type.allowed_genders,
          v_stay.coordinator_can_use_gender_rooms
        );
        IF NOT (v_elig->>'ok')::BOOLEAN THEN
          v_ineligible := array_append(v_ineligible, v_occ.full_name);
        END IF;
      END LOOP;

      IF cardinality(v_ineligible) > 0 THEN
        RETURN jsonb_build_object(
          'ok', FALSE,
          'code', 'INELIGIBLE_CURRENT_OCCUPANTS',
          'message', format('Cannot change room type; move ineligible occupants first: %s.', array_to_string(v_ineligible, ', ')),
          'occupants', to_jsonb(v_ineligible)
        );
      END IF;
    END IF;
  END IF;

  BEGIN
    UPDATE public.rooms
    SET room_no      = coalesce(nullif(trim(p_room_no), ''), room_no),
        floor        = CASE WHEN p_floor IS NOT NULL THEN nullif(trim(p_floor), '') ELSE floor END,
        capacity     = coalesce(p_capacity, capacity),
        room_type_id = coalesce(p_room_type_id, room_type_id),
        is_locked    = coalesce(p_is_locked, is_locked),
        version      = version + 1
    WHERE id = p_room
    RETURNING * INTO v_updated;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'DUPLICATE_ROOM_NO', 'message', 'Another room with that number already exists in this stay.');
  END;

  IF p_is_locked IS NOT NULL AND p_is_locked <> v_room.is_locked THEN
    v_action := CASE WHEN p_is_locked THEN 'lock' ELSE 'unlock' END;
  END IF;

  INSERT INTO public.room_audit_log (stay_id, room_id, actor_id, action, detail)
  VALUES (v_room.stay_id, p_room, p_admin, v_action, jsonb_build_object('room_no', v_updated.room_no, 'capacity', v_updated.capacity, 'is_locked', v_updated.is_locked));

  RETURN jsonb_build_object('ok', TRUE, 'room', row_to_json(v_updated)::jsonb);
END;
$$;

-- 10.8 delete_room_safe
CREATE OR REPLACE FUNCTION public.delete_room_safe(p_admin UUID, p_room UUID, p_force_unassign BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_unassigned UUID[];
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ROOM_NOT_FOUND', 'message', 'Room not found.');
  END IF;

  IF v_room.occupant_count > 0 AND NOT coalesce(p_force_unassign, FALSE) THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'ROOM_HAS_OCCUPANTS',
      'message', format('Room %s has %s occupant(s). Move them or confirm force delete.', v_room.room_no, v_room.occupant_count),
      'occupantCount', v_room.occupant_count
    );
  END IF;

  SELECT array_agg(user_id) INTO v_unassigned FROM public.room_occupants WHERE room_id = p_room;

  DELETE FROM public.rooms WHERE id = p_room;

  INSERT INTO public.room_audit_log (stay_id, room_id, actor_id, action, detail)
  VALUES (
    v_room.stay_id, p_room, p_admin, 'room_deleted',
    jsonb_build_object('room_no', v_room.room_no, 'force_unassign', coalesce(p_force_unassign, FALSE), 'unassigned_user_ids', to_jsonb(coalesce(v_unassigned, ARRAY[]::UUID[])))
  );

  RETURN jsonb_build_object('ok', TRUE, 'deleted', TRUE, 'room_no', v_room.room_no);
END;
$$;

-- 10.9 generate_stay_layout (single-transaction bulk insert / safe replace)
CREATE OR REPLACE FUNCTION public.generate_stay_layout(p_admin UUID, p_stay UUID, p_mode TEXT, p_rooms JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_stay public.stays%ROWTYPE;
  v_occ_count INT;
  v_item JSONB;
  v_inserted INT := 0;
  v_room_no TEXT;
BEGIN
  SELECT * INTO v_stay FROM public.stays WHERE id = p_stay FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'STAY_NOT_FOUND', 'message', 'Stay not found.');
  END IF;

  IF p_mode NOT IN ('add', 'replace') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'VALIDATION_ERROR', 'message', 'Mode must be add or replace.');
  END IF;

  IF p_mode = 'replace' THEN
    SELECT COUNT(*) INTO v_occ_count FROM public.room_occupants WHERE stay_id = p_stay;
    IF v_occ_count > 0 THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'STAY_HAS_OCCUPANTS',
        'message', format('Cannot replace layout: %s person(s) already hold rooms in this stay.', v_occ_count),
        'occupantCount', v_occ_count
      );
    END IF;
    DELETE FROM public.rooms WHERE stay_id = p_stay;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_rooms)
  LOOP
    v_room_no := trim(coalesce(v_item->>'room_no', ''));
    BEGIN
      INSERT INTO public.rooms (stay_id, room_no, floor, capacity, room_type_id)
      VALUES (
        p_stay,
        v_room_no,
        nullif(trim(coalesce(v_item->>'floor', '')), ''),
        (v_item->>'capacity')::INT,
        (v_item->>'room_type_id')::UUID
      );
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = format('Duplicate room number: %s', v_room_no);
    END;
  END LOOP;

  INSERT INTO public.room_audit_log (stay_id, actor_id, action, detail)
  VALUES (p_stay, p_admin, 'room_created', jsonb_build_object('mode', p_mode, 'count', v_inserted));

  RETURN jsonb_build_object('ok', TRUE, 'inserted', v_inserted, 'mode', p_mode);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'DUPLICATE_ROOM_NO', 'message', SQLERRM);
END;
$$;

-- 10.10 reconcile_room_counts(p_admin, p_stay)
CREATE OR REPLACE FUNCTION public.reconcile_room_counts(p_admin UUID, p_stay UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET lock_timeout = '3s'
SET statement_timeout = '5s'
AS $$
DECLARE
  v_rec RECORD;
  v_checked INT := 0;
  v_fixed INT := 0;
  v_diffs JSONB := '[]'::JSONB;
BEGIN
  FOR v_rec IN
    SELECT r.id, r.room_no, r.occupant_count,
           (SELECT COUNT(*)::INT FROM public.room_occupants ro WHERE ro.room_id = r.id) AS actual_count
    FROM public.rooms r
    WHERE r.stay_id = p_stay
    ORDER BY r.id ASC
    FOR UPDATE OF r
  LOOP
    v_checked := v_checked + 1;
    IF v_rec.occupant_count <> v_rec.actual_count THEN
      UPDATE public.rooms
      SET occupant_count = v_rec.actual_count,
          version = version + 1
      WHERE id = v_rec.id;
      v_fixed := v_fixed + 1;
      v_diffs := v_diffs || jsonb_build_array(jsonb_build_object(
        'room_id', v_rec.id, 'room_no', v_rec.room_no,
        'was', v_rec.occupant_count, 'actual', v_rec.actual_count
      ));
    END IF;
  END LOOP;

  INSERT INTO public.room_audit_log (stay_id, actor_id, action, detail)
  VALUES (p_stay, p_admin, 'reconcile', jsonb_build_object('checked', v_checked, 'fixed', v_fixed, 'diffs', v_diffs));

  RETURN jsonb_build_object('ok', TRUE, 'checked', v_checked, 'fixed', v_fixed, 'diffs', v_diffs);
END;
$$;

-- Lock down RPC execution to service_role only (all writes go through Railway API)
REVOKE ALL ON FUNCTION public.select_room(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deselect_room(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.switch_room(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_assign(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_remove(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_move(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_room_safe(UUID, UUID, TEXT, TEXT, INT, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_room_safe(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_stay_layout(UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_room_counts(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.select_room(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.deselect_room(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.switch_room(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign(UUID, UUID, UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_move(UUID, UUID, UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_room_safe(UUID, UUID, TEXT, TEXT, INT, UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_room_safe(UUID, UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_stay_layout(UUID, UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_room_counts(UUID, UUID) TO service_role;
