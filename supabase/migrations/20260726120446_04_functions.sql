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

CREATE OR REPLACE FUNCTION public.complete_global_topic_resources()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.is_completed = true then
    insert into public.student_resource_completion (student_id, resource_id, is_completed, completed_at)
    select new.student_id, gtr.id, true, now()
    from public.global_topic_resources gtr
    join public.global_topics gt on gt.id = gtr.global_topic_id
    where gt.title = new.title and gt.teacher_id = new.teacher_id
    on conflict (student_id, resource_id)
      do update set is_completed = true, completed_at = now(), updated_at = now();
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.complete_topic_resources()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN IF NEW.is_completed = true AND (OLD IS NULL OR OLD.is_completed = false) THEN INSERT INTO public.student_resource_completion (student_id, resource_id, is_completed, completed_at) SELECT NEW.student_id, r.id, true, now() FROM public.resources r WHERE r.topic_id = NEW.id ON CONFLICT (student_id, resource_id) DO UPDATE SET is_completed = true, completed_at = now(), updated_at = now(); ELSIF NEW.is_completed = false AND OLD.is_completed = true THEN UPDATE public.student_resource_completion SET is_completed = false, completed_at = null, updated_at = now() WHERE student_id = NEW.student_id AND resource_id IN (SELECT r.id FROM public.resources r WHERE r.topic_id = NEW.id); END IF;

