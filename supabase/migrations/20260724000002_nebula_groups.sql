-- Nebula change #1: group lessons (EWD is 1:1 only, Nebula supports 2-student groups).
--
-- Design: a group belongs to one teacher. A student's row in `students`
-- (the existing teacher<->student relationship table) optionally points at
-- a group via group_id. lesson_instances also gets a group_id so a shared
-- group lesson slot is visible as one row per student (not merged into a
-- single shared row) — this keeps every existing per-student RLS policy,
-- RPC (rpc_complete_lesson, balance tracking, etc.) working unmodified,
-- since they all key off student_id already.
--
-- Group membership is capped at 2 students via trigger, mirroring the
-- existing trg_validate_max_lessons pattern on student_lessons.
--
-- Visibility default: a student only ever sees their OWN students /
-- lesson_instances rows (unchanged existing policies) — being in the same
-- group does NOT by itself let one student see another's rows. Flagged
-- to Fatih as an open question for the playground `generations` policy;
-- revisit here too if group-mates should see each other's lesson data.

create table public.groups (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groups add constraint groups_pkey primary key (id);
alter table public.groups add constraint groups_teacher_id_fkey foreign key (teacher_id) references public.profiles(user_id);

create index idx_groups_teacher_id on public.groups using btree (teacher_id);

create trigger trg_set_updated_at_groups before update on public.groups
  for each row execute function public.update_updated_at_column();

alter table public.students add column group_id uuid;
alter table public.students add constraint students_group_id_fkey foreign key (group_id) references public.groups(id) on delete set null;
create index idx_students_group_id on public.students using btree (group_id);

alter table public.lesson_instances add column group_id uuid;
alter table public.lesson_instances add constraint lesson_instances_group_id_fkey foreign key (group_id) references public.groups(id) on delete set null;
create index idx_lesson_instances_group_id on public.lesson_instances using btree (group_id);

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

create trigger trg_validate_max_group_members before insert or update of group_id on public.students
  for each row execute function public.validate_max_group_members();

alter table public.groups enable row level security;

create policy admin_full_access_groups on public.groups for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy teacher_manage_own_groups on public.groups for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy student_view_own_group on public.groups for select to authenticated
  using (exists (select 1 from students s where s.group_id = groups.id and s.student_id = auth.uid()));
