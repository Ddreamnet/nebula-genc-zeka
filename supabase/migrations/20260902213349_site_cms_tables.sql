-- BACKFILL: these three tables were applied straight to the remote database
-- and the migration file never landed in the repo, so `schema_migrations` had
-- a version the folder didn't. A fresh branch or a rebuilt environment would
-- have come up without them.
--
-- Written to match what is already live exactly, and fully idempotent, so
-- re-running it against the existing database is a no-op rather than an error.

create table if not exists public.site_content (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.site_moments (
  id           uuid primary key default gen_random_uuid(),
  media_type   text not null check (media_type in ('photo', 'video')),
  media_url    text not null,
  poster_url   text,
  tag_tr       text not null default '',
  tag_en       text not null default '',
  tag_fr       text not null default '',
  caption_tr   text not null default '',
  caption_en   text not null default '',
  caption_fr   text not null default '',
  order_index  integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.site_testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote_tr     text not null,
  quote_en     text not null default '',
  quote_fr     text not null default '',
  tags         jsonb not null default '[]'::jsonb,
  author_label text,
  order_index  integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.site_content      enable row level security;
alter table public.site_moments      enable row level security;
alter table public.site_testimonials enable row level security;

-- Public read: the marketing site renders these anonymously. Moments and
-- testimonials gate on is_published so a draft never leaks; site_content is a
-- flat key/value store that only ever holds published copy.
drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read on public.site_content
  for select to anon, authenticated using (true);

drop policy if exists site_content_admin_write on public.site_content;
create policy site_content_admin_write on public.site_content
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists site_moments_public_read on public.site_moments;
create policy site_moments_public_read on public.site_moments
  for select to anon, authenticated using (is_published);

drop policy if exists site_moments_admin_all on public.site_moments;
create policy site_moments_admin_all on public.site_moments
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists site_testimonials_public_read on public.site_testimonials;
create policy site_testimonials_public_read on public.site_testimonials
  for select to anon, authenticated using (is_published);

drop policy if exists site_testimonials_admin_all on public.site_testimonials;
create policy site_testimonials_admin_all on public.site_testimonials
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));
