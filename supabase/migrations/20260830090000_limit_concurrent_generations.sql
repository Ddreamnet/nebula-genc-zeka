-- Burst protection: cap how many generations one user can have in flight.
--
-- Until now the ore balance was the only brake. Ore is checked and debited
-- per request, but nothing stopped a hundred requests from being in flight at
-- once -- two open tabs, a stuck retry, or a `for` loop pasted into the
-- console -- and every one of them reaches OpenRouter and bills the real
-- account before the wallet can catch up. The gate is correct per request and
-- useless against a burst.
--
-- The cap counts only RECENT pending rows. A generation that somehow never
-- settles (a server restart mid-stream) would otherwise wedge the student out
-- of the Playground permanently, which is a far worse failure than the one
-- being prevented. Anything older than the window is ignored here and gets
-- cleaned up by the video reconciler.
--
-- 3 is chosen against the one legitimate case for parallel work: a video
-- renders for minutes, and the student should still be able to chat while it
-- does. Three allows that with room to spare; a fourth simultaneous request
-- is not something the UI can even produce.
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

  -- Applies to admins too: they are the account whose OpenRouter balance a
  -- runaway loop actually spends.
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

  -- Admin: no wallet row, no gate, no debit. The 0 remaining is a placeholder
  -- the API replaces with the live treasury figure; it is deliberately not a
  -- large number, so an admin whose OpenRouter balance can't be read sees a
  -- gated composer rather than a balance we invented.
  if public.has_role(v_uid, 'admin'::public.app_role) then
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

-- Postgres grants EXECUTE to PUBLIC on a new/replaced function by default;
-- the security advisor flags an anon-callable SECURITY DEFINER even when the
-- internal auth.uid() check would block real abuse.
REVOKE ALL ON FUNCTION public.rpc_start_generation(text, text, text, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_start_generation(text, text, text, numeric, text) TO authenticated;

-- The cap runs on every single generation, so the count must not be a table
-- scan of every row this user ever made.
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_pending
  ON public.ai_generations (user_id, created_at DESC)
  WHERE status = 'pending';
