-- S2: rpc_finalize_generation was replayable.
--
-- The old body read ore_charged, updated the row unconditionally, then
-- refunded whenever p_status = 'failed'. Nothing checked the row's current
-- status, so a student could call it repeatedly on an already-settled
-- generation of their own -- each call credited ore_charged back again.
-- Generation ids are handed to the browser in the API response and are also
-- readable via RLS, so this was reachable from the console in a loop:
-- unlimited ore, billed to the real OpenRouter account.
--
-- Fix: settle in ONE guarded UPDATE that only matches a row still in
-- 'pending'. A replayed call matches zero rows, so it becomes a silent no-op
-- instead of a second refund, and the refund is conditional on the row having
-- actually transitioned.
create or replace function public.rpc_finalize_generation(
  p_generation_id uuid,
  p_status text,
  p_real_cost_usd numeric default null::numeric,
  p_output_path text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_ore numeric;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Only the two terminal states this app ever settles into; the table's own
  -- CHECK allows exactly ('pending','completed','failed').
  if p_status not in ('completed', 'failed') then
    raise exception 'Invalid status %', p_status using errcode = 'check_violation';
  end if;

  update public.ai_generations
  set status        = p_status,
      real_cost_usd = coalesce(p_real_cost_usd, real_cost_usd),
      output_path   = coalesce(p_output_path, output_path)
  where id      = p_generation_id
    and user_id = v_uid
    and status  = 'pending'
  returning ore_charged into v_ore;

  -- FOUND is false when the row was already settled (or isn't ours) -- that is
  -- the replay case, and it must not pay out.
  if found and p_status = 'failed' then
    update public.playground_credits
    set balance_ore = balance_ore + coalesce(v_ore, 0),
        updated_at  = now()
    where user_id = v_uid;
  end if;
end;
$function$;

revoke all on function public.rpc_finalize_generation(uuid, text, numeric, text) from public, anon;
grant execute on function public.rpc_finalize_generation(uuid, text, numeric, text) to authenticated;


-- S1: create_student_relationship let any 'teacher' claim any student.
--
-- It only verified that the caller holds the teacher role and that the target
-- holds the student role -- never that an admin had assigned that student to
-- that teacher. Combined with public signup and handle_new_user honouring a
-- self-supplied user_metadata.role of 'teacher', a stranger could register,
-- become a teacher, claim a known student uuid, and have RLS hand them that
-- child's profile, email, schedule, homework rows and homework-files objects
-- (that storage policy is ALL, so deletes included). Student uuids leak
-- through playground signed URLs, whose paths are {user_id}/{generation}.ext.
--
-- In this product admins assign students (admin_create_student_relationship,
-- and in practice the create-student edge function). The app never calls this
-- teacher-side entry point -- it appears only in generated types -- so
-- revoking it removes the escalation step with no behaviour change.
revoke all on function public.create_student_relationship(uuid) from public, anon, authenticated;;
