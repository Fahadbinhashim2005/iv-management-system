-- ==============================================================================
-- IV CONNECT — SUPABASE SETUP & SEED (NO RLS - OPEN DEV MODE)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS (Safe creation)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'coordinator', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE visit_status AS ENUM ('draft', 'review', 'published', 'ongoing', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('pending', 'approved', 'waitlisted', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notice_category AS ENUM ('urgent', 'logistics', 'general', 'info');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    department TEXT,
    academic_batch TEXT,
    roll_number TEXT UNIQUE,
    phone_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    blood_group TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure id column has DEFAULT gen_random_uuid()
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop auth.users constraint so mock/seed profiles can be inserted without Supabase Auth
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. MASTER INDUSTRIAL VISITS TABLE
CREATE TABLE IF NOT EXISTS public.industrial_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    academic_batch TEXT NOT NULL,
    host_companies TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    destination_state TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    sanctioned_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status visit_status NOT NULL DEFAULT 'draft',
    learning_objectives TEXT,
    lead_coordinator_id UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. VISIT COORDINATOR DELEGATIONS
CREATE TABLE IF NOT EXISTS public.visit_coordinators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.industrial_visits(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    delegation_role TEXT NOT NULL DEFAULT 'Field Coordinator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(visit_id, faculty_id)
);

-- 6. ITINERARY DAYS & ACTIVITIES
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

-- 7. STUDENT ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.visit_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.industrial_visits(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status enrollment_status NOT NULL DEFAULT 'pending',
    parent_consent_verified BOOLEAN NOT NULL DEFAULT FALSE,
    parent_consent_url TEXT,
    fee_cleared BOOLEAN NOT NULL DEFAULT FALSE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    UNIQUE(visit_id, student_id)
);

-- 8. LOGISTICS: VEHICLES & HOTEL ROOMS
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.industrial_visits(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    registration_no TEXT NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    driver_name TEXT NOT NULL,
    driver_phone TEXT NOT NULL,
    pickup_point TEXT NOT NULL,
    pickup_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transport_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.visit_enrollments(id) ON DELETE CASCADE,
    seat_number TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(vehicle_id, seat_number),
    UNIQUE(enrollment_id)
);

CREATE TABLE IF NOT EXISTS public.accommodations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.industrial_visits(id) ON DELETE CASCADE,
    hotel_name TEXT NOT NULL,
    address TEXT NOT NULL,
    reception_phone TEXT NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ NOT NULL,
    total_rooms_booked INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.room_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    floor TEXT NOT NULL,
    room_type TEXT NOT NULL DEFAULT 'Deluxe Triple',
    enrollment_id UUID NOT NULL REFERENCES public.visit_enrollments(id) ON DELETE CASCADE,
    is_key_holder BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(enrollment_id)
);

-- 9. ATTENDANCE SESSIONS & SCAN RECORDS
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.industrial_visits(id) ON DELETE CASCADE,
    checkpoint_name TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.visit_enrollments(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'present',
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_method TEXT NOT NULL DEFAULT 'QR Pass Scan',
    verified_by UUID REFERENCES public.profiles(id),
    UNIQUE(session_id, enrollment_id)
);

-- 10. ANNOUNCEMENTS & NOTICES
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES public.industrial_visits(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category notice_category NOT NULL DEFAULT 'general',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    actor_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. EXPLICITLY DISABLE RLS (OPEN ACCESS FOR CLIENT & API)
-- ==============================================================================
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.industrial_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visit_coordinators DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visit_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.itinerary_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visit_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transport_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accommodations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 13. SEED INITIAL USERS & SAMPLE VISIT DATA
-- ==============================================================================
-- Seed Profiles for Student, Coordinator, and Admin
INSERT INTO public.profiles (id, email, full_name, role, department, academic_batch, roll_number)
VALUES 
    (gen_random_uuid(), 'fahad@college.edu', 'Fahad Bin Hashim', 'student', 'Computer Science & Engineering', 'Batch 2023-27 (Semester 5)', 'CS-2026-084'),
    (gen_random_uuid(), 'coordinator@college.edu', 'Dr. Rajesh Kumar', 'coordinator', 'Computer Science & Engineering', 'Faculty', 'FAC-CSE-012'),
    (gen_random_uuid(), 'admin@college.edu', 'Prof. K. S. Venkatesh', 'admin', 'Academic Affairs', 'Dean', 'ADM-DEAN-001')
ON CONFLICT (email) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    academic_batch = EXCLUDED.academic_batch,
    roll_number = EXCLUDED.roll_number;

-- Seed Master Industrial Visit
INSERT INTO public.industrial_visits (
    id, code, title, department, academic_batch, host_companies, 
    destination_city, destination_state, start_date, end_date, capacity, status, learning_objectives
)
VALUES (
    gen_random_uuid(),
    'CSE-2026-AHM',
    'Industrial Visit 2026 — GIFT City & Tech Infrastructure',
    'Computer Science & Engineering',
    'Batch 2023-27 (Semester 5)',
    'Gujarat International Finance Tec-City (GIFT) & ISRO SAC',
    'Gandhinagar & Ahmedabad',
    'Gujarat',
    '2026-12-05',
    '2026-12-08',
    135,
    'published',
    'FinTech architectures, cloud server datacenters, automated green infrastructure, and satellite telemetry.'
)
ON CONFLICT (code) DO NOTHING;
