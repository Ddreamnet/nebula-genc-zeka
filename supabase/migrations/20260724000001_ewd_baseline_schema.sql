-- Baseline schema copied from "English with Dilara" (EWD) Supabase project
-- (hwwpbtcgppzuscbvjkde), schema-only, no data.
--
-- Deliberately excluded / adjusted vs. the EWD source, see chat history:
--   - admin_notification_webhook / notification_webhook triggers dropped:
--     they called supabase_functions.http_request() against EWD's own
--     edge functions with a hardcoded EWD webhook secret baked into the
--     trigger definition. Copying them would have leaked that secret into
--     this repo's git history and pointed at endpoints that don't exist
--     here. Push-notification wiring can be rebuilt for Nebula later.
--   - auth.users had two duplicate triggers both calling handle_new_user()
--     (on_auth_user_created + trg_handle_new_user, evidently migration
--     debt in EWD). Collapsed to a single on_auth_user_created trigger.
--   - A handful of exact-duplicate indexes in EWD were not recreated
--     (idx_profiles_user_id, idx_students_teacher_student,
--     uq_src_student_resource) since they duplicated an existing
--     constraint-backed index on the same columns.

-- ============================================================
-- Enums
-- ============================================================

create type public.user_role as enum ('teacher', 'student');
create type public.app_role as enum ('admin', 'teacher', 'student');

-- ============================================================
-- Tables
-- ============================================================

create table public.profiles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'student'::public.user_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz default now()
);

create table public.students (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid not null,
  created_at timestamptz not null default now(),
  is_archived boolean not null default false,
  archived_at timestamptz,
  about_text text
);
comment on column public.students.about_text is 'Admin-editable notes/information about the student';

create table public.topics (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid not null,
  title text not null,
  description text,
  order_index integer not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid not null default gen_random_uuid(),
  topic_id uuid not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_completed boolean default false,
  completed_at timestamptz,
  resource_type text not null,
  resource_url text not null,
  title text not null,
  description text
);

