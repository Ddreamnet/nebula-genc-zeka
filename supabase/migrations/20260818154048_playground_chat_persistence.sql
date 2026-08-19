-- Playground transcripts. Until now `messages` lived only in React state, so a
-- refresh threw away everything a student had made.
--
-- Deliberately NO `title` column: the UI lists chats by last-activity time
-- only, never by name, so deriving/storing a title would be dead weight.

create table if not exists public.playground_chats (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Tool the chat STARTED on. Per-message tool_id below is what drives the
  -- avatar on each bubble, since a chat can span several models.
  tool_id         text not null,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  message_count   int not null default 0,
  archived_at     timestamptz
);

create table if not exists public.playground_chat_messages (
  id            uuid primary key default gen_random_uuid(),
  chat_id       uuid not null references public.playground_chats(id) on delete cascade,
  -- Denormalised so RLS never has to join back to playground_chats.
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role          text not null check (role in ('user','assistant')),
  content       text not null default '',
  kind          text not null default 'text' check (kind in ('text','code','image','video','audio','switch')),
  -- Storage path, not a URL: signed URLs expire in an hour, so the server
  -- re-signs on read. Never trust a client-supplied URL here.
  output_path   text,
  tool_id       text,
  generation_id uuid references public.ai_generations(id) on delete set null,
  -- created_at ties when both rows of a turn are written in one transaction,
  -- which makes ORDER BY created_at non-deterministic. seq fixes the order.
  seq           int not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_playground_chats_user_recent
  on public.playground_chats (user_id, last_message_at desc)
  where archived_at is null;

create index if not exists idx_playground_chat_messages_chat_seq
  on public.playground_chat_messages (chat_id, seq);

alter table public.playground_chats enable row level security;
alter table public.playground_chat_messages enable row level security;

-- Read-only policies, matching how playground_credits/ai_generations are done:
-- every write goes through a SECURITY DEFINER RPC so seq, message_count and
-- last_message_at can't drift.
drop policy if exists student_select_own_chats on public.playground_chats;
create policy student_select_own_chats on public.playground_chats
  for select to authenticated using (user_id = auth.uid());

drop policy if exists admin_select_all_chats on public.playground_chats;
create policy admin_select_all_chats on public.playground_chats
  for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists student_select_own_chat_messages on public.playground_chat_messages;
create policy student_select_own_chat_messages on public.playground_chat_messages
  for select to authenticated using (user_id = auth.uid());

drop policy if exists admin_select_all_chat_messages on public.playground_chat_messages;
create policy admin_select_all_chat_messages on public.playground_chat_messages
  for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));


-- Opens a chat if p_chat_id is null, then writes the student's turn plus an
-- EMPTY assistant row whose id is returned. Fixing the assistant's slot up
-- front is what lets the async video path fill it in minutes later without
-- landing out of order.
create or replace function public.rpc_append_turn(
  p_chat_id       uuid,
  p_tool_id       text,
  p_user_content  text,
  p_generation_id uuid default null
)
returns table (chat_id uuid, assistant_message_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid   uuid := auth.uid();
  v_chat  uuid;
  v_seq   int;
  v_asst  uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if p_chat_id is null then
    insert into public.playground_chats (user_id, tool_id)
    values (v_uid, p_tool_id)
    returning id into v_chat;
  else
    -- Lock the chat row: two tabs writing at once must not pick the same seq.
    select id into v_chat
    from public.playground_chats
    where id = p_chat_id and user_id = v_uid
    for update;

    if v_chat is null then
      raise exception 'Chat not found' using errcode = 'insufficient_privilege';
    end if;
  end if;

  select coalesce(max(seq), 0) into v_seq
  from public.playground_chat_messages where chat_id = v_chat;

  insert into public.playground_chat_messages (chat_id, user_id, role, content, kind, tool_id, generation_id, seq)
  values (v_chat, v_uid, 'user', p_user_content, 'text', p_tool_id, p_generation_id, v_seq + 1);

  insert into public.playground_chat_messages (chat_id, user_id, role, content, kind, tool_id, generation_id, seq)
  values (v_chat, v_uid, 'assistant', '', 'text', p_tool_id, p_generation_id, v_seq + 2)
  returning id into v_asst;

  update public.playground_chats
  set last_message_at = now(), message_count = message_count + 2
  where id = v_chat;

  return query select v_chat, v_asst;
end;
$function$;


-- Fills the placeholder the call above reserved.
create or replace function public.rpc_settle_message(
  p_message_id  uuid,
  p_content     text default '',
  p_kind        text default 'text',
  p_output_path text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.playground_chat_messages
  set content     = coalesce(p_content, ''),
      kind        = p_kind,
      output_path = coalesce(p_output_path, output_path)
  where id = p_message_id and user_id = auth.uid();
end;
$function$;


-- Records "the student changed model here" so a reopened transcript shows the
-- handover in the same place it originally happened.
create or replace function public.rpc_append_switch(p_chat_id uuid, p_tool_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_seq int;
begin
  if not exists (select 1 from public.playground_chats where id = p_chat_id and user_id = v_uid) then
    raise exception 'Chat not found' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(max(seq), 0) into v_seq
  from public.playground_chat_messages where chat_id = p_chat_id;

  insert into public.playground_chat_messages (chat_id, user_id, role, content, kind, tool_id, seq)
  values (p_chat_id, v_uid, 'assistant', '', 'switch', p_tool_id, v_seq + 1);

  update public.playground_chats set last_message_at = now() where id = p_chat_id;
end;
$function$;


-- Soft delete: the row stays so a mis-tap is recoverable.
create or replace function public.rpc_archive_chat(p_chat_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.playground_chats
  set archived_at = now()
  where id = p_chat_id and user_id = auth.uid();
end;
$function$;


-- House rule for this project: new SECURITY DEFINER functions are granted to
-- PUBLIC by default, so anon must be revoked explicitly (not just PUBLIC).
revoke all on function public.rpc_append_turn(uuid, text, text, uuid) from public, anon;
revoke all on function public.rpc_settle_message(uuid, text, text, text) from public, anon;
revoke all on function public.rpc_append_switch(uuid, text) from public, anon;
revoke all on function public.rpc_archive_chat(uuid) from public, anon;

grant execute on function public.rpc_append_turn(uuid, text, text, uuid) to authenticated;
grant execute on function public.rpc_settle_message(uuid, text, text, text) to authenticated;
grant execute on function public.rpc_append_switch(uuid, text) to authenticated;
grant execute on function public.rpc_archive_chat(uuid) to authenticated;;
