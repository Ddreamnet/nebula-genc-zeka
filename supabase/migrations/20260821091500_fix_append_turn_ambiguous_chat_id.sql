-- rpc_append_turn has never written a single row: every call died with
-- `42702 column reference "chat_id" is ambiguous`, so the Playground's chat
-- history was always empty.
--
-- The function `returns table (chat_id uuid, ...)`, which makes `chat_id` an
-- OUT variable for the whole body. Postgres ships `plpgsql.variable_conflict`
-- set to `error`, so the unqualified `where chat_id = v_chat` against
-- playground_chat_messages — a table that also has a `chat_id` column — is a
-- hard runtime error rather than a resolution in either direction. It only
-- fires when the statement actually runs, which is why `create function`
-- accepted it and nothing looked wrong until the rows never appeared. The
-- caller logs and swallows the failure (losing a transcript must never cost a
-- student the generation itself), so it stayed silent in production.
--
-- Fix: alias the table and qualify the column. A table alias is not a plpgsql
-- variable, so `m.chat_id` can only mean the column. Any new statement in this
-- body that touches `chat_id` or `assistant_message_id` must be qualified the
-- same way.

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
    select c.id into v_chat
    from public.playground_chats c
    where c.id = p_chat_id and c.user_id = v_uid
    for update;

    if v_chat is null then
      raise exception 'Chat not found' using errcode = 'insufficient_privilege';
    end if;
  end if;

  select coalesce(max(m.seq), 0) into v_seq
  from public.playground_chat_messages m
  where m.chat_id = v_chat;

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


-- Same qualification pass on the sibling writer. It has no OUT variables, so
-- it was never broken — but it is one `returns table` away from the same trap,
-- and it reads better matching its neighbour. No behaviour change.
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
  if not exists (
    select 1 from public.playground_chats c
    where c.id = p_chat_id and c.user_id = v_uid
  ) then
    raise exception 'Chat not found' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(max(m.seq), 0) into v_seq
  from public.playground_chat_messages m
  where m.chat_id = p_chat_id;

  insert into public.playground_chat_messages (chat_id, user_id, role, content, kind, tool_id, seq)
  values (p_chat_id, v_uid, 'assistant', '', 'switch', p_tool_id, v_seq + 1);

  update public.playground_chats set last_message_at = now() where id = p_chat_id;
end;
$function$;

-- `create or replace` keeps the existing ACL, but repeat the house rule so a
-- fresh environment built from these migrations lands in the same state.
revoke all on function public.rpc_append_turn(uuid, text, text, uuid) from public, anon;
revoke all on function public.rpc_append_switch(uuid, text) from public, anon;
grant execute on function public.rpc_append_turn(uuid, text, text, uuid) to authenticated;
grant execute on function public.rpc_append_switch(uuid, text) to authenticated;