create table public.student_resource_completion (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  resource_id uuid not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_lessons (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  teacher_id uuid not null,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  week_start_date date not null default (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  note text
);

create table public.global_topics (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null default auth.uid(),
  title text not null,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.global_topic_resources (
  id uuid not null default gen_random_uuid(),
  global_topic_id uuid not null,
  title text not null,
  description text,
  resource_type text not null,
  resource_url text not null,
  order_index integer not null default 0,
  is_completed boolean,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_lesson_tracking (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  teacher_id uuid not null,
  lessons_per_week integer not null,
  month_start_date date not null default (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  package_cycle integer not null default 1
);

create table public.homework_submissions (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  teacher_id uuid not null,
  title text not null,
  description text,
  file_url text not null,
  file_type text not null,
  file_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  uploaded_by_user_id uuid not null default auth.uid(),
  batch_id uuid not null
);

create table public.notifications (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid not null,
  homework_id uuid not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  recipient_id uuid not null,
  push_processing_at timestamptz,
  push_sent_at timestamptz
);

create table public.trial_lessons (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  is_completed boolean not null default false,
  lesson_date date not null default CURRENT_DATE,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_balance (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  total_minutes integer not null default 0,
  completed_regular_lessons integer not null default 0,
  completed_trial_lessons integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  regular_lessons_minutes integer not null default 0,
  trial_lessons_minutes integer not null default 0,
  manual_adjustment_minutes integer not null default 0
);

create table public.payment_history (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  amount_minutes integer not null,
  completed_regular_lessons integer not null default 0,
  completed_trial_lessons integer not null default 0,
  payment_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table public.admin_notifications (
  id uuid not null default gen_random_uuid(),
  notification_type text not null default 'last_lesson_warning'::text,
  teacher_id uuid not null,
  student_id uuid not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  push_processing_at timestamptz,
  push_sent_at timestamptz
);

create table public.push_tokens (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  student_id uuid,
  role text not null,
  platform text not null,
  token text not null,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.lesson_reminder_log (
  id uuid not null default gen_random_uuid(),
  recipient_user_id uuid not null,
  lesson_key text not null,
  lesson_date date not null,
  reminder_type text not null default 'before_10min'::text,
  sent_at timestamptz default now()
);

create table public.blog_posts (
  id uuid not null default gen_random_uuid(),
  title text not null,
  slug text not null,
  excerpt text,
  content text,
  cover_image_url text,
  status text not null default 'draft'::text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_instances (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  teacher_id uuid not null,
  lesson_number integer not null,
  lesson_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'planned'::text,
  original_date date,
  original_start_time time,
  original_end_time time,
  rescheduled_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  package_cycle integer not null default 1,
  shift_group_id uuid,
  is_manual_override boolean not null default false
);

create table public.balance_events (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  event_type text not null,
  amount_minutes integer not null,
  instance_id uuid,
  student_id uuid,
  package_cycle integer,
  created_at timestamptz not null default now(),
  notes text
);

-- ============================================================
-- Constraints (primary keys, unique, check, foreign keys)
-- ============================================================

alter table public.profiles add constraint profiles_pkey primary key (id);
alter table public.profiles add constraint profiles_user_id_key unique (user_id);
alter table public.profiles add constraint profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_roles add constraint user_roles_pkey primary key (id);
alter table public.user_roles add constraint user_roles_user_id_role_key unique (user_id, role);
alter table public.user_roles add constraint user_roles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.students add constraint students_pkey primary key (id);
alter table public.students add constraint students_teacher_id_student_id_key unique (teacher_id, student_id);
alter table public.students add constraint students_teacher_id_fkey foreign key (teacher_id) references public.profiles(user_id);
alter table public.students add constraint students_student_id_fkey foreign key (student_id) references public.profiles(user_id);

alter table public.topics add constraint topics_pkey primary key (id);
alter table public.topics add constraint topics_teacher_id_fkey foreign key (teacher_id) references public.profiles(user_id);
alter table public.topics add constraint topics_student_id_fkey foreign key (student_id) references public.profiles(user_id);

alter table public.resources add constraint resources_pkey primary key (id);
alter table public.resources add constraint resources_topic_id_fkey foreign key (topic_id) references public.topics(id);

alter table public.student_resource_completion add constraint student_resource_completion_pkey primary key (id);
alter table public.student_resource_completion add constraint student_resource_completion_student_id_resource_id_key unique (student_id, resource_id);

alter table public.student_lessons add constraint student_lessons_pkey primary key (id);
alter table public.student_lessons add constraint unique_student_lesson_time unique (student_id, day_of_week, start_time);

alter table public.global_topics add constraint global_topics_pkey primary key (id);
alter table public.global_topics add constraint global_topics_teacher_id_fkey foreign key (teacher_id) references auth.users(id) on delete cascade;

alter table public.global_topic_resources add constraint global_topic_resources_pkey primary key (id);
alter table public.global_topic_resources add constraint global_topic_resources_global_topic_id_fkey foreign key (global_topic_id) references public.global_topics(id);

alter table public.student_lesson_tracking add constraint student_lesson_tracking_pkey primary key (id);
alter table public.student_lesson_tracking add constraint unique_student_teacher_tracking unique (student_id, teacher_id);

alter table public.homework_submissions add constraint homework_submissions_pkey primary key (id);

alter table public.notifications add constraint notifications_pkey primary key (id);
alter table public.notifications add constraint notifications_homework_id_fkey foreign key (homework_id) references public.homework_submissions(id) on delete cascade;

alter table public.trial_lessons add constraint trial_lessons_pkey primary key (id);
alter table public.trial_lessons add constraint trial_lessons_day_of_week_check check (((day_of_week >= 0) and (day_of_week <= 6)));

alter table public.teacher_balance add constraint teacher_balance_pkey primary key (id);
alter table public.teacher_balance add constraint teacher_balance_teacher_id_key unique (teacher_id);
alter table public.teacher_balance add constraint teacher_balance_teacher_id_fkey foreign key (teacher_id) references auth.users(id) on delete cascade;

alter table public.payment_history add constraint payment_history_pkey primary key (id);
alter table public.payment_history add constraint payment_history_teacher_id_fkey foreign key (teacher_id) references auth.users(id) on delete cascade;

alter table public.admin_notifications add constraint admin_notifications_pkey primary key (id);

alter table public.push_tokens add constraint push_tokens_pkey primary key (id);
alter table public.push_tokens add constraint push_tokens_token_key unique (token);
alter table public.push_tokens add constraint push_tokens_role_check check ((role = any (array['teacher'::text, 'student'::text, 'admin'::text])));
alter table public.push_tokens add constraint push_tokens_platform_check check ((platform = any (array['android'::text, 'ios'::text, 'web'::text])));
alter table public.push_tokens add constraint push_tokens_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.lesson_reminder_log add constraint lesson_reminder_log_pkey primary key (id);
alter table public.lesson_reminder_log add constraint lesson_reminder_log_recipient_user_id_lesson_key_lesson_dat_key unique (recipient_user_id, lesson_key, lesson_date, reminder_type);

alter table public.blog_posts add constraint blog_posts_pkey primary key (id);
alter table public.blog_posts add constraint blog_posts_slug_key unique (slug);

alter table public.lesson_instances add constraint lesson_instances_pkey primary key (id);
alter table public.lesson_instances add constraint lesson_instances_student_teacher_cycle_lesson_number_key unique (student_id, teacher_id, package_cycle, lesson_number);

alter table public.balance_events add constraint balance_events_pkey primary key (id);
alter table public.balance_events add constraint balance_events_event_type_check check ((event_type = any (array['lesson_complete'::text, 'lesson_undo'::text, 'trial_complete'::text, 'trial_undo'::text, 'manual_adjust'::text, 'balance_reset'::text, 'data_repair'::text])));

-- ============================================================
-- Standalone indexes (not already created by a constraint above)
-- ============================================================

create index idx_admin_notifications_push_unprocessed on public.admin_notifications using btree (id) where ((push_sent_at is null) and (push_processing_at is null));
create index idx_balance_events_teacher_id on public.balance_events using btree (teacher_id);
create index idx_gtr_topic on public.global_topic_resources using btree (global_topic_id);
create index idx_global_topics_teacher_id on public.global_topics using btree (teacher_id);
create index idx_homework_submissions_batch_id on public.homework_submissions using btree (batch_id);
create index idx_homework_submissions_student_teacher on public.homework_submissions using btree (student_id, teacher_id, created_at desc);
create index idx_lesson_instances_package_cycle on public.lesson_instances using btree (package_cycle);
create index idx_lesson_instances_student on public.lesson_instances using btree (student_id, teacher_id, status);
create index idx_lesson_instances_student_teacher_cycle on public.lesson_instances using btree (student_id, teacher_id, package_cycle);
create index idx_lesson_instances_teacher_date on public.lesson_instances using btree (teacher_id, lesson_date, start_time, end_time);
create index idx_lesson_instances_teacher_status_date on public.lesson_instances using btree (teacher_id, status, lesson_date);
create unique index uniq_active_planned_slot on public.lesson_instances using btree (student_id, lesson_date, start_time) where (status = 'planned'::text);
create index idx_notifications_created_at on public.notifications using btree (created_at desc);
create index idx_notifications_is_read on public.notifications using btree (is_read);
create index idx_notifications_push_unprocessed on public.notifications using btree (id) where ((push_sent_at is null) and (push_processing_at is null));
create index idx_notifications_teacher_id on public.notifications using btree (teacher_id);
create index idx_payment_history_payment_date on public.payment_history using btree (payment_date desc);
create index idx_payment_history_teacher_id on public.payment_history using btree (teacher_id);
create index idx_resources_topic on public.resources using btree (topic_id);
create index idx_student_lessons_student_id on public.student_lessons using btree (student_id);
create index idx_student_lessons_teacher_id on public.student_lessons using btree (teacher_id);
create index idx_student_lessons_week on public.student_lessons using btree (week_start_date);
create index idx_src_student_resource on public.student_resource_completion using btree (student_id, resource_id, is_completed);
create index idx_students_is_archived on public.students using btree (is_archived);
create index idx_students_student_teacher on public.students using btree (student_id, teacher_id);
create index idx_trial_lessons_date on public.trial_lessons using btree (lesson_date);
create index idx_trial_lessons_teacher_date on public.trial_lessons using btree (teacher_id, lesson_date);

-- ============================================================
-- Functions
-- ============================================================

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$ BEGIN INSERT INTO public.profiles (user_id, email, full_name, role) VALUES ( NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'), COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student') ); RETURN NEW; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM; RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  sync_count integer := 0;
  user_record record;
begin
  for user_record in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.profiles p on au.id = p.user_id
    where p.user_id is null
  loop
    insert into public.profiles (user_id, email, full_name, role)
    values (
      user_record.id,
      user_record.email,
      coalesce(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', 'User'),
      coalesce((user_record.raw_user_meta_data->>'role')::public.user_role, 'student')
    );
    sync_count := sync_count + 1;
  end loop;

  return json_build_object('success',true,'synced_profiles',sync_count,'message',format('Synced %s missing profiles', sync_count));
exception
  when others then
    return json_build_object('error', sqlerrm);
end; $function$;

CREATE OR REPLACE FUNCTION public.create_student_relationship(student_user_id uuid, teacher_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not exists (
    select 1 from public.profiles
    where user_id = teacher_user_id and role = 'teacher'
  ) then
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
end; $function$;

CREATE OR REPLACE FUNCTION public.complete_topic_resources()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN IF NEW.is_completed = true AND (OLD IS NULL OR OLD.is_completed = false) THEN INSERT INTO public.student_resource_completion (student_id, resource_id, is_completed, completed_at) SELECT NEW.student_id, r.id, true, now() FROM public.resources r WHERE r.topic_id = NEW.id ON CONFLICT (student_id, resource_id) DO UPDATE SET is_completed = true, completed_at = now(), updated_at = now(); ELSIF NEW.is_completed = false AND OLD.is_completed = true THEN UPDATE public.student_resource_completion SET is_completed = false, completed_at = null, updated_at = now() WHERE student_id = NEW.student_id AND resource_id IN (SELECT r.id FROM public.resources r WHERE r.topic_id = NEW.id); END IF;

RETURN NEW; END; $function$;

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

CREATE OR REPLACE FUNCTION public.validate_max_lessons_per_week()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN IF (SELECT COUNT(*) FROM public.student_lessons WHERE student_id = NEW.student_id AND week_start_date = NEW.week_start_date) >= 6 THEN RAISE EXCEPTION 'Student cannot have more than 6 lessons per week'; END IF; RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_global_topics_order(topic_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  topic_order jsonb;
BEGIN
  FOR topic_order IN SELECT * FROM jsonb_array_elements(topic_orders)
  LOOP
    UPDATE global_topics
    SET order_index = (topic_order->>'order_index')::integer
    WHERE id = (topic_order->>'id')::uuid;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_global_resources_order(resource_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  resource_order jsonb;
BEGIN
  FOR resource_order IN SELECT * FROM jsonb_array_elements(resource_orders)
  LOOP
    UPDATE global_topic_resources
    SET order_index = (resource_order->>'order_index')::integer
    WHERE id = (resource_order->>'id')::uuid;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_archive_student(p_student_record_id uuid, p_student_user_id uuid, p_teacher_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_planned integer;
BEGIN
  UPDATE students
  SET is_archived = true, archived_at = now()
  WHERE id = p_student_record_id;

  DELETE FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_user_id
    AND status = 'planned';
  GET DIAGNOSTICS v_deleted_planned = ROW_COUNT;

  RETURN json_build_object('success', true, 'deleted_planned_instances', v_deleted_planned);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_restore_student(p_student_record_id uuid, p_student_user_id uuid, p_teacher_user_id uuid)
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
  UPDATE students
  SET is_archived = false, archived_at = null
  WHERE id = p_student_record_id;

  FOR v_slot IN
    SELECT day_of_week, start_time, end_time
    FROM student_lessons
    WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id
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
  WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;

  IF v_current_cycle IS NULL THEN
    v_current_cycle := 1;
  END IF;

  SELECT count(*) INTO v_completed_count
  FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_user_id
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
    AND teacher_id = p_teacher_user_id
    AND status = 'completed'
  ORDER BY lesson_date DESC, start_time DESC
  LIMIT 1;

  IF v_last_completed_date IS NOT NULL THEN
    v_start_date := GREATEST(CURRENT_DATE, v_last_completed_date);
  END IF;

  SELECT COALESCE(MAX(lesson_number), 0) INTO v_lesson_num
  FROM lesson_instances
  WHERE student_id = p_student_user_id
    AND teacher_id = p_teacher_user_id
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
        VALUES (p_student_user_id, p_teacher_user_id, v_lesson_num, v_start_date,
                (v_json_slot->>'startTime')::time, (v_json_slot->>'endTime')::time, 'planned', v_current_cycle);
      END IF;
    END LOOP;
    v_start_date := v_start_date + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'instances_created', v_instances_created);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_delete_student(p_student_record_id uuid, p_student_user_id uuid, p_teacher_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_topic_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_topic_ids
  FROM topics
  WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;

  IF v_topic_ids IS NOT NULL AND array_length(v_topic_ids, 1) > 0 THEN
    DELETE FROM resources WHERE topic_id = ANY(v_topic_ids);
    DELETE FROM topics WHERE id = ANY(v_topic_ids);
  END IF;

  DELETE FROM student_resource_completion WHERE student_id = p_student_user_id;
  DELETE FROM student_lesson_tracking WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM student_lessons WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM homework_submissions WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM lesson_instances WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM notifications WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;
  DELETE FROM admin_notifications WHERE student_id = p_student_user_id AND teacher_id = p_teacher_user_id;

  DELETE FROM students WHERE id = p_student_record_id;
  DELETE FROM profiles WHERE user_id = p_student_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_complete_lesson(p_instance_id uuid, p_teacher_id uuid)
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

CREATE OR REPLACE FUNCTION public.rpc_undo_complete_lesson(p_instance_id uuid, p_teacher_id uuid)
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

CREATE OR REPLACE FUNCTION public.rpc_complete_trial_lesson(p_trial_id uuid, p_teacher_id uuid)
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

CREATE OR REPLACE FUNCTION public.rpc_undo_trial_lesson(p_trial_id uuid, p_teacher_id uuid)
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

CREATE OR REPLACE FUNCTION public.rpc_manual_balance_adjust(p_teacher_id uuid, p_amount_minutes integer, p_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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

CREATE OR REPLACE FUNCTION public.rpc_reset_package(p_student_id uuid, p_teacher_id uuid, p_template_slots jsonb)
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

CREATE OR REPLACE FUNCTION public.rpc_sync_student_schedule(p_student_id uuid, p_teacher_id uuid, p_slots jsonb, p_lessons_per_week integer)
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

-- ============================================================
-- Triggers
-- ============================================================

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create trigger trg_set_updated_at_profiles before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger trg_set_updated_at_lessons before update on public.student_lessons for each row execute function public.update_updated_at_column();
create trigger trg_validate_max_lessons before insert or update on public.student_lessons for each row execute function public.validate_max_lessons_per_week();
create trigger trg_set_updated_at_topics before update on public.topics for each row execute function public.update_updated_at_column();
create trigger trg_complete_topic_resources_ins after insert on public.topics for each row execute function public.complete_topic_resources();
create trigger trg_complete_topic_resources_upd after update of is_completed on public.topics for each row when (old.is_completed is distinct from new.is_completed) execute function public.complete_topic_resources();
create trigger trg_complete_topic_resources after update of is_completed on public.topics for each row execute function public.complete_topic_resources();
create trigger trg_complete_global_topic_resources_ins after insert on public.topics for each row execute function public.complete_global_topic_resources();
create trigger trg_complete_global_topic_resources_upd after update of is_completed on public.topics for each row when (old.is_completed is distinct from new.is_completed) execute function public.complete_global_topic_resources();
create trigger trg_set_updated_at_resources before update on public.resources for each row execute function public.update_updated_at_column();
create trigger trg_set_updated_at_src before update on public.student_resource_completion for each row execute function public.update_updated_at_column();
create trigger trg_set_updated_at_global_topics before update on public.global_topics for each row execute function public.update_updated_at_column();
create trigger trg_set_updated_at_global_topic_resources before update on public.global_topic_resources for each row execute function public.update_updated_at_column();
create trigger update_student_lesson_tracking_updated_at before update on public.student_lesson_tracking for each row execute function public.update_updated_at_column();
create trigger on_homework_uploaded after insert on public.homework_submissions for each row execute function public.notify_on_homework_upload();
create trigger update_homework_submissions_updated_at before update on public.homework_submissions for each row execute function public.update_updated_at_column();
create trigger update_trial_lessons_updated_at before update on public.trial_lessons for each row execute function public.update_updated_at_column();
create trigger update_teacher_balance_updated_at before update on public.teacher_balance for each row execute function public.update_updated_at_column();
create trigger update_push_tokens_updated_at before update on public.push_tokens for each row execute function public.update_updated_at_column();
create trigger update_blog_posts_updated_at before update on public.blog_posts for each row execute function public.update_updated_at_column();
create trigger update_lesson_instances_updated_at before update on public.lesson_instances for each row execute function public.update_updated_at_column();
create trigger trg_prevent_duplicate_lesson_instance before insert or update on public.lesson_instances for each row execute function public.prevent_duplicate_lesson_instance();
create trigger notify_last_lesson_trigger after update on public.lesson_instances for each row execute function public.notify_admin_last_lesson();

-- ============================================================
-- Row level security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.students enable row level security;
alter table public.topics enable row level security;
alter table public.resources enable row level security;
alter table public.student_resource_completion enable row level security;
alter table public.student_lessons enable row level security;
alter table public.global_topics enable row level security;
alter table public.global_topic_resources enable row level security;
alter table public.student_lesson_tracking enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.notifications enable row level security;
alter table public.trial_lessons enable row level security;
alter table public.teacher_balance enable row level security;
alter table public.payment_history enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.lesson_reminder_log enable row level security;
alter table public.blog_posts enable row level security;
alter table public.lesson_instances enable row level security;
alter table public.balance_events enable row level security;

-- ============================================================
-- RLS policies
-- ============================================================

create policy admin_full_access_admin_notifications on public.admin_notifications for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));

create policy admin_full_access_balance_events on public.balance_events for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy teacher_view_own_balance_events on public.balance_events for select to authenticated using (teacher_id = auth.uid());

create policy admin_full_access_blog_posts on public.blog_posts for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy public_view_published_posts on public.blog_posts for select to anon, authenticated using (status = 'published'::text);

create policy admin_full_access_global_resources on public.global_topic_resources for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_global_resources on public.global_topic_resources for select to authenticated using (exists (select 1 from students s where s.student_id = auth.uid()));
create policy teacher_view_global_resources on public.global_topic_resources for select to authenticated using (exists (select 1 from global_topics gt where gt.id = global_topic_resources.global_topic_id));

create policy admin_full_access_global_topics on public.global_topics for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_global_topics on public.global_topics for select to authenticated using (exists (select 1 from students s where s.student_id = auth.uid()));
create policy teacher_view_global_topics on public.global_topics for select to authenticated using (has_role(auth.uid(), 'teacher'::app_role) or (teacher_id = auth.uid()));

create policy admin_full_access_homework on public.homework_submissions for all to public using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_create_own_homework on public.homework_submissions for insert to public with check (auth.uid() = student_id);
create policy student_view_own_homework on public.homework_submissions for select to public using (auth.uid() = student_id);
create policy teacher_create_homework_for_students on public.homework_submissions for insert to authenticated with check ((teacher_id = auth.uid()) or exists (select 1 from students s where s.teacher_id = auth.uid() and s.student_id = homework_submissions.student_id));
create policy teacher_view_student_homework on public.homework_submissions for select to authenticated using ((teacher_id = auth.uid()) or exists (select 1 from students s where s.teacher_id = auth.uid() and s.student_id = homework_submissions.student_id));
create policy user_delete_own_uploaded_homework on public.homework_submissions for delete to public using (auth.uid() = uploaded_by_user_id);
create policy user_update_own_uploaded_homework on public.homework_submissions for update to public using (auth.uid() = uploaded_by_user_id) with check (auth.uid() = uploaded_by_user_id);

create policy admin_full_access_lesson_instances on public.lesson_instances for all to public using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_own_lesson_instances on public.lesson_instances for select to public using (student_id = auth.uid());
create policy teacher_manage_own_lesson_instances on public.lesson_instances for all to public using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy admin_delete_notifications on public.notifications for delete to public using (has_role(auth.uid(), 'admin'::app_role));
create policy admin_view_all_notifications on public.notifications for select to public using (has_role(auth.uid(), 'admin'::app_role));
create policy user_update_own_notifications on public.notifications for update to public using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
create policy user_view_own_notifications on public.notifications for select to public using (auth.uid() = recipient_id);

create policy admin_full_access_payment_history on public.payment_history for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy teacher_view_own_payment_history on public.payment_history for select to authenticated using (teacher_id = auth.uid());

create policy admin_modify_all_profiles on public.profiles for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy admin_view_all_profiles on public.profiles for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
create policy teachers_view_assigned_students on public.profiles for select to authenticated using (exists (select 1 from students s where s.teacher_id = auth.uid() and s.student_id = profiles.user_id));
create policy users_view_own_profile on public.profiles for select to authenticated using (user_id = auth.uid());

create policy "Admin full access push_tokens" on public.push_tokens for all to public using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Users manage own tokens" on public.push_tokens for all to public using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy admin_full_access_resources on public.resources for all to public using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_own_resources on public.resources for select to public using (exists (select 1 from topics where topics.id = resources.topic_id and topics.student_id = auth.uid()));
create policy teacher_view_student_resources on public.resources for select to authenticated using (exists (select 1 from topics t join students s on s.student_id = t.student_id where s.teacher_id = auth.uid() and t.id = resources.topic_id));

create policy admin_full_access_lesson_tracking on public.student_lesson_tracking for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_own_tracking on public.student_lesson_tracking for select to authenticated using (auth.uid() = student_id);
create policy teacher_manage_student_tracking on public.student_lesson_tracking for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy teacher_view_student_tracking on public.student_lesson_tracking for select to authenticated using (teacher_id = auth.uid());

create policy admin_full_access_student_lessons on public.student_lessons for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_own_lessons on public.student_lessons for select to authenticated using (auth.uid() = student_id);
create policy teacher_manage_student_lessons on public.student_lessons for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy teacher_view_student_lessons on public.student_lessons for select to authenticated using (teacher_id = auth.uid());

create policy admin_full_access_resource_completion on public.student_resource_completion for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_own_completion on public.student_resource_completion for select to authenticated using (auth.uid() = student_id);
create policy teacher_manage_student_completion on public.student_resource_completion for all to authenticated using (exists (select 1 from students s where s.teacher_id = auth.uid() and s.student_id = student_resource_completion.student_id)) with check (exists (select 1 from students s where s.teacher_id = auth.uid() and s.student_id = student_resource_completion.student_id));
create policy teacher_view_student_completion on public.student_resource_completion for select to authenticated using (teacher_owns_student(auth.uid(), student_id));

create policy admin_full_access_students on public.students for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_teacher_assignment on public.students for select to authenticated using (auth.uid() = student_id);
create policy teacher_view_own_students on public.students for select to authenticated using (teacher_id = auth.uid());

create policy admin_full_access_teacher_balance on public.teacher_balance for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy teacher_view_own_balance on public.teacher_balance for select to authenticated using (teacher_id = auth.uid());

create policy admin_full_access_topics on public.topics for all to public using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy student_view_own_topics on public.topics for select to public using (auth.uid() = student_id);
create policy teacher_view_student_topics on public.topics for select to authenticated using ((teacher_id = auth.uid()) or exists (select 1 from students s where s.teacher_id = auth.uid() and s.student_id = topics.student_id));

create policy admin_full_access_trial_lessons on public.trial_lessons for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy teacher_delete_own_trial_lessons on public.trial_lessons for delete to authenticated using (teacher_id = auth.uid());
create policy teacher_insert_own_trial_lessons on public.trial_lessons for insert to authenticated with check (teacher_id = auth.uid());
create policy teacher_update_own_trial_lessons on public.trial_lessons for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy teacher_view_own_trial_lessons on public.trial_lessons for select to authenticated using (teacher_id = auth.uid());

create policy admin_manage_all_roles on public.user_roles for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy admin_view_all_roles on public.user_roles for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
create policy users_view_own_roles on public.user_roles for select to authenticated using (user_id = auth.uid());
