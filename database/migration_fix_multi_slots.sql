-- =========================================================================
-- AmSlot Multi-Slot Fix & Cleanup Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- =========================================================================

-- 1. CLEAN UP TEAM AB02 DUPLICATE SLOTS (Keep ONLY Monday 19th Oct)
-- This frees up their accidental reservations on Friday 16th and Tuesday 20th!
DO $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Find group AB02
  SELECT id INTO v_group_id FROM public.groups WHERE name ILIKE '%AB02%' LIMIT 1;

  IF v_group_id IS NOT NULL THEN
    -- Release all slots for AB02 EXCEPT on Oct 19th
    UPDATE public.slots
    SET group_id = NULL, status = 'AVAILABLE'
    WHERE group_id = v_group_id
      AND event_id NOT IN (
        SELECT id FROM public.events WHERE date = '2026-10-19'
      );
    
    RAISE NOTICE 'Cleaned up duplicate slots for group AB02. Kept 19th Oct slot.';
  END IF;
END $$;


-- 2. UPDATE book_slot TO RELEASE ANY PREVIOUS SLOT ACROSS THE ENTIRE PROJECT
-- This prevents any team from ever holding multiple slots across different days!
CREATE OR REPLACE FUNCTION public.book_slot(p_slot_id UUID, p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot_status TEXT;
  v_event_id UUID;
  v_project_id UUID;
  v_group_course_id UUID;
  v_event_course_id UUID;
BEGIN
  -- 1) Lock specific slot row
  SELECT status, event_id INTO v_slot_status, v_event_id 
  FROM public.slots 
  WHERE id = p_slot_id FOR UPDATE;

  -- 2) Check availability
  IF v_slot_status != 'AVAILABLE' THEN
    RAISE EXCEPTION 'Concurrency Error: Slot is already booked by another user!';
    RETURN FALSE;
  END IF;

  -- 3) Security check
  SELECT course_id INTO v_group_course_id FROM public.groups WHERE id = p_group_id;
  SELECT p.id, p.course_id INTO v_project_id, v_event_course_id 
  FROM public.events e 
  JOIN public.projects p ON e.project_id = p.id 
  WHERE e.id = v_event_id;
  
  IF v_group_course_id != v_event_course_id THEN
    RAISE EXCEPTION 'Security Error: This group does not belong to the course this slot is for.';
    RETURN FALSE;
  END IF;

  -- 4) Atomically release any previous slot booked by this group for this ENTIRE review project!
  UPDATE public.slots 
  SET group_id = NULL, status = 'AVAILABLE'
  WHERE event_id IN (SELECT id FROM public.events WHERE project_id = v_project_id)
    AND group_id = p_group_id;

  -- 5) Book the new slot
  UPDATE public.slots 
  SET group_id = p_group_id, status = 'BOOKED'
  WHERE id = p_slot_id;

  RETURN TRUE;
END;
$$;


-- 3. ADD HELPER RPC FUNCTION TO RELEASE A SPECIFIC SLOT BY ID
CREATE OR REPLACE FUNCTION public.release_specific_slot(p_slot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.slots 
  SET group_id = NULL, status = 'AVAILABLE'
  WHERE id = p_slot_id;

  RETURN TRUE;
END;
$$;
