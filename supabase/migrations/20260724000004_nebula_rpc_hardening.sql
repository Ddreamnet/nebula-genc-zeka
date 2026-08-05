-- Nebula hardening pass — NOT YET APPLIED, review before running.
--
-- Problem: every RPC that mutates teacher-scoped data (lesson completion,
-- balance, student archive/restore/delete, schedule sync, package reset,
-- student relationship creation) took p_teacher_id / teacher_user_id as a
-- caller-supplied parameter instead of deriving it from auth.uid(). Any
-- authenticated user could pass someone else's teacher id and act on their
-- data, because these functions are SECURITY DEFINER (they bypass RLS by
-- design, so nothing else was stopping them).
--
-- Fix, per function that took a teacher id:
--   1. Body moved into <name>_internal(..., p_teacher_id uuid) — trusted,
--      NOT exposed to anon/authenticated, only callable from the two
--      wrappers below (or manually via SQL editor / service_role).
--   2. Public teacher-facing wrapper <name>(...) with NO teacher_id param
--      — requires has_role(auth.uid(), 'teacher'), calls the internal
--      function with auth.uid() as the teacher.
--   3. Public admin-facing wrapper rpc_admin_<name>(..., p_teacher_id)
--      — requires has_role(auth.uid(), 'admin'), calls the internal
--      function with the given target teacher_id. Kept as a distinct
--      function on purpose so the admin path is never silently reachable
--      through the normal teacher call.
--
-- Extra fix found while doing this (not just the parameter swap):
-- rpc_archive_student / rpc_restore_student / rpc_delete_student mutated
-- the `students` row by id alone, with NO teacher_id filter on that
-- specific UPDATE/DELETE — p_teacher_id was only used for the *other*
-- side-effect queries (lesson_instances cleanup etc.), not for the
-- students-table write itself. So the parameter-trust fix alone would NOT
-- have closed the hole for those three. Added an explicit ownership check
-- (`id = p_student_record_id AND teacher_id = p_teacher_id AND student_id
-- = p_student_user_id`) at the top of each _internal, before any write.
--
-- Deliberately NOT touched here (flagged, not fixed — no caller exists
-- yet for either, revisit before building their UI):
--   - update_global_topics_order(jsonb) / update_global_resources_order(jsonb)
--     take arbitrary ids with zero ownership check at all (any teacher
--     could reorder another teacher's global topics/resources). Left
--     un-granted to authenticated below so it's inert for now.
--   - sync_missing_profiles() is an ops/backfill utility with no auth
--     check of its own. Left un-granted to authenticated — reachable only
--     via SQL editor / service_role, which is how a one-off repair script
--     should be run anyway.
--
-- rpc_manual_balance_adjust is different in kind: nothing in the RLS
-- model lets a teacher write their own balance (only
-- admin_full_access_teacher_balance / balance_events do), so this was
-- always meant as an admin correction tool, not a teacher self-service
-- call. Hardened in place (kept its signature, added an admin-only gate)
-- rather than split into a teacher/admin pair — there is no legitimate
-- teacher-initiated version of "manually adjust my own balance".

-- ============================================================
-- Closes a LIVE hole introduced by the role-cleanup migration
-- (already applied): handle_new_user() is SECURITY DEFINER and
-- bypasses user_roles RLS entirely by design, but it trusted
-- raw_user_meta_data->>'role' — which is client-supplied signup
-- metadata — and cast it straight to app_role, which includes
-- 'admin'. Anyone could currently self-signup as admin via
-- supabase.auth.signUp({ options: { data: { role: 'admin' } } }).
-- Fix: only ever honor 'teacher'/'student' from signup metadata,
-- default to 'student' for anything else (including 'admin').
-- Promoting someone to admin now only happens through the existing
-- admin_manage_all_roles RLS path (an admin inserting the row).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_requested_role text := NEW.raw_user_meta_data->>'role';
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User')
  );

  v_role := CASE
    WHEN v_requested_role IN ('teacher', 'student') THEN v_requested_role::public.app_role
    ELSE 'student'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile/role for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- Drop the old insecure signatures
