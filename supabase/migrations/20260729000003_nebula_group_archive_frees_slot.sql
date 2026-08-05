-- Archiving a grouped student should free their group slot for a
-- replacement (the surviving groupmate keeps their own group_id
-- untouched, per the "group persists at 1 member" decision).
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
  SET is_archived = true, archived_at = now(), group_id = NULL
  WHERE id = p_student_record_id AND teacher_id = p_teacher_id;

  DELETE FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_id
    AND status = 'planned';
  GET DIAGNOSTICS v_deleted_planned = ROW_COUNT;

  RETURN json_build_object('success', true, 'deleted_planned_instances', v_deleted_planned);
END;
$function$;
