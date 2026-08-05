-- Nebula change #2: single source of truth for roles.
--
-- EWD carries role in two places: profiles.role (user_role enum: teacher/
-- student, set at signup, used only by handle_new_user/create_student_
-- relationship/sync_missing_profiles) and user_roles (app_role enum:
-- admin/teacher/student, the table every RLS policy and has_role()/
-- is_teacher() actually check). Nebula keeps only user_roles.
--
-- No RLS policy needs touching here — none of the copied policies read
-- profiles.role, they already all go through has_role()/user_roles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role)
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile/role for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_student_relationship(student_user_id uuid, teacher_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.has_role(teacher_user_id, 'teacher'::public.app_role) then
    return json_build_object('error','Only teachers can create student relationships');
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

alter table public.profiles drop column role;
drop type public.user_role;
