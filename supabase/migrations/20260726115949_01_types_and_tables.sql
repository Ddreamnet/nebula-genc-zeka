
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_type text NOT NULL DEFAULT 'last_lesson_warning'::text,
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  push_processing_at timestamp with time zone,
  push_sent_at timestamp with time zone);

CREATE TABLE public.ai_generations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool_id text NOT NULL,
  modality text NOT NULL,
  provider_model text NOT NULL,
  ore_charged numeric(10,2) NOT NULL,
  real_cost_usd numeric(10,4),
  status text NOT NULL DEFAULT 'pending'::text,
  openrouter_job_id text,
  prompt text NOT NULL,
  output_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.balance_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  event_type text NOT NULL,
  amount_minutes integer NOT NULL,
  instance_id uuid,
  student_id uuid,
  package_cycle integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text);

CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft'::text,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.global_topic_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  global_topic_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  resource_type text NOT NULL,
  resource_url text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_completed boolean,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.global_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.homework_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  uploaded_by_user_id uuid NOT NULL DEFAULT auth.uid(),
  batch_id uuid NOT NULL);

CREATE TABLE public.lesson_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  lesson_number integer NOT NULL,
  lesson_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  status text NOT NULL DEFAULT 'planned'::text,
  original_date date,
  original_start_time time without time zone,
  original_end_time time without time zone,
  rescheduled_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  package_cycle integer NOT NULL DEFAULT 1,
  shift_group_id uuid,
  is_manual_override boolean NOT NULL DEFAULT false,
  group_id uuid);

CREATE TABLE public.lesson_reminder_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  lesson_key text NOT NULL,
  lesson_date date NOT NULL,
  reminder_type text NOT NULL DEFAULT 'before_10min'::text,
  sent_at timestamp with time zone DEFAULT now());

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  homework_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  recipient_id uuid NOT NULL,
  push_processing_at timestamp with time zone,
  push_sent_at timestamp with time zone);

CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  amount_minutes integer NOT NULL,
  completed_regular_lessons integer NOT NULL DEFAULT 0,
  completed_trial_lessons integer NOT NULL DEFAULT 0,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.playground_credits (
  user_id uuid NOT NULL,
  balance_ore numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid,
  role text NOT NULL,
  platform text NOT NULL,
  token text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now());

CREATE TABLE public.resources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  resource_type text NOT NULL,
  resource_url text NOT NULL,
  title text NOT NULL,
  description text);

CREATE TABLE public.student_lesson_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  lessons_per_week integer NOT NULL,
  month_start_date date NOT NULL DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  package_cycle integer NOT NULL DEFAULT 1);

CREATE TABLE public.student_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  week_start_date date NOT NULL DEFAULT (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  note text);

CREATE TABLE public.student_resource_completion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamp with time zone,
  about_text text,
  group_id uuid);

CREATE TABLE public.teacher_balance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  total_minutes integer NOT NULL DEFAULT 0,
  completed_regular_lessons integer NOT NULL DEFAULT 0,
  completed_trial_lessons integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  regular_lessons_minutes integer NOT NULL DEFAULT 0,
  trial_lessons_minutes integer NOT NULL DEFAULT 0,
  manual_adjustment_minutes integer NOT NULL DEFAULT 0);

CREATE TABLE public.topics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.trial_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  lesson_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now());

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now());
;
