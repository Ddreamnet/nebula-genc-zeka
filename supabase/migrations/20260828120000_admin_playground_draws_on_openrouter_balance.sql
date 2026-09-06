-- Admins spend the OpenRouter balance directly, not a cevher wallet.
--
-- Before this, every Playground generation went through the same wallet gate,
-- so the admin — the person who actually tops the OpenRouter account up — had
-- to grant themselves ore out of the same pot they were funding, and the
-- number in their Playground had nothing to do with the money that was really
-- there. Now the app reports the treasury (OpenRouter balance ÷ realized
-- $/cevher rate) as the admin's balance, and this function stops charging them
-- a wallet that no longer means anything.
--
-- The generation row is still written with its nominal `ore_charged`: that is
-- what the realized-rate calculation in lib/playground/treasury.ts samples, so
-- an admin's own usage keeps the rate honest instead of skewing it.
--
-- Students are untouched: same insert, same gate, same debit.
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
