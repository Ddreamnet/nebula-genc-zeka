-- Nebula group lesson feature, part 1: cross-teacher trigger fix, new
-- linkage columns, group-management RPCs (admin-only), and a
-- SECURITY DEFINER RPC for topic completion (closes a standing RLS gap:
-- `topics` has no INSERT/UPDATE/DELETE policy for teachers at all today,
-- only admin ALL + teacher/student SELECT — the existing client code in
-- teacher-student-topics.tsx that does a raw `topics.update()` as the
-- teacher should be failing RLS silently. This RPC fixes that AND gives
-- us a single transaction for the 2-row group cascade).

-- ============================================================
-- 1) Fix: validate_max_group_members didn't check that the group
--    belongs to the same teacher as the student being assigned.
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_max_group_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.groups g WHERE g.id = NEW.group_id AND g.teacher_id = NEW.teacher_id
    ) THEN
      RAISE EXCEPTION 'Group does not belong to this student''s teacher';
    END IF;

    IF (SELECT COUNT(*) FROM public.students WHERE group_id = NEW.group_id AND id <> NEW.id) >= 2 THEN
      RAISE EXCEPTION 'A group can have at most 2 students';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 2) New linkage columns — pair two independent per-student rows
--    (topics/resources have no shared identity across students today).
--    Stamped once at authoring time, never rewritten retroactively.
-- ============================================================
alter table public.topics add column group_link_id uuid;
create index idx_topics_group_link_id on public.topics using btree (group_link_id) where group_link_id is not null;

alter table public.resources add column group_link_id uuid;
create index idx_resources_group_link_id on public.resources using btree (group_link_id) where group_link_id is not null;

-- ============================================================
-- 3) RLS: drop the unused teacher_manage_own_groups policy on `groups`.
--    Group management is admin-only by design; leaving a live policy
--    that *permits* teacher self-service is a footgun for later.
-- ============================================================
drop policy if exists teacher_manage_own_groups on public.groups;