-- ============================================================

drop function if exists public.rpc_complete_lesson(uuid, uuid);
drop function if exists public.rpc_undo_complete_lesson(uuid, uuid);
drop function if exists public.rpc_complete_trial_lesson(uuid, uuid);
drop function if exists public.rpc_undo_trial_lesson(uuid, uuid);
drop function if exists public.rpc_reset_package(uuid, uuid, jsonb);
drop function if exists public.rpc_sync_student_schedule(uuid, uuid, jsonb, integer);
drop function if exists public.rpc_archive_student(uuid, uuid, uuid);
drop function if exists public.rpc_restore_student(uuid, uuid, uuid);
drop function if exists public.rpc_delete_student(uuid, uuid, uuid);
drop function if exists public.create_student_relationship(uuid, uuid);

-- ============================================================
-- Internal (trusted, never granted to anon/authenticated)
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_complete_lesson_internal(p_instance_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_instance lesson_instances%ROWTYPE;
  v_duration_minutes integer;
  v_current_cycle integer;
  v_first_planned_id uuid;
BEGIN
  SELECT * INTO v_instance
  FROM lesson_instances
  WHERE id = p_instance_id AND teacher_id = p_teacher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Instance not found');
  END IF;

  IF v_instance.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Already completed');
  END IF;

  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = v_instance.student_id AND teacher_id = p_teacher_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  SELECT id INTO v_first_planned_id
  FROM lesson_instances
  WHERE student_id = v_instance.student_id
    AND teacher_id = p_teacher_id
    AND status = 'planned'
    AND package_cycle = v_current_cycle
  ORDER BY lesson_date ASC, start_time ASC
  LIMIT 1;

  IF v_first_planned_id IS NULL OR v_first_planned_id != p_instance_id THEN
    RETURN json_build_object('success', false, 'error', 'Not the next completable lesson');
  END IF;

  v_duration_minutes := EXTRACT(EPOCH FROM (v_instance.end_time - v_instance.start_time)) / 60;

  UPDATE lesson_instances
  SET status = 'completed', updated_at = now()
  WHERE id = p_instance_id;

  INSERT INTO teacher_balance (teacher_id, total_minutes, completed_regular_lessons, regular_lessons_minutes)
  VALUES (p_teacher_id, v_duration_minutes, 1, v_duration_minutes)
  ON CONFLICT (teacher_id) DO UPDATE SET
    total_minutes = teacher_balance.total_minutes + v_duration_minutes,
    completed_regular_lessons = teacher_balance.completed_regular_lessons + 1,
    regular_lessons_minutes = teacher_balance.regular_lessons_minutes + v_duration_minutes,
    updated_at = now();

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes, instance_id, student_id, package_cycle)
  VALUES (p_teacher_id, 'lesson_complete', v_duration_minutes, p_instance_id, v_instance.student_id, v_current_cycle);

  RETURN json_build_object('success', true, 'duration_minutes', v_duration_minutes);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_undo_complete_lesson_internal(p_instance_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_instance lesson_instances%ROWTYPE;
  v_duration_minutes integer;
  v_current_cycle integer;
  v_last_completed_id uuid;
BEGIN
  SELECT * INTO v_instance
  FROM lesson_instances
  WHERE id = p_instance_id AND teacher_id = p_teacher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Instance not found');
  END IF;

  IF v_instance.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Instance is not completed');
  END IF;

  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = v_instance.student_id AND teacher_id = p_teacher_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  SELECT id INTO v_last_completed_id
  FROM lesson_instances
  WHERE student_id = v_instance.student_id
    AND teacher_id = p_teacher_id
    AND status = 'completed'
    AND package_cycle = v_current_cycle
  ORDER BY lesson_date DESC, start_time DESC
  LIMIT 1;

  IF v_last_completed_id IS NULL OR v_last_completed_id != p_instance_id THEN
    RETURN json_build_object('success', false, 'error', 'Can only undo the most recent completed lesson');
  END IF;

  v_duration_minutes := EXTRACT(EPOCH FROM (v_instance.end_time - v_instance.start_time)) / 60;

  UPDATE lesson_instances
  SET status = 'planned', updated_at = now()
  WHERE id = p_instance_id;

  UPDATE teacher_balance SET
    total_minutes = GREATEST(0, total_minutes - v_duration_minutes),
    completed_regular_lessons = GREATEST(0, completed_regular_lessons - 1),
    regular_lessons_minutes = GREATEST(0, regular_lessons_minutes - v_duration_minutes),
    updated_at = now()
  WHERE teacher_id = p_teacher_id;

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes, instance_id, student_id, package_cycle)
  VALUES (p_teacher_id, 'lesson_undo', -v_duration_minutes, p_instance_id, v_instance.student_id, v_current_cycle);

  DELETE FROM admin_notifications
  WHERE student_id = v_instance.student_id
    AND teacher_id = p_teacher_id
    AND notification_type = 'last_lesson_warning'
    AND created_at > (CURRENT_DATE - INTERVAL '1 day');

  RETURN json_build_object('success', true, 'duration_minutes', v_duration_minutes);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_complete_trial_lesson_internal(p_trial_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial trial_lessons%ROWTYPE;
  v_duration_minutes integer;
BEGIN
  SELECT * INTO v_trial
  FROM trial_lessons
  WHERE id = p_trial_id AND teacher_id = p_teacher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trial lesson not found');
  END IF;

  IF v_trial.is_completed THEN
    RETURN json_build_object('success', false, 'error', 'Already completed');
  END IF;

  v_duration_minutes := EXTRACT(EPOCH FROM (v_trial.end_time - v_trial.start_time)) / 60;

  UPDATE trial_lessons SET is_completed = true, updated_at = now()
  WHERE id = p_trial_id;

  INSERT INTO teacher_balance (teacher_id, total_minutes, completed_trial_lessons, trial_lessons_minutes)
  VALUES (p_teacher_id, v_duration_minutes, 1, v_duration_minutes)
  ON CONFLICT (teacher_id) DO UPDATE SET
    total_minutes = teacher_balance.total_minutes + v_duration_minutes,
    completed_trial_lessons = teacher_balance.completed_trial_lessons + 1,
    trial_lessons_minutes = teacher_balance.trial_lessons_minutes + v_duration_minutes,
    updated_at = now();

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes)
  VALUES (p_teacher_id, 'trial_complete', v_duration_minutes);

  RETURN json_build_object('success', true, 'duration_minutes', v_duration_minutes);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_undo_trial_lesson_internal(p_trial_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial trial_lessons%ROWTYPE;
  v_duration_minutes integer;
BEGIN
  SELECT * INTO v_trial
  FROM trial_lessons
  WHERE id = p_trial_id AND teacher_id = p_teacher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trial lesson not found');
  END IF;

  IF NOT v_trial.is_completed THEN
    RETURN json_build_object('success', false, 'error', 'Trial lesson is not completed');
  END IF;

  v_duration_minutes := EXTRACT(EPOCH FROM (v_trial.end_time - v_trial.start_time)) / 60;

  UPDATE trial_lessons SET is_completed = false, updated_at = now()
  WHERE id = p_trial_id;

  UPDATE teacher_balance SET
    total_minutes = GREATEST(0, total_minutes - v_duration_minutes),
    completed_trial_lessons = GREATEST(0, completed_trial_lessons - 1),
    trial_lessons_minutes = GREATEST(0, trial_lessons_minutes - v_duration_minutes),
    updated_at = now()
  WHERE teacher_id = p_teacher_id;

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes)
  VALUES (p_teacher_id, 'trial_undo', -v_duration_minutes);

  RETURN json_build_object('success', true, 'duration_minutes', v_duration_minutes);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_reset_package_internal(p_student_id uuid, p_teacher_id uuid, p_template_slots jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_cycle integer;
  v_new_cycle integer;
  v_weekly_count integer;
  v_total_lessons integer;
  v_slot jsonb;
  v_day_of_week integer;
  v_start_date date;
  v_last_completed_date date;
  v_last_completed_time time;
  v_lesson_num integer := 0;
  v_max_iterations integer := 200;
  v_iter integer := 0;
BEGIN
  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  v_new_cycle := v_current_cycle + 1;
  v_weekly_count := jsonb_array_length(p_template_slots);
  v_total_lessons := v_weekly_count * 4;

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes, student_id, package_cycle, notes)
  VALUES (p_teacher_id, 'balance_reset', 0, p_student_id, v_current_cycle,
          'Package reset from cycle ' || v_current_cycle || ' to ' || v_new_cycle);

  DELETE FROM lesson_instances
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND package_cycle = v_current_cycle
    AND status = 'planned';

  UPDATE student_lesson_tracking
  SET package_cycle = v_new_cycle, updated_at = now()
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;

  v_start_date := CURRENT_DATE;

  SELECT lesson_date, start_time
  INTO v_last_completed_date, v_last_completed_time
  FROM lesson_instances
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND status = 'completed'
  ORDER BY lesson_date DESC, start_time DESC
  LIMIT 1;

  IF v_last_completed_date IS NOT NULL THEN
    v_start_date := GREATEST(CURRENT_DATE, v_last_completed_date);
  END IF;

  WHILE v_lesson_num < v_total_lessons AND v_iter < v_max_iterations LOOP
    v_iter := v_iter + 1;
    FOR v_slot IN
      SELECT s.value FROM jsonb_array_elements(p_template_slots) AS s(value)
      ORDER BY (s.value->>'dayOfWeek')::integer, (s.value->>'startTime')
    LOOP
      v_day_of_week := (v_slot->>'dayOfWeek')::integer;
      IF EXTRACT(DOW FROM v_start_date) = v_day_of_week AND v_lesson_num < v_total_lessons THEN
        IF v_start_date = v_last_completed_date
           AND v_last_completed_time IS NOT NULL
           AND (v_slot->>'startTime')::time <= v_last_completed_time THEN
          CONTINUE;
        END IF;
        v_lesson_num := v_lesson_num + 1;
        INSERT INTO lesson_instances (student_id, teacher_id, lesson_number, lesson_date, start_time, end_time, status, package_cycle)
        VALUES (p_student_id, p_teacher_id, v_lesson_num, v_start_date,
                (v_slot->>'startTime')::time, (v_slot->>'endTime')::time, 'planned', v_new_cycle);
      END IF;
    END LOOP;
    v_start_date := v_start_date + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'new_cycle', v_new_cycle, 'instances_created', v_lesson_num);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_sync_student_schedule_internal(p_student_id uuid, p_teacher_id uuid, p_slots jsonb, p_lessons_per_week integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_cycle integer;
  v_completed_count integer;
  v_total_lessons integer;
  v_planned_count integer;
  v_slot jsonb;
  v_day_of_week integer;
  v_start_date date;
  v_last_completed_date date;
  v_last_completed_time time;
  v_lesson_num integer;
  v_max_iterations integer := 200;
  v_iter integer := 0;
  v_instances_created integer := 0;
BEGIN
  DELETE FROM student_lessons
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;

  INSERT INTO student_lessons (student_id, teacher_id, day_of_week, start_time, end_time)
  SELECT
    p_student_id,
    p_teacher_id,
    (slot->>'dayOfWeek')::integer,
    (slot->>'startTime')::time,
    (slot->>'endTime')::time
  FROM jsonb_array_elements(p_slots) AS slot;

  INSERT INTO student_lesson_tracking (student_id, teacher_id, lessons_per_week)
  VALUES (p_student_id, p_teacher_id, p_lessons_per_week)
  ON CONFLICT (student_id, teacher_id)
  DO UPDATE SET lessons_per_week = p_lessons_per_week, updated_at = now();

  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  SELECT count(*) INTO v_completed_count
  FROM lesson_instances
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND package_cycle = v_current_cycle
    AND status = 'completed';

  v_total_lessons := p_lessons_per_week * 4;
  v_planned_count := GREATEST(0, v_total_lessons - v_completed_count);

  DELETE FROM lesson_instances
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND package_cycle = v_current_cycle
    AND status = 'planned'
    AND is_manual_override = false;

  v_start_date := CURRENT_DATE;
  v_last_completed_date := NULL;
  v_last_completed_time := NULL;

  IF v_completed_count > 0 THEN
    SELECT lesson_date, start_time
    INTO v_last_completed_date, v_last_completed_time
    FROM lesson_instances
    WHERE student_id = p_student_id
      AND teacher_id = p_teacher_id
      AND package_cycle = v_current_cycle
      AND status = 'completed'
    ORDER BY lesson_date DESC, start_time DESC
    LIMIT 1;

    v_start_date := GREATEST(CURRENT_DATE, COALESCE(v_last_completed_date, CURRENT_DATE));
  END IF;

  v_planned_count := v_planned_count - (
    SELECT count(*)
    FROM lesson_instances
    WHERE student_id = p_student_id
      AND teacher_id = p_teacher_id
      AND package_cycle = v_current_cycle
      AND status = 'planned'
      AND is_manual_override = true
  );

  IF v_planned_count <= 0 THEN
    RETURN json_build_object('success', true, 'instances_created', 0, 'completed_count', v_completed_count);
  END IF;

  SELECT COALESCE(MAX(lesson_number), 0) INTO v_lesson_num
  FROM lesson_instances
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND package_cycle = v_current_cycle;

  WHILE v_instances_created < v_planned_count AND v_iter < v_max_iterations LOOP
    v_iter := v_iter + 1;
    FOR v_slot IN
      SELECT s.value FROM jsonb_array_elements(p_slots) AS s(value)
      ORDER BY (s.value->>'dayOfWeek')::integer, (s.value->>'startTime')
    LOOP
      v_day_of_week := (v_slot->>'dayOfWeek')::integer;
      IF EXTRACT(DOW FROM v_start_date) = v_day_of_week AND v_instances_created < v_planned_count THEN
        IF v_start_date = v_last_completed_date
           AND v_last_completed_time IS NOT NULL
           AND (v_slot->>'startTime')::time <= v_last_completed_time THEN
          CONTINUE;
        END IF;
        v_lesson_num := v_lesson_num + 1;
        v_instances_created := v_instances_created + 1;
        INSERT INTO lesson_instances (
          student_id, teacher_id, lesson_number, lesson_date,
          start_time, end_time, status, package_cycle
        ) VALUES (
          p_student_id, p_teacher_id, v_lesson_num, v_start_date,
          (v_slot->>'startTime')::time, (v_slot->>'endTime')::time,
          'planned', v_current_cycle
        );
      END IF;
    END LOOP;
    v_start_date := v_start_date + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'instances_created', v_instances_created,
    'completed_count', v_completed_count,
    'cycle', v_current_cycle
  );
