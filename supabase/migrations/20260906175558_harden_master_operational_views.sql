-- Keep Southern Iron master support access operational but column-limited.

drop policy if exists "Members read own profile" on public.lift_lab_profiles;
drop policy if exists "Admins read member profiles" on public.lift_lab_profiles;
create policy "Accounts read own profile" on public.lift_lab_profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "Trainer reads client profiles" on public.lift_lab_profiles for select to authenticated
  using (role = 'member' and private.is_lift_lab_trainer());

drop policy if exists "Master reads availability" on public.lift_lab_availability;
drop policy if exists "Master reads appointments" on public.lift_lab_appointments;
drop policy if exists "Master reads operational settings" on public.lift_lab_settings;

create or replace function public.get_lift_lab_master_availability()
returns table (id uuid, trainer_id uuid, starts_at timestamptz, ends_at timestamptz, status text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_lift_lab_master_admin() then raise exception 'Master administrator access required.'; end if;
  return query select a.id, a.trainer_id, a.starts_at, a.ends_at, a.status
    from public.lift_lab_availability a order by a.starts_at;
end; $$;
revoke all on function public.get_lift_lab_master_availability() from public, anon;
grant execute on function public.get_lift_lab_master_availability() to authenticated;

create or replace function public.get_lift_lab_master_appointments()
returns table (id uuid, status text, requested_at timestamptz, client_name text, service_name text, starts_at timestamptz, ends_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_lift_lab_master_admin() then raise exception 'Master administrator access required.'; end if;
  return query
    select a.id, a.status, a.requested_at, p.full_name, s.name, v.starts_at, v.ends_at
    from public.lift_lab_appointments a
    join public.lift_lab_profiles p on p.id = a.client_id
    join public.lift_lab_services s on s.id = a.service_id
    join public.lift_lab_availability v on v.id = a.availability_id
    order by a.requested_at desc;
end; $$;
revoke all on function public.get_lift_lab_master_appointments() from public, anon;
grant execute on function public.get_lift_lab_master_appointments() to authenticated;

create or replace function public.cancel_lift_lab_appointment(target_appointment_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.lift_lab_appointments%rowtype;
begin
  if not private.is_approved_lift_lab_member() then raise exception 'Approved client account required.'; end if;
  update public.lift_lab_appointments set status = 'cancelled', updated_at = now()
    where id = target_appointment_id and client_id = (select auth.uid()) and status in ('pending', 'confirmed')
    returning * into target;
  if target.id is null then raise exception 'This appointment cannot be cancelled.'; end if;
  update public.lift_lab_availability set status = 'open', updated_at = now() where id = target.availability_id and starts_at > now();
  insert into public.lift_lab_notifications(recipient_id, notification_type, title, message, related_id)
    values (target.trainer_id, 'appointment_cancelled', 'Appointment cancelled', 'A client cancelled an appointment.', target.id);
end; $$;
revoke all on function public.cancel_lift_lab_appointment(uuid) from public, anon;
grant execute on function public.cancel_lift_lab_appointment(uuid) to authenticated;

create or replace function public.set_lift_lab_appointment_status(target_appointment_id uuid, next_status text)
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.lift_lab_appointments%rowtype;
begin
  if not private.is_lift_lab_trainer() then raise exception 'Trainer access required.'; end if;
  if next_status not in ('completed', 'no_show', 'cancelled') then raise exception 'Invalid appointment status.'; end if;
  update public.lift_lab_appointments set status = next_status, reviewed_at = now(), updated_at = now()
    where id = target_appointment_id and trainer_id = (select auth.uid()) and status = 'confirmed'
    returning * into target;
  if target.id is null then raise exception 'Confirmed appointment not found.'; end if;
  if next_status = 'cancelled' then update public.lift_lab_availability set status = 'open', updated_at = now() where id = target.availability_id and starts_at > now(); end if;
  insert into public.lift_lab_notifications(recipient_id, notification_type, title, message, related_id)
    values (target.client_id, 'appointment_' || next_status, 'Appointment ' || replace(next_status, '_', ' '), 'Madie updated your appointment status.', target.id);
end; $$;
revoke all on function public.set_lift_lab_appointment_status(uuid, text) from public, anon;
grant execute on function public.set_lift_lab_appointment_status(uuid, text) to authenticated;

create or replace function public.set_lift_lab_availability_status(target_availability_id uuid, next_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_lift_lab_trainer() then raise exception 'Trainer access required.'; end if;
  if next_status not in ('open', 'blocked', 'closed') then raise exception 'Invalid availability status.'; end if;
  update public.lift_lab_availability set status = next_status, updated_at = now()
    where id = target_availability_id and trainer_id = (select auth.uid());
  if not found then raise exception 'Availability not found.'; end if;
end; $$;
revoke all on function public.set_lift_lab_availability_status(uuid, text) from public, anon;
grant execute on function public.set_lift_lab_availability_status(uuid, text) to authenticated;
