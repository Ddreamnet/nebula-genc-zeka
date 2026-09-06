-- Student attachments were never stored anywhere.
--
-- An uploaded picture lived only inside the one request that carried it: it
-- went to the model as a data URL and was then dropped. Two consequences:
--
--  1. Reopening a chat showed the student's own question without the image it
--     was about, so the rest of the conversation read as nonsense.
--  2. There was no record at all of what a 10-18 year old had uploaded. The
--     prompt text was kept; the image was not. For a product aimed at minors
--     that is reason enough on its own.
--
-- Deliberately NOT a column on playground_chat_messages: the chat transcript
-- schema is being left exactly as it is. Attachments hang off the generation
-- instead, and rpc_append_turn already stamps generation_id on BOTH rows of a
-- turn — so the user's message can be matched to its inputs on read with no
-- change to any existing table, function, or policy.

-- Separate from playground-outputs on purpose: inputs are disposable and can
-- be pruned on a much shorter clock (90 days is the intent), while outputs are
-- the student's own work and are kept.
insert into storage.buckets (id, name, public)
values ('playground-inputs', 'playground-inputs', false)
on conflict (id) do nothing;

drop policy if exists "owner manage playground inputs" on storage.objects;
create policy "owner manage playground inputs" on storage.objects as permissive for all to public
  using (
    bucket_id = 'playground-inputs'::text
    and (((storage.foldername(name))[1] = (auth.uid())::text) or has_role(auth.uid(), 'admin'::app_role))
  )
  with check (
    bucket_id = 'playground-inputs'::text
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create table if not exists public.playground_generation_inputs (
  id            uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.ai_generations(id) on delete cascade,
  -- Denormalised so RLS never has to join back to ai_generations, matching how
  -- playground_chat_messages carries user_id.
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Storage path, never a URL: signed links expire within the hour, so a URL
  -- written here would be dead by the time anyone reopened the chat.
  path          text not null,
  seq           int not null,
  created_at    timestamptz not null default now(),
  unique (generation_id, seq)
);

create index if not exists idx_playground_generation_inputs_generation
  on public.playground_generation_inputs (generation_id);

alter table public.playground_generation_inputs enable row level security;

-- Read-only policies; the write goes through the SECURITY DEFINER RPC below,
-- the same shape the chat tables use.
drop policy if exists student_select_own_generation_inputs on public.playground_generation_inputs;
create policy student_select_own_generation_inputs on public.playground_generation_inputs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists admin_select_all_generation_inputs on public.playground_generation_inputs;
create policy admin_select_all_generation_inputs on public.playground_generation_inputs
  for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));

-- Records the uploaded paths for one generation.
--
-- Ownership is re-derived from ai_generations rather than trusted from the
-- caller: the generation id travels to the browser in the API response, so
-- without this check one student could file attachments against another's
-- generation and have them signed back on read.
create or replace function public.rpc_record_generation_inputs(
  p_generation_id uuid,
  p_paths text[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_path text;
  v_seq int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select user_id into v_owner from public.ai_generations where id = p_generation_id;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'Generation not found' using errcode = 'insufficient_privilege';
  end if;

  foreach v_path in array coalesce(p_paths, '{}')
  loop
    -- Belt and braces with the storage policy: a path outside the caller's own
    -- folder must never become something the server will later sign.
    if v_path not like (v_uid::text || '/%') then
      raise exception 'Path outside own folder' using errcode = 'insufficient_privilege';
    end if;

    insert into public.playground_generation_inputs (generation_id, user_id, path, seq)
    values (p_generation_id, v_uid, v_path, v_seq)
    on conflict (generation_id, seq) do nothing;

    v_seq := v_seq + 1;
  end loop;
end;
$function$;

revoke all on function public.rpc_record_generation_inputs(uuid, text[]) from public, anon;
grant execute on function public.rpc_record_generation_inputs(uuid, text[]) to authenticated;