-- ============================================================
-- 4) Group-management RPCs (admin-only — no teacher wrapper, mirrors
--    the existing rpc_manual_balance_adjust precedent of an
--    intentionally admin-only action with no teacher-initiated path).
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_create_group_internal(p_teacher_id uuid, p_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
BEGIN
  IF NOT public.has_role(p_teacher_id, 'teacher'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Target user is not a teacher');
  END IF;

  INSERT INTO public.groups (teacher_id, name)
  VALUES (p_teacher_id, p_name)
  RETURNING id INTO v_group_id;

  RETURN json_build_object('success', true, 'group_id', v_group_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_rename_group_internal(p_group_id uuid, p_teacher_id uuid, p_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.groups WHERE id = p_group_id AND teacher_id = p_teacher_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Group not found for this teacher');
  END IF;

  UPDATE public.groups SET name = p_name, updated_at = now()
  WHERE id = p_group_id AND teacher_id = p_teacher_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_add_student_to_group_internal(p_student_record_id uuid, p_group_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_record_id AND teacher_id = p_teacher_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Student record not found for this teacher');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND teacher_id = p_teacher_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Group not found for this teacher');
  END IF;

  BEGIN
    UPDATE public.students
    SET group_id = p_group_id
    WHERE id = p_student_record_id AND teacher_id = p_teacher_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_remove_student_from_group_internal(p_student_record_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_record_id AND teacher_id = p_teacher_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Student record not found for this teacher');
  END IF;

  UPDATE public.students
  SET group_id = NULL
  WHERE id = p_student_record_id AND teacher_id = p_teacher_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_group_internal(p_group_id uuid, p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.groups WHERE id = p_group_id AND teacher_id = p_teacher_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Group not found for this teacher');
  END IF;

  UPDATE public.students SET group_id = NULL
  WHERE group_id = p_group_id AND teacher_id = p_teacher_id;

  DELETE FROM public.groups WHERE id = p_group_id AND teacher_id = p_teacher_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_create_group(p_teacher_id uuid, p_name text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can create a group' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_admin_create_group_internal(p_teacher_id, p_name);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_rename_group(p_group_id uuid, p_teacher_id uuid, p_name text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can rename a group' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_admin_rename_group_internal(p_group_id, p_teacher_id, p_name);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_add_student_to_group(p_student_record_id uuid, p_group_id uuid, p_teacher_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can add a student to a group' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_admin_add_student_to_group_internal(p_student_record_id, p_group_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_remove_student_from_group(p_student_record_id uuid, p_teacher_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can remove a student from a group' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_admin_remove_student_from_group_internal(p_student_record_id, p_teacher_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_group(p_group_id uuid, p_teacher_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can delete a group' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_admin_delete_group_internal(p_group_id, p_teacher_id);
END;
$function$;

-- ============================================================
-- 5) Topic completion RPCs (teacher + admin), group-cascade aware.
--    Cascade is re-derived from LIVE students.group_id at toggle time,
--    not from the persisted group_link_id alone (that tag is historical).
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_toggle_topic_completion_internal(p_topic_id uuid, p_teacher_id uuid, p_is_completed boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id uuid;
  v_group_link_id uuid;
  v_completed_at timestamptz;
  v_sibling_id uuid;
  v_cascaded boolean := false;
BEGIN
  SELECT student_id, group_link_id INTO v_student_id, v_group_link_id
  FROM public.topics
  WHERE id = p_topic_id AND teacher_id = p_teacher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Topic not found for this teacher');
  END IF;

  v_completed_at := CASE WHEN p_is_completed THEN now() ELSE NULL END;

  UPDATE public.topics
  SET is_completed = p_is_completed, completed_at = v_completed_at, updated_at = now()
  WHERE id = p_topic_id;

  IF v_group_link_id IS NOT NULL THEN
    SELECT t.id INTO v_sibling_id
    FROM public.topics t
    JOIN public.students s_this ON s_this.student_id = v_student_id AND s_this.teacher_id = p_teacher_id
    JOIN public.students s_other ON s_other.student_id = t.student_id AND s_other.teacher_id = p_teacher_id
    WHERE t.group_link_id = v_group_link_id
      AND t.student_id <> v_student_id
      AND t.teacher_id = p_teacher_id
      AND s_this.group_id IS NOT NULL
      AND s_this.group_id = s_other.group_id
    LIMIT 1;

    IF v_sibling_id IS NOT NULL THEN
      UPDATE public.topics
      SET is_completed = p_is_completed, completed_at = v_completed_at, updated_at = now()
      WHERE id = v_sibling_id;
      v_cascaded := true;
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'cascaded', v_cascaded);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_toggle_topic_completion(p_topic_id uuid, p_is_completed boolean)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::public.app_role) THEN
    RAISE EXCEPTION 'Only teachers can toggle topic completion' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_toggle_topic_completion_internal(p_topic_id, auth.uid(), p_is_completed);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_toggle_topic_completion(p_topic_id uuid, p_teacher_id uuid, p_is_completed boolean)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can toggle topic completion on behalf of a teacher' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.rpc_toggle_topic_completion_internal(p_topic_id, p_teacher_id, p_is_completed);
END;
$function$;

-- ============================================================
-- 6) Grants — lock down internals, open only the public wrappers.
-- ============================================================
REVOKE ALL ON FUNCTION public.rpc_admin_create_group_internal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_rename_group_internal(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_add_student_to_group_internal(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_remove_student_from_group_internal(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_delete_group_internal(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_toggle_topic_completion_internal(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.rpc_admin_create_group(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_rename_group(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_add_student_to_group(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_remove_student_from_group(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_delete_group(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_toggle_topic_completion(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_admin_toggle_topic_completion(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_admin_create_group(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_rename_group(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_add_student_to_group(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_remove_student_from_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_toggle_topic_completion(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_toggle_topic_completion(uuid, uuid, boolean) TO authenticated;
;