END;
$function$;

-- p_student_record_id / p_teacher_id / p_student_user_id are now verified
-- to belong together before any write — see header comment.
CREATE OR REPLACE FUNCTION public.rpc_archive_student_internal(p_student_record_id uuid, p_student_user_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_planned integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_record_id
      AND teacher_id = p_teacher_id
      AND student_id = p_student_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Student record not found for this teacher');
  END IF;

  UPDATE students
  SET is_archived = true, archived_at = now()
  WHERE id = p_student_record_id AND teacher_id = p_teacher_id;

  DELETE FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_id
    AND status = 'planned';
  GET DIAGNOSTICS v_deleted_planned = ROW_COUNT;

  RETURN json_build_object('success', true, 'deleted_planned_instances', v_deleted_planned);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_restore_student_internal(p_student_record_id uuid, p_student_user_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slot record;
  v_slots jsonb := '[]'::jsonb;
  v_weekly_count integer := 0;
  v_total_lessons integer;
  v_completed_count integer;
  v_remaining integer;
  v_current_cycle integer;
  v_start_date date;
  v_last_completed_date date;
  v_last_completed_time time;
  v_lesson_num integer;
  v_day_of_week integer;
  v_max_iterations integer := 200;
  v_iter integer := 0;
  v_json_slot jsonb;
  v_instances_created integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_record_id
      AND teacher_id = p_teacher_id
      AND student_id = p_student_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Student record not found for this teacher');
  END IF;

  UPDATE students
  SET is_archived = false, archived_at = null
  WHERE id = p_student_record_id AND teacher_id = p_teacher_id;

  FOR v_slot IN
    SELECT day_of_week, start_time, end_time
    FROM student_lessons
    WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id
    ORDER BY day_of_week, start_time
  LOOP
    v_weekly_count := v_weekly_count + 1;
    v_slots := v_slots || jsonb_build_object(
      'dayOfWeek', v_slot.day_of_week,
      'startTime', v_slot.start_time::text,
      'endTime', v_slot.end_time::text
    );
  END LOOP;

  IF v_weekly_count = 0 THEN
    RETURN json_build_object('success', true, 'instances_created', 0, 'message', 'No template slots');
  END IF;

  SELECT package_cycle INTO v_current_cycle
  FROM student_lesson_tracking
  WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  SELECT count(*) INTO v_completed_count
  FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_id
    AND status = 'completed'
    AND package_cycle = v_current_cycle;

  v_total_lessons := v_weekly_count * 4;
  v_remaining := v_total_lessons - v_completed_count;

  IF v_remaining <= 0 THEN
    RETURN json_build_object('success', true, 'instances_created', 0, 'message', 'All lessons already completed');
  END IF;

  v_start_date := CURRENT_DATE;
  v_last_completed_date := NULL;
  v_last_completed_time := NULL;

  SELECT lesson_date, start_time
  INTO v_last_completed_date, v_last_completed_time
  FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_id
    AND status = 'completed'
  ORDER BY lesson_date DESC, start_time DESC
  LIMIT 1;

  IF v_last_completed_date IS NOT NULL THEN
    v_start_date := GREATEST(CURRENT_DATE, v_last_completed_date);
  END IF;

  SELECT COALESCE(MAX(lesson_number), 0) INTO v_lesson_num
  FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_id
    AND package_cycle = v_current_cycle;

  WHILE v_instances_created < v_remaining AND v_iter < v_max_iterations LOOP
    v_iter := v_iter + 1;
    FOR v_json_slot IN
      SELECT s.value FROM jsonb_array_elements(v_slots) AS s(value)
      ORDER BY (s.value->>'dayOfWeek')::integer, (s.value->>'startTime')
    LOOP
      v_day_of_week := (v_json_slot->>'dayOfWeek')::integer;
      IF EXTRACT(DOW FROM v_start_date) = v_day_of_week AND v_instances_created < v_remaining THEN
        IF v_start_date = v_last_completed_date
           AND v_last_completed_time IS NOT NULL
           AND (v_json_slot->>'startTime')::time <= v_last_completed_time THEN
          CONTINUE;
        END IF;
        v_lesson_num := v_lesson_num + 1;
        v_instances_created := v_instances_created + 1;
        INSERT INTO lesson_instances (student_id, teacher_id, lesson_number, lesson_date, start_time, end_time, status, package_cycle)
        VALUES (p_student_user_id, p_teacher_id, v_lesson_num, v_start_date,
                (v_json_slot->>'startTime')::time, (v_json_slot->>'endTime')::time, 'planned', v_current_cycle);
      END IF;
    END LOOP;
    v_start_date := v_start_date + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'instances_created', v_instances_created);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_delete_student_internal(p_student_record_id uuid, p_student_user_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_topic_ids uuid[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_record_id
      AND teacher_id = p_teacher_id
      AND student_id = p_student_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Student record not found for this teacher');
  END IF;

  SELECT array_agg(id) INTO v_topic_ids
  FROM topics
  WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id;

  IF v_topic_ids IS NOT NULL AND array_length(v_topic_ids, 1) > 0 THEN
    DELETE FROM resources WHERE topic_id = ANY(v_topic_ids);
    DELETE FROM topics WHERE id = ANY(v_topic_ids);
  END IF;

  DELETE FROM student_resource_completion WHERE student_id = p_student_user_id;
  DELETE FROM student_lesson_tracking WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id;
  DELETE FROM student_lessons WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id;
  DELETE FROM homework_submissions WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id;
  DELETE FROM lesson_instances WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id;
  DELETE FROM notifications WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id;
  DELETE FROM admin_notifications WHERE student_id = p_student_user_id AND teacher_id = p_teacher_id;

  DELETE FROM students WHERE id = p_student_record_id AND teacher_id = p_teacher_id;
  DELETE FROM profiles WHERE user_id = p_student_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_student_relationship_internal(student_user_id uuid, teacher_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.has_role(teacher_user_id, 'teacher'::public.app_role) then
    return json_build_object('error','Only teachers can create student relationships');
  end if;

  -- Without this, any teacher could pass an arbitrary user_id (another
  -- teacher, an admin, an unrelated student) and claim them as their own
  -- student — which then grants read/write access to that user's rows
  -- everywhere RLS keys off teacher_owns_student()/the students table.
  if not public.has_role(student_user_id, 'student'::public.app_role) then
    return json_build_object('error','Target user is not a student');
  end if;

  if exists (
    select 1 from public.students
    where teacher_id = teacher_user_id and student_id = student_user_id
  ) then
    return json_build_object('error','Student relationship already exists');
  end if;

  insert into public.students (teacher_id, student_id)
  values (teacher_user_id, student_user_id);

  return json_build_object('success',true,'message','Student relationship created successfully');
exception
  when others then
    return json_build_object('error', sqlerrm);
end;
$function$;

-- ============================================================
-- Public teacher-facing wrappers — no teacher id param, auth.uid()
-- derived, has_role('teacher') required.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_complete_lesson(p_instance_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can complete lessons' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_complete_lesson_internal(p_instance_id, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_undo_complete_lesson(p_instance_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can undo a completed lesson' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_undo_complete_lesson_internal(p_instance_id, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_complete_trial_lesson(p_trial_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can complete trial lessons' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_complete_trial_lesson_internal(p_trial_id, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_undo_trial_lesson(p_trial_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can undo a completed trial lesson' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_undo_trial_lesson_internal(p_trial_id, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_reset_package(p_student_id uuid, p_template_slots jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can reset a package' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_reset_package_internal(p_student_id, auth.uid(), p_template_slots);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_sync_student_schedule(p_student_id uuid, p_slots jsonb, p_lessons_per_week integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can sync a student schedule' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_sync_student_schedule_internal(p_student_id, auth.uid(), p_slots, p_lessons_per_week);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_archive_student(p_student_record_id uuid, p_student_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can archive a student' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_archive_student_internal(p_student_record_id, p_student_user_id, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_restore_student(p_student_record_id uuid, p_student_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can restore a student' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_restore_student_internal(p_student_record_id, p_student_user_id, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_delete_student(p_student_record_id uuid, p_student_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can delete a student' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_delete_student_internal(p_student_record_id, p_student_user_id, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_student_relationship(student_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can create student relationships' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.create_student_relationship_internal(student_user_id, auth.uid());
END;
$function$;

-- ============================================================
-- Public admin-facing wrappers — kept as distinct functions on
-- purpose, never merged into the teacher path above.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_complete_lesson(p_instance_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can complete a lesson on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_complete_lesson_internal(p_instance_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_undo_complete_lesson(p_instance_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can undo a completed lesson on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_undo_complete_lesson_internal(p_instance_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_complete_trial_lesson(p_trial_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can complete a trial lesson on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_complete_trial_lesson_internal(p_trial_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_undo_trial_lesson(p_trial_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can undo a completed trial lesson on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_undo_trial_lesson_internal(p_trial_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_reset_package(p_student_id uuid, p_teacher_id uuid, p_template_slots jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can reset a package on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_reset_package_internal(p_student_id, p_teacher_id, p_template_slots);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_sync_student_schedule(p_student_id uuid, p_teacher_id uuid, p_slots jsonb, p_lessons_per_week integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can sync a student schedule on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_sync_student_schedule_internal(p_student_id, p_teacher_id, p_slots, p_lessons_per_week);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_archive_student(p_student_record_id uuid, p_student_user_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can archive a student on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_archive_student_internal(p_student_record_id, p_student_user_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_restore_student(p_student_record_id uuid, p_student_user_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can restore a student on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_restore_student_internal(p_student_record_id, p_student_user_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_student(p_student_record_id uuid, p_student_user_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can delete a student on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_delete_student_internal(p_student_record_id, p_student_user_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_student_relationship(student_user_id uuid, teacher_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can create a student relationship on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.create_student_relationship_internal(student_user_id, teacher_user_id);
END;
$function$;

-- ============================================================
-- rpc_manual_balance_adjust: admin-only correction tool, hardened
-- in place (signature unchanged, no teacher-initiated path exists
-- or should exist).
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_manual_balance_adjust(p_teacher_id uuid, p_amount_minutes integer, p_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can manually adjust a teacher balance' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE teacher_balance SET
    manual_adjustment_minutes = manual_adjustment_minutes + p_amount_minutes,
    total_minutes = total_minutes + p_amount_minutes,
    updated_at = now()
  WHERE teacher_id = p_teacher_id;

  INSERT INTO balance_events (teacher_id, event_type, amount_minutes, notes)
  VALUES (p_teacher_id, 'manual_adjust', p_amount_minutes, p_notes);

  RETURN json_build_object('success', true);
END;
$function$;

-- ============================================================
-- Lock every public-schema function down, then explicitly re-open
-- only what's actually needed.
-- ============================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END;
$$;

-- Read-only helpers required by RLS policy expressions themselves —
-- without these grants every policy that calls has_role()/
-- teacher_owns_student() breaks for the `authenticated` role.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_owns_student(uuid, uuid) TO authenticated;

-- Teacher-facing RPCs.
GRANT EXECUTE ON FUNCTION public.rpc_complete_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_undo_complete_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_complete_trial_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_undo_trial_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_reset_package(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sync_student_schedule(uuid, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_archive_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_restore_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_delete_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_relationship(uuid) TO authenticated;

-- Admin-facing RPCs (internally gated by has_role(auth.uid(),'admin'),
-- same pattern as the existing admin_full_access_* RLS policies).
GRANT EXECUTE ON FUNCTION public.rpc_admin_complete_lesson(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_undo_complete_lesson(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_complete_trial_lesson(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_undo_trial_lesson(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_reset_package(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_sync_student_schedule(uuid, uuid, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_archive_student(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_restore_student(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_student(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_student_relationship(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_manual_balance_adjust(uuid, integer, text) TO authenticated;

-- Everything else in public (trigger functions, the *_internal
-- helpers, is_teacher, sync_missing_profiles, update_global_topics_order,
-- update_global_resources_order) stays revoked from anon/authenticated:
--   - trigger functions don't need it — Postgres fires triggers without
--     checking the triggering role's EXECUTE grant on the trigger function.
--   - *_internal helpers are only ever called from the wrappers above,
--     which run as the function owner and can always call their own
--     definer's functions regardless of anon/authenticated grants.
--   - is_teacher/sync_missing_profiles/update_global_*_order have no
--     current caller; service_role / SQL editor can still reach them.
