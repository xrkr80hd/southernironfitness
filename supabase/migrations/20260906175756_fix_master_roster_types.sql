-- Keep the master roster deliberately narrow and cast enum fields to its text API.

create or replace function public.get_lift_lab_master_roster()
returns table (id uuid, account_number text, full_name text, role text, approval_status text, program_status text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_lift_lab_master_admin() then raise exception 'Master administrator access required.'; end if;
  return query
    select p.id, p.account_number, p.full_name, p.role::text, p.approval_status::text,
      coalesce((select lp.status from public.lift_lab_programs lp where lp.client_id = p.id order by lp.created_at desc limit 1), 'none')
    from public.lift_lab_profiles p
    where p.role in ('member', 'admin')
    order by p.created_at desc;
end; $$;
revoke all on function public.get_lift_lab_master_roster() from public, anon;
grant execute on function public.get_lift_lab_master_roster() to authenticated;
