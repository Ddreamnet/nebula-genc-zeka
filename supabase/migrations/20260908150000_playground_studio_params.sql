-- Studio settings, recorded with the generation that used them.
--
-- Until now a generation row said what was made and what it cost, but not how:
-- which resolution, which seed, whether the clip was silent. That was fine
-- while every one of those was a constant. The studio hands them to the
-- student (docs/playground-studio-plan.md §8), and the moment a dial exists
-- four things need the value back:
--
--   (a) the settings chip under a finished result ("⚙ 8 sn · 1080p · tohum 4213"),
--   (b) "aynı tohumla tekrar üret", which needs the seed that was actually used,
--   (c) an admin asking which settings are burning the treasury,
--   (d) honest billing — the ore charged is now a function of these values.
--
-- The transcript tables are NOT touched (plan §0). `playground_chat_messages`
-- already links to a generation by `generation_id`; that link is how a
-- reopened chat finds these settings.
--
-- Only NON-DEFAULT values are written by the app, so a plain generation still
-- stores `{}` rather than a copy of the schema.
alter table public.ai_generations
  add column if not exists params jsonb;

comment on column public.ai_generations.params is
  'Studio dials that were moved off their default for this generation (see lib/playground/params.ts). Server-sanitised against the caller''s role before it is written — never raw client input.';

-- rpc_start_generation gains p_params.
--
-- This RESTATES the whole function rather than patching it: the argument list
-- changes, so Postgres would otherwise leave the old five-argument version
-- alongside the new one as an overload — two SECURITY DEFINER functions with
-- the same name, one of which nobody would ever update again. The old one is
-- dropped below, which means the application code and this migration must ship
-- together.
--
-- Everything else below is unchanged from
-- 20260904232950_teacher_playground_no_ore_limit.sql (verified against the
-- deployed definition on 2026-09-08 before this was written): the burst guard,
-- the staff bypass, the wallet gate and the placeholder remaining_ore all
-- behave exactly as they did.
CREATE OR REPLACE FUNCTION public.rpc_start_generation(
  p_tool_id text,
  p_modality text,
  p_provider_model text,
  p_ore_cost numeric,
  p_prompt text,
  p_params jsonb DEFAULT NULL
)
 RETURNS TABLE(generation_id uuid, success boolean, remaining_ore numeric, error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_anon boolean;
  v_balance numeric;
  v_gen_id uuid;
  v_pending int;
begin
  if v_uid is null then
    return query select null::uuid, false, 0::numeric, 'not_authenticated';
    return;
  end if;

  select is_anonymous into v_is_anon from auth.users where id = v_uid;

  if p_modality = 'video' and coalesce(v_is_anon, true) then
    return query select null::uuid, false, 0::numeric, 'login_required';
    return;
  end if;

  -- Burst protection, and it applies to staff too. This is not a quota — it is
  -- the only thing standing between a stuck retry loop and the real OpenRouter
  -- bill, and "no cevher limit" must not quietly mean "no brake at all".
  -- Only RECENT pending rows count: a generation that never settles (a server
  -- restart mid-stream) would otherwise wedge someone out permanently, which
  -- is a worse failure than the one being prevented.
  select count(*) into v_pending
  from public.ai_generations
  where user_id = v_uid
    and status = 'pending'
    and created_at > now() - interval '15 minutes';

  if v_pending >= 3 then
    return query select null::uuid, false, coalesce(
      (select balance_ore from public.playground_credits where user_id = v_uid), 0::numeric
    ), 'too_many_pending';
    return;
  end if;

  -- Staff: no wallet row, no gate, no debit.
  --
  -- The 0 remaining is a placeholder the API replaces — with the live treasury
  -- figure for an admin, and with "unlimited" for a teacher. It is deliberately
  -- 0 rather than a large number: if the API ever fails to substitute it, the
  -- composer gates instead of promising a balance nobody verified.
  if public.has_role(v_uid, 'admin'::public.app_role)
     or public.has_role(v_uid, 'teacher'::public.app_role) then
    insert into public.ai_generations (user_id, tool_id, modality, provider_model, ore_charged, prompt, status, params)
    values (v_uid, p_tool_id, p_modality, p_provider_model, p_ore_cost, p_prompt, 'pending', p_params)
    returning id into v_gen_id;

    return query select v_gen_id, true, 0::numeric, null::text;
    return;
  end if;

  insert into public.playground_credits (user_id, balance_ore)
  values (v_uid, case when coalesce(v_is_anon, true) then 5 else 20 end)
  on conflict (user_id) do nothing;

  select balance_ore into v_balance from public.playground_credits where user_id = v_uid for update;

  if v_balance < p_ore_cost then
    return query select null::uuid, false, v_balance, 'insufficient_balance';
    return;
  end if;

  update public.playground_credits set balance_ore = balance_ore - p_ore_cost, updated_at = now() where user_id = v_uid;

  insert into public.ai_generations (user_id, tool_id, modality, provider_model, ore_charged, prompt, status, params)
  values (v_uid, p_tool_id, p_modality, p_provider_model, p_ore_cost, p_prompt, 'pending', p_params)
  returning id into v_gen_id;

  return query select v_gen_id, true, (v_balance - p_ore_cost), null::text;
end;
$function$;

-- The five-argument version, now superseded. Dropped so there is exactly one
-- definition of how a generation starts.
DROP FUNCTION IF EXISTS public.rpc_start_generation(text, text, text, numeric, text);

-- Postgres grants EXECUTE to PUBLIC on a new/replaced function by default; the
-- security advisor flags an anon-callable SECURITY DEFINER even when the
-- internal auth.uid() check would block real abuse.
REVOKE ALL ON FUNCTION public.rpc_start_generation(text, text, text, numeric, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_start_generation(text, text, text, numeric, text, jsonb) TO authenticated;
