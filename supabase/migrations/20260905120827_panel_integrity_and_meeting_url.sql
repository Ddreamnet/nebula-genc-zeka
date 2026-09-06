-- =====================================================================
-- Panel integrity pass. Four unrelated holes that all share one shape:
-- the client believed something the database never agreed to.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Teachers could not write students.about_text -- and were told they could.
--
-- `students` had exactly three policies: admin ALL, student SELECT, teacher
-- SELECT. StudentAboutDialog runs `update(...).eq('student_id', ...)` straight
-- from the teacher's browser, so RLS matched zero rows and PostgREST answered
-- 204 with NO error -- which the dialog read as success and reported as
-- "Bilgiler kaydedildi". Every note a teacher wrote was silently discarded.
--
-- Scoped to their own students, and WITH CHECK repeats the predicate so a
-- teacher cannot reassign a student to somebody else by updating teacher_id.
-- ---------------------------------------------------------------------
drop policy if exists teacher_update_own_students on public.students;
create policy teacher_update_own_students on public.students
  as permissive for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. Nothing anywhere enforced end_time > start_time.
--
-- Not the create form, not the edit form, not the database. And
-- rpc_complete_lesson_internal pays the teacher with
--   EXTRACT(EPOCH FROM (end_time - start_time)) / 60
-- so a slot saved as 15:00-14:00 SUBTRACTS 60 minutes from teacher_balance
-- and writes a negative balance_events row. That is a money bug, so the
-- guarantee belongs here rather than in a form that can be bypassed.
--
-- Verified clean before adding: 0 violating rows across all three tables.
-- ---------------------------------------------------------------------
alter table public.student_lessons
  drop constraint if exists student_lessons_time_order,
  add  constraint student_lessons_time_order check (end_time > start_time);

alter table public.student_lessons
  drop constraint if exists student_lessons_day_of_week_check,
  add  constraint student_lessons_day_of_week_check check (day_of_week between 0 and 6);

alter table public.lesson_instances
  drop constraint if exists lesson_instances_time_order,
  add  constraint lesson_instances_time_order check (end_time > start_time);

alter table public.trial_lessons
  drop constraint if exists trial_lessons_time_order,
  add  constraint trial_lessons_time_order check (end_time > start_time);

-- ---------------------------------------------------------------------
-- 3. There was no way to give a student the link to their own lesson.
--
-- No column, no form field, no UI -- the closest thing was student_lessons.note,
-- a free-text field rendered as plain text in one view of the weekly grid.
-- The link hangs off the slot rather than the teacher so a group can keep its
-- own room, and so changing one slot's room never touches another's.
--
-- The CHECK is deliberately loose (https + no whitespace) rather than a
-- provider allow-list: Zoom, Meet, Teams and Whereby all have different
-- shapes, and the only property that actually matters is that the value is a
-- real https URL and not a sentence somebody typed.
-- ---------------------------------------------------------------------
alter table public.student_lessons
  add column if not exists meeting_url text;

alter table public.student_lessons
  drop constraint if exists student_lessons_meeting_url_https,
  add  constraint student_lessons_meeting_url_https
       check (meeting_url is null or (meeting_url ~ '^https://[^[:space:]]+$' and length(meeting_url) <= 2048));

comment on column public.student_lessons.meeting_url is
  'Zoom/Meet/Teams room for this weekly slot. Read by the student dashboard''s "join today''s lesson" button.';

-- ---------------------------------------------------------------------
-- 4. teacher_view_global_resources never checked who was asking.
--
-- The predicate was `EXISTS (SELECT 1 FROM global_topics gt WHERE gt.id =
-- global_topic_resources.global_topic_id)` -- true for every row that has a
-- parent, with auth.uid() appearing nowhere. Any authenticated account,
-- including one with no role at all, could read every global resource.
-- ---------------------------------------------------------------------
drop policy if exists teacher_view_global_resources on public.global_topic_resources;
create policy teacher_view_global_resources on public.global_topic_resources
  as permissive for select to authenticated
  using (has_role(auth.uid(), 'teacher'::app_role) or has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- 5. lesson_reminder_log had RLS on and no policies at all.
--
-- Functionally that was already closed (only service_role bypasses RLS), but
-- it read as an oversight rather than a decision -- and Supabase's own linter
-- flags it as one. Stating the intent explicitly: the reminder worker writes
-- it with the service key, admins can read it, nobody else touches it.
-- ---------------------------------------------------------------------
drop policy if exists admin_view_lesson_reminder_log on public.lesson_reminder_log;
create policy admin_view_lesson_reminder_log on public.lesson_reminder_log
  as permissive for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- 6. Two missing indexes on paths that run on every panel load.
--
-- The rest of the schema is well covered; these two were the gaps.
--
--  * topics: every student-topic load is
--    `.eq('student_id', ...).order('order_index')`, and the table had nothing
--    but its primary key and a partial index on group_link_id -- so that read
--    was a sequential scan plus a sort, on the query the admin and teacher
--    panels run for EVERY expanded student.
--
--  * notifications: the bell polls
--    `.eq('recipient_id', ...).order('created_at' desc).limit(20)`. There were
--    separate indexes on teacher_id and on created_at, but none on
--    recipient_id -- which is both what the query filters by AND what the RLS
--    policy checks, so neither existing index could serve it.
-- ---------------------------------------------------------------------
create index if not exists idx_topics_student_order
  on public.topics using btree (student_id, order_index);

create index if not exists idx_notifications_recipient_created
  on public.notifications using btree (recipient_id, created_at desc);
