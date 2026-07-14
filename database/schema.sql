-- AmSlot V2 Schema - Hierarchical Architecture
-- Run this in your Supabase SQL Editor to apply the Course -> Project -> Event hierarchy.

-- 1. Clean Slate (Drops existing V1 tables)
DROP FUNCTION IF EXISTS public.book_slot CASCADE;
DROP TABLE IF EXISTS public.slots CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.course_enrollments CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Base Users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('STUDENT', 'PROFESSOR')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Courses (The Professor's Workspace)
CREATE TABLE public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  professor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Linear Algebra"
  section TEXT NOT NULL, -- e.g., "Section C"
  join_code TEXT UNIQUE NOT NULL, -- e.g., "X8B2M"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Course Enrollments (Students joining a class)
CREATE TABLE public.course_enrollments (
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (course_id, student_id)
);

-- 5. Projects (Specific assignments within a course)
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  max_group_size INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Groups (Formed under a course)
CREATE TABLE public.groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leader_id UUID REFERENCES public.users(id),
  invite_code TEXT UNIQUE NOT NULL, -- Added for joining friends
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Group Members 
CREATE TABLE public.group_members (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, student_id)
);

-- 8. Review Events (The actual review timeline milestone)
CREATE TABLE public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- "Update 2 Meeting"
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Slots (Including the Grading/Notes features!)
CREATE TABLE public.slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL, -- Null means Slot is Available
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'PRESENTED', 'ABSENT')),
  grade TEXT, -- For Professor to assign
  private_notes TEXT, -- For Professor evaluation
  waitlist_queue JSONB DEFAULT '[]'::jsonb, -- Array of waiting group IDs
  version INTEGER DEFAULT 1, -- Optimistic Concurency Version
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. The Critical Concurrency Lock Function (V2)
CREATE OR REPLACE FUNCTION public.book_slot(p_slot_id UUID, p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot_status TEXT;
  v_event_id UUID;
  v_group_project_id UUID;
  v_event_project_id UUID;
BEGIN
  -- 1) Use FOR UPDATE to lock the SPECIFIC slot row we want so no one else can read it until we finish 
  SELECT status, event_id INTO v_slot_status, v_event_id 
  FROM public.slots 
  WHERE id = p_slot_id FOR UPDATE;

  -- 2) Check if it's already taken
  IF v_slot_status != 'AVAILABLE' THEN
    RAISE EXCEPTION 'Concurrency Error: Slot is already booked by another user!';
    RETURN FALSE;
  END IF;

  -- 3) Security/Data Integrity Check: Does the group actually belong to this project?
  SELECT project_id INTO v_group_project_id FROM public.groups WHERE id = p_group_id;
  SELECT project_id INTO v_event_project_id FROM public.events WHERE id = v_event_id;
  
  IF v_group_project_id != v_event_project_id THEN
    RAISE EXCEPTION 'Security Error: This group does not belong to the project this slot is for.';
    RETURN FALSE;
  END IF;

  -- 4) Only ONE slot allowed per group per event!
  IF EXISTS (SELECT 1 FROM public.slots WHERE event_id = v_event_id AND group_id = p_group_id) THEN
    RAISE EXCEPTION 'Policy Error: Your group has already booked a slot for this Review Event.';
    RETURN FALSE;
  END IF;

  -- 5) Book the slot atomically
  UPDATE public.slots 
  SET group_id = p_group_id, status = 'BOOKED'
  WHERE id = p_slot_id;

  RETURN TRUE;
END;
$$;

-- 11. Waitlist Engine
DROP TABLE IF EXISTS public.waitlist_entries CASCADE;
CREATE TABLE public.waitlist_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, group_id) -- A group can only be on a project's waitlist once
);

-- 12. Realtime WebSocket Broadcasting
-- This tells Supabase to push changes from these tables to listening React clients
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist_entries;

-- 13. Row Level Security (RLS) Policies
-- Hardening the database for production readiness.

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- users: Users can read all users but only update themselves
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update themselves" ON public.users FOR UPDATE USING (auth.uid() = id);

-- courses: Professor-only control. Enrolled students can view.
CREATE POLICY "Professors can manage their courses" ON public.courses FOR ALL USING (auth.uid() = professor_id);
CREATE POLICY "Enrolled students can view courses" ON public.courses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = public.courses.id AND student_id = auth.uid())
);

-- course_enrollments: Professors manage. Students can read their own.
CREATE POLICY "Professors view enrollments" ON public.course_enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = public.course_enrollments.course_id AND professor_id = auth.uid())
);
CREATE POLICY "Students join courses" ON public.course_enrollments FOR INSERT WITH CHECK (true); -- Allow enrollment via join code
CREATE POLICY "Students view own enrollment" ON public.course_enrollments FOR SELECT USING (student_id = auth.uid());

-- projects: Professor-only control. Enrolled students view.
CREATE POLICY "Professors manage projects" ON public.projects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = public.projects.course_id AND professor_id = auth.uid())
);
CREATE POLICY "Students view projects" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.course_enrollments WHERE course_id = public.projects.course_id AND student_id = auth.uid())
);

-- groups: Professor-only control. Group members view.
CREATE POLICY "Professors manage groups" ON public.groups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = public.groups.course_id AND c.professor_id = auth.uid())
);
CREATE POLICY "Students manage their groups" ON public.groups FOR ALL USING (auth.uid() = leader_id);
CREATE POLICY "Members view group" ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.groups.id AND student_id = auth.uid())
);

-- events: Professor-only control. Enrolled students view.
CREATE POLICY "Professors manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.courses c ON p.course_id = c.id WHERE p.id = public.events.project_id AND c.professor_id = auth.uid())
);
CREATE POLICY "Students view events" ON public.events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.course_enrollments ce ON p.course_id = ce.course_id WHERE p.id = public.events.project_id AND ce.student_id = auth.uid())
);

-- slots: Professor-only control. Students can read and update (if available).
CREATE POLICY "Professors manage slots" ON public.slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events e JOIN public.projects p ON e.project_id = p.id JOIN public.courses c ON p.course_id = c.id WHERE e.id = public.slots.event_id AND c.professor_id = auth.uid())
);
CREATE POLICY "Students view and book slots" ON public.slots FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e JOIN public.projects p ON e.project_id = p.id JOIN public.course_enrollments ce ON p.course_id = ce.course_id WHERE e.id = public.slots.event_id AND ce.student_id = auth.uid())
);

-- waitlist_entries: Members view/update own. Professors view all.
CREATE POLICY "Professors manage waitlist" ON public.waitlist_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.courses c ON p.course_id = c.id WHERE p.id = public.waitlist_entries.project_id AND c.professor_id = auth.uid())
);
CREATE POLICY "Groups manage own waitlist" ON public.waitlist_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.waitlist_entries.group_id AND student_id = auth.uid())
);