RETURN NEW; END; $function$;

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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_teacher(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'teacher'::app_role
  )
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_last_lesson()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_lessons INTEGER;
  completed_count INTEGER;
  teacher_name TEXT;
  student_name TEXT;
  v_student_id uuid;
  v_teacher_id uuid;
  v_package_cycle integer;
  v_is_archived boolean;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    v_student_id := NEW.student_id;
    v_teacher_id := NEW.teacher_id;
    v_package_cycle := NEW.package_cycle;

    SELECT is_archived INTO v_is_archived
    FROM students
    WHERE student_id = v_student_id AND teacher_id = v_teacher_id;

    IF v_is_archived THEN
      RETURN NEW;
    END IF;

    SELECT lessons_per_week * 4 INTO total_lessons
    FROM student_lesson_tracking
    WHERE student_id = v_student_id AND teacher_id = v_teacher_id;

    IF total_lessons IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT count(*) INTO completed_count
    FROM lesson_instances
    WHERE student_id = v_student_id
      AND teacher_id = v_teacher_id
      AND package_cycle = v_package_cycle
      AND status = 'completed';

    IF completed_count = total_lessons - 1 THEN
      SELECT full_name INTO teacher_name FROM profiles WHERE user_id = v_teacher_id;
      SELECT full_name INTO student_name FROM profiles WHERE user_id = v_student_id;

      IF NOT EXISTS (
        SELECT 1 FROM admin_notifications
        WHERE teacher_id = v_teacher_id
        AND student_id = v_student_id
        AND notification_type = 'last_lesson_warning'
        AND created_at > (CURRENT_DATE - INTERVAL '30 days')
      ) THEN
        INSERT INTO admin_notifications (notification_type, teacher_id, student_id, message)
        VALUES (
          'last_lesson_warning',
          v_teacher_id,
          v_student_id,
          COALESCE(teacher_name, 'Öğretmen') || ' öğretmenin ' || COALESCE(student_name, 'Öğrenci') || ' öğrencisinin son bir dersi kaldı!'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_homework_upload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.uploaded_by_user_id = NEW.student_id THEN
    INSERT INTO public.notifications (teacher_id, student_id, homework_id, recipient_id)
    VALUES (NEW.teacher_id, NEW.student_id, NEW.id, NEW.teacher_id);
  END IF;

  IF NEW.uploaded_by_user_id = NEW.teacher_id THEN
    INSERT INTO public.notifications (teacher_id, student_id, homework_id, recipient_id)
    VALUES (NEW.teacher_id, NEW.student_id, NEW.id, NEW.student_id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_lesson_instance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slot_changed boolean;
  v_status_activated boolean;
BEGIN
  IF NEW.status NOT IN ('planned', 'completed') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1
      FROM public.lesson_instances
      WHERE student_id = NEW.student_id
        AND lesson_date = NEW.lesson_date
        AND start_time = NEW.start_time
        AND status IN ('planned', 'completed')
    ) THEN
      RAISE EXCEPTION
        'Bu öğrencinin % tarihinde % saatinde zaten bir dersi var. Aynı slotta birden fazla aktif ders olamaz.',
        NEW.lesson_date, NEW.start_time
        USING ERRCODE = 'unique_violation';
    END IF;
    RETURN NEW;
  END IF;

  v_slot_changed :=
       NEW.student_id  IS DISTINCT FROM OLD.student_id
    OR NEW.lesson_date IS DISTINCT FROM OLD.lesson_date
    OR NEW.start_time  IS DISTINCT FROM OLD.start_time;

  v_status_activated :=
       (OLD.status NOT IN ('planned', 'completed'))
   AND (NEW.status IN ('planned', 'completed'));

  IF NOT (v_slot_changed OR v_status_activated) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lesson_instances
    WHERE student_id = NEW.student_id
      AND lesson_date = NEW.lesson_date
      AND start_time = NEW.start_time
      AND status IN ('planned', 'completed')
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION
      'Bu öğrencinin % tarihinde % saatinde zaten bir dersi var. Aynı slotta birden fazla aktif ders olamaz.',
      NEW.lesson_date, NEW.start_time
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
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

CREATE OR REPLACE FUNCTION public.rpc_admin_grant_playground_ore(p_student_id uuid, p_amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_new_balance numeric;
begin
  if not has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can grant ore' using errcode = 'insufficient_privilege';
  end if;

  insert into public.playground_credits (user_id, balance_ore)
  values (p_student_id, p_amount)
  on conflict (user_id) do update set balance_ore = public.playground_credits.balance_ore + p_amount, updated_at = now()
  returning balance_ore into v_new_balance;

  return v_new_balance;
end;
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

CREATE OR REPLACE FUNCTION public.rpc_attach_video_job(p_generation_id uuid, p_job_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.ai_generations
  set openrouter_job_id = p_job_id
  where id = p_generation_id and user_id = auth.uid();
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.rpc_finalize_generation(p_generation_id uuid, p_status text, p_real_cost_usd numeric DEFAULT NULL::numeric, p_output_path text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_ore numeric;
begin
  select user_id, ore_charged into v_owner, v_ore from public.ai_generations where id = p_generation_id;

  if v_owner is null or v_owner <> v_uid then
    raise exception 'Not found or not owner' using errcode = 'insufficient_privilege';
  end if;

  update public.ai_generations
  set status = p_status,
      real_cost_usd = coalesce(p_real_cost_usd, real_cost_usd),
      output_path = coalesce(p_output_path, output_path)
  where id = p_generation_id;

  if p_status = 'failed' then
    update public.playground_credits set balance_ore = balance_ore + v_ore, updated_at = now() where user_id = v_uid;
  end if;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.rpc_start_generation(p_tool_id text, p_modality text, p_provider_model text, p_ore_cost numeric, p_prompt text)
 RETURNS TABLE(generation_id uuid, success boolean, remaining_ore numeric, error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_anon boolean;
  v_balance numeric;
  v_gen_id uuid;
begin
  if v_uid is null then
    return query select null::uuid, false, 0::numeric, 'not_authenticated';
    return;
  end if;

  select is_anonymous into v_is_anon from auth.users where id = v_uid;

  if p_modality = 'video' and coalesce(v_is_anon, true) then
    return query select null::uuid, false, 0::numeric, 'login_required';
    return;
  end if;

  insert into public.playground_credits (user_id, balance_ore)
  values (v_uid, case when coalesce(v_is_anon, true) then 5 else 20 end)
  on conflict (user_id) do nothing;

  select balance_ore into v_balance from public.playground_credits where user_id = v_uid for update;

  if v_balance < p_ore_cost then
    return query select null::uuid, false, v_balance, 'insufficient_balance';
    return;
  end if;

  update public.playground_credits set balance_ore = balance_ore - p_ore_cost, updated_at = now() where user_id = v_uid;

  insert into public.ai_generations (user_id, tool_id, modality, provider_model, ore_charged, prompt, status)
  values (v_uid, p_tool_id, p_modality, p_provider_model, p_ore_cost, p_prompt, 'pending')
  returning id into v_gen_id;

  return query select v_gen_id, true, (v_balance - p_ore_cost), null::text;
end;
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

  -- Only wipe plain, unshifted planned instances — manual overrides AND
  -- shifted lessons (shift_group_id set via "Sonraki Derse Aktar") must
  -- survive a schedule save, matching EWD's final behavior.
  DELETE FROM lesson_instances
  WHERE student_id = p_student_id
    AND teacher_id = p_teacher_id
    AND package_cycle = v_current_cycle
    AND status = 'planned'
    AND is_manual_override = false
    AND shift_group_id IS NULL;

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
      AND (is_manual_override = true OR shift_group_id IS NOT NULL)
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

CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  synced_profiles integer := 0;
  synced_roles integer := 0;
  user_record record;
begin
  for user_record in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.profiles p on au.id = p.user_id
    where p.user_id is null
  loop
    insert into public.profiles (user_id, email, full_name)
    values (
      user_record.id,
      user_record.email,
      coalesce(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', 'User')
    );
    synced_profiles := synced_profiles + 1;
  end loop;

  for user_record in
    select au.id, au.raw_user_meta_data
    from auth.users au
    left join public.user_roles ur on au.id = ur.user_id
    where ur.user_id is null
  loop
    insert into public.user_roles (user_id, role)
    values (
      user_record.id,
      coalesce((user_record.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role)
    )
    on conflict (user_id, role) do nothing;
    synced_roles := synced_roles + 1;
  end loop;

  return json_build_object(
    'success', true,
    'synced_profiles', synced_profiles,
    'synced_roles', synced_roles,
    'message', format('Synced %s missing profiles and %s missing roles', synced_profiles, synced_roles)
  );
exception
  when others then
    return json_build_object('error', sqlerrm);
end;
$function$;

CREATE OR REPLACE FUNCTION public.teacher_owns_student(_teacher_id uuid, _student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.students
    WHERE teacher_id = _teacher_id
    AND student_id = _student_id
  )
$function$;

CREATE OR REPLACE FUNCTION public.update_global_resources_order(resource_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  resource_order jsonb;
begin
  if not has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can reorder global resources';
  end if;

  for resource_order in select * from jsonb_array_elements(resource_orders)
  loop
    update global_topic_resources
    set order_index = (resource_order->>'order_index')::integer
    where id = (resource_order->>'id')::uuid;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_global_topics_order(topic_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  topic_order jsonb;
begin
  if not has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can reorder global topics';
  end if;

  for topic_order in select * from jsonb_array_elements(topic_orders)
  loop
    update global_topics
    set order_index = (topic_order->>'order_index')::integer
    where id = (topic_order->>'id')::uuid;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.validate_max_group_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.students WHERE group_id = NEW.group_id AND id <> NEW.id) >= 2 THEN
      RAISE EXCEPTION 'A group can have at most 2 students';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_max_lessons_per_week()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN IF (SELECT COUNT(*) FROM public.student_lessons WHERE student_id = NEW.student_id AND week_start_date = NEW.week_start_date) >= 6 THEN RAISE EXCEPTION 'Student cannot have more than 6 lessons per week'; END IF; RETURN NEW; END; $function$;
;
