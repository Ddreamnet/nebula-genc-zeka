-- Nebula group lesson feature, part 2: make lesson completion/undo
-- group-aware (atomic all-or-nothing across both members, derived from
-- LIVE students.group_id at call time — a 1-member "group" behaves
-- exactly like a solo student, which is what we want), and stamp
-- group_id on newly generated lesson_instances rows going forward.
-- Signatures are UNCHANGED — no frontend call-site changes needed.

CREATE OR REPLACE FUNCTION public.rpc_complete_lesson_internal(p_instance_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seed lesson_instances%ROWTYPE;
  v_group_id uuid;
  v_partner_student_id uuid;
  v_instances lesson_instances[];
  v_row lesson_instances%ROWTYPE;
  v_current_cycle integer;
  v_first_planned_id uuid;
  v_total_minutes integer := 0;
  v_duration_minutes integer;
BEGIN
  SELECT * INTO v_seed
  FROM lesson_instances
  WHERE id = p_instance_id AND teacher_id = p_teacher_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Instance not found');
  END IF;

  SELECT group_id INTO v_group_id FROM students
  WHERE student_id = v_seed.student_id AND teacher_id = p_teacher_id;

  IF v_group_id IS NOT NULL THEN
    SELECT student_id INTO v_partner_student_id
    FROM students
    WHERE group_id = v_group_id AND teacher_id = p_teacher_id AND student_id <> v_seed.student_id
    LIMIT 1;
  END IF;

  -- Lock every affected row in a fixed order (by student_id) to avoid
  -- deadlocks if both members' completions are ever triggered concurrently.
  SELECT array_agg(sub.* ORDER BY sub.student_id) INTO v_instances
  FROM (
    SELECT * FROM lesson_instances
    WHERE teacher_id = p_teacher_id
      AND lesson_date = v_seed.lesson_date
      AND start_time = v_seed.start_time
      AND student_id IN (v_seed.student_id, v_partner_student_id)
    ORDER BY student_id
    FOR UPDATE
  ) sub;

  IF v_partner_student_id IS NOT NULL AND (v_instances IS NULL OR array_length(v_instances, 1) < 2) THEN
    RETURN json_build_object('success', false, 'error', 'Grup arkadaşının bu tarih/saatte eşleşen bir dersi yok');
  END IF;

  -- Validate every row BEFORE writing anything (all-or-nothing).
  FOREACH v_row IN ARRAY v_instances LOOP
    IF v_row.status = 'completed' THEN
      RETURN json_build_object('success', false, 'error', 'Already completed');
    END IF;

    SELECT package_cycle INTO v_current_cycle
    FROM student_lesson_tracking
    WHERE student_id = v_row.student_id AND teacher_id = p_teacher_id;
    IF v_current_cycle IS NULL THEN
      v_current_cycle := 1;
    END IF;

    SELECT id INTO v_first_planned_id
    FROM lesson_instances
    WHERE student_id = v_row.student_id
      AND teacher_id = p_teacher_id
      AND status = 'planned'
      AND package_cycle = v_current_cycle
    ORDER BY lesson_date ASC, start_time ASC
    LIMIT 1;

    IF v_first_planned_id IS NULL OR v_first_planned_id != v_row.id THEN
      RETURN json_build_object('success', false, 'error', 'Not the next completable lesson');
    END IF;
  END LOOP;

  -- All validated — perform every write.
  FOREACH v_row IN ARRAY v_instances LOOP
    SELECT package_cycle INTO v_current_cycle
    FROM student_lesson_tracking
    WHERE student_id = v_row.student_id AND teacher_id = p_teacher_id;
    IF v_current_cycle IS NULL THEN
      v_current_cycle := 1;
    END IF;

    v_duration_minutes := EXTRACT(EPOCH FROM (v_row.end_time - v_row.start_time)) / 60;
    v_total_minutes := v_total_minutes + v_duration_minutes;

    UPDATE lesson_instances
    SET status = 'completed', updated_at = now()
    WHERE id = v_row.id;

    INSERT INTO teacher_balance (teacher_id, total_minutes, completed_regular_lessons, regular_lessons_minutes)
    VALUES (p_teacher_id, v_duration_minutes, 1, v_duration_minutes)
    ON CONFLICT (teacher_id) DO UPDATE SET
      total_minutes = teacher_balance.total_minutes + v_duration_minutes,
      completed_regular_lessons = teacher_balance.completed_regular_lessons + 1,
      regular_lessons_minutes = teacher_balance.regular_lessons_minutes + v_duration_minutes,
      updated_at = now();

    INSERT INTO balance_events (teacher_id, event_type, amount_minutes, instance_id, student_id, package_cycle)
    VALUES (p_teacher_id, 'lesson_complete', v_duration_minutes, v_row.id, v_row.student_id, v_current_cycle);
  END LOOP;

  RETURN json_build_object('success', true, 'duration_minutes', v_total_minutes, 'completed_count', array_length(v_instances, 1));
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_undo_complete_lesson_internal(p_instance_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seed lesson_instances%ROWTYPE;
  v_group_id uuid;
  v_partner_student_id uuid;
  v_instances lesson_instances[];
  v_row lesson_instances%ROWTYPE;
  v_current_cycle integer;
  v_last_completed_id uuid;
  v_total_minutes integer := 0;
  v_duration_minutes integer;
BEGIN
  SELECT * INTO v_seed
  FROM lesson_instances
  WHERE id = p_instance_id AND teacher_id = p_teacher_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Instance not found');
  END IF;

  SELECT group_id INTO v_group_id FROM students
  WHERE student_id = v_seed.student_id AND teacher_id = p_teacher_id;

  IF v_group_id IS NOT NULL THEN
    SELECT student_id INTO v_partner_student_id
    FROM students
    WHERE group_id = v_group_id AND teacher_id = p_teacher_id AND student_id <> v_seed.student_id
    LIMIT 1;
  END IF;

  SELECT array_agg(sub.* ORDER BY sub.student_id) INTO v_instances
  FROM (
    SELECT * FROM lesson_instances
    WHERE teacher_id = p_teacher_id
      AND lesson_date = v_seed.lesson_date
      AND start_time = v_seed.start_time
      AND student_id IN (v_seed.student_id, v_partner_student_id)
    ORDER BY student_id
    FOR UPDATE
  ) sub;

  IF v_partner_student_id IS NOT NULL AND (v_instances IS NULL OR array_length(v_instances, 1) < 2) THEN
    RETURN json_build_object('success', false, 'error', 'Grup arkadaşının bu tarih/saatte eşleşen bir dersi yok');
  END IF;

  FOREACH v_row IN ARRAY v_instances LOOP
    IF v_row.status != 'completed' THEN
      RETURN json_build_object('success', false, 'error', 'Instance is not completed');
    END IF;

    SELECT package_cycle INTO v_current_cycle
    FROM student_lesson_tracking
    WHERE student_id = v_row.student_id AND teacher_id = p_teacher_id;
    IF v_current_cycle IS NULL THEN
      v_current_cycle := 1;
    END IF;

    SELECT id INTO v_last_completed_id
    FROM lesson_instances
    WHERE student_id = v_row.student_id
      AND teacher_id = p_teacher_id
      AND status = 'completed'
      AND package_cycle = v_current_cycle
    ORDER BY lesson_date DESC, start_time DESC
    LIMIT 1;

    IF v_last_completed_id IS NULL OR v_last_completed_id != v_row.id THEN
      RETURN json_build_object('success', false, 'error', 'Can only undo the most recent completed lesson');
    END IF;
  END LOOP;

  FOREACH v_row IN ARRAY v_instances LOOP
    SELECT package_cycle INTO v_current_cycle
    FROM student_lesson_tracking
    WHERE student_id = v_row.student_id AND teacher_id = p_teacher_id;
    IF v_current_cycle IS NULL THEN
      v_current_cycle := 1;
    END IF;

    v_duration_minutes := EXTRACT(EPOCH FROM (v_row.end_time - v_row.start_time)) / 60;
    v_total_minutes := v_total_minutes + v_duration_minutes;

    UPDATE lesson_instances SET status = 'planned', updated_at = now() WHERE id = v_row.id;

    UPDATE teacher_balance SET
      total_minutes = GREATEST(0, total_minutes - v_duration_minutes),
      completed_regular_lessons = GREATEST(0, completed_regular_lessons - 1),
      regular_lessons_minutes = GREATEST(0, regular_lessons_minutes - v_duration_minutes),
      updated_at = now()
    WHERE teacher_id = p_teacher_id;

    INSERT INTO balance_events (teacher_id, event_type, amount_minutes, instance_id, student_id, package_cycle)
    VALUES (p_teacher_id, 'lesson_undo', -v_duration_minutes, v_row.id, v_row.student_id, v_current_cycle);

    DELETE FROM admin_notifications
    WHERE student_id = v_row.student_id
      AND teacher_id = p_teacher_id
      AND notification_type = 'last_lesson_warning'
      AND created_at > (CURRENT_DATE - INTERVAL '1 day');
  END LOOP;

  RETURN json_build_object('success', true, 'duration_minutes', v_total_minutes);
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
  v_group_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_record_id
      AND teacher_id = p_teacher_id
      AND student_id = p_student_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Student record not found for this teacher');
  END IF;

  SELECT group_id INTO v_group_id
  FROM public.students
  WHERE id = p_student_record_id AND teacher_id = p_teacher_id;

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
        INSERT INTO lesson_instances (student_id, teacher_id, lesson_number, lesson_date, start_time, end_time, status, package_cycle, group_id)
        VALUES (p_student_user_id, p_teacher_id, v_lesson_num, v_start_date,
                (v_json_slot->>'startTime')::time, (v_json_slot->>'endTime')::time, 'planned', v_current_cycle, v_group_id);
      END IF;
    END LOOP;
    v_start_date := v_start_date + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'instances_created', v_instances_created);
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
  v_group_id uuid;
BEGIN
  SELECT group_id INTO v_group_id
  FROM public.students
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;

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
        INSERT INTO lesson_instances (student_id, teacher_id, lesson_number, lesson_date, start_time, end_time, status, package_cycle, group_id)
        VALUES (p_student_id, p_teacher_id, v_lesson_num, v_start_date,
                (v_slot->>'startTime')::time, (v_slot->>'endTime')::time, 'planned', v_new_cycle, v_group_id);
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
  v_group_id uuid;
BEGIN
  SELECT group_id INTO v_group_id
  FROM public.students
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;

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
          start_time, end_time, status, package_cycle, group_id
        ) VALUES (
          p_student_id, p_teacher_id, v_lesson_num, v_start_date,
          (v_slot->>'startTime')::time, (v_slot->>'endTime')::time,
          'planned', v_current_cycle, v_group_id
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
;
