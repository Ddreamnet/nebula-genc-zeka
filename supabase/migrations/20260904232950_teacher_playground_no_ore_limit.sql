-- Teachers have no cevher limit.
--
-- A teacher opens the Playground from their own panel ("Playground" button in
-- teacher-dashboard.tsx) to demo in front of a class, and until now landed on
-- the same 20-cevher starter wallet a student gets. Twenty cevher is about
-- twenty images: one lesson's worth of demoing, if that. Running out mid-class
-- is the worst possible time, and there is no one to top a teacher up — the
-- grant RPC is admin-only.
--
-- So a teacher is treated the way an admin already is meant to be: no wallet
-- row, no gate, no debit. The generation row is still written with its nominal
-- `ore_charged`, because that is what the realized $/cevher rate in
-- lib/playground/treasury.ts samples — a teacher's usage keeps that rate
-- honest instead of vanishing from it.
--
-- ---------------------------------------------------------------------------
-- This migration deliberately RESTATES the whole function, including two
-- earlier changes that were written but never applied to the live database
-- (verified 2026-09-05 against the deployed definition):
--
--   20260828120000_admin_playground_draws_on_openrouter_balance.sql
--   20260830090000_limit_concurrent_generations.sql
--
-- Both are still sitting unapplied, which is why the admin bypass the app code
-- already assumes does not actually exist in production today: the API reports
-- the treasury as an admin's balance while the database still debits and gates
-- their wallet. Applying this file alone lands the correct final state for
-- rpc_start_generation regardless of whether those two are ever run, and
-- applying them first changes nothing because this one comes last.
--
-- (20260830093000_playground_input_attachments.sql is a separate table and is
-- NOT covered here — it still needs applying on its own.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_start_generation(p_tool_id text, p_modality text, p_provider_model text, p_ore_cost numeric, p_prompt text)
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
    insert into public.ai_generations (user_id, tool_id, modality, provider_model, ore_charged, prompt, status)
    values (v_uid, p_tool_id, p_modality, p_provider_model, p_ore_cost, p_prompt, 'pending')
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

  insert into public.ai_generations (user_id, tool_id, modality, provider_model, ore_charged, prompt, status)
  values (v_uid, p_tool_id, p_modality, p_provider_model, p_ore_cost, p_prompt, 'pending')
  returning id into v_gen_id;

  return query select v_gen_id, true, (v_balance - p_ore_cost), null::text;
end;
$function$;

-- Postgres grants EXECUTE to PUBLIC on a new/replaced function by default; the
-- security advisor flags an anon-callable SECURITY DEFINER even when the
-- internal auth.uid() check would block real abuse.
REVOKE ALL ON FUNCTION public.rpc_start_generation(text, text, text, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_start_generation(text, text, text, numeric, text) TO authenticated;

-- The pending count runs on every single generation, so it must not be a table
-- scan of every row this user ever made.
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_pending
  ON public.ai_generations (user_id, created_at DESC)
  WHERE status = 'pending';
