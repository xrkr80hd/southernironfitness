create type public.lift_lab_approval_status as enum ('pending', 'approved', 'denied');

alter table public.lift_lab_profiles
  add column approval_status public.lift_lab_approval_status not null default 'pending',
  add column disclaimer_version text,
  add column disclaimer_accepted_at timestamptz;

create table public.lift_lab_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.lift_lab_profiles(id) on delete cascade,
  notification_type text not null default 'account_request',
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index lift_lab_admin_notifications_unread_idx
  on public.lift_lab_admin_notifications(created_at desc) where read_at is null;

alter table public.lift_lab_admin_notifications enable row level security;
create policy "Admins read notifications" on public.lift_lab_admin_notifications for select to authenticated using (private.is_lift_lab_admin());
create policy "Admins update notifications" on public.lift_lab_admin_notifications for update to authenticated using (private.is_lift_lab_admin()) with check (private.is_lift_lab_admin());
grant select, update on public.lift_lab_admin_notifications to authenticated;

create or replace function private.create_lift_lab_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare accepted boolean;
declare version text;
declare member_name text;
begin
  accepted := coalesce((new.raw_user_meta_data ->> 'disclaimer_accepted')::boolean, false);
  version := nullif(new.raw_user_meta_data ->> 'disclaimer_version', '');
  member_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Lift Lab Member');
  if not accepted or version is null then raise exception 'The independent-trainer acknowledgment is required.'; end if;
  insert into public.lift_lab_profiles (id, full_name, phone, disclaimer_version, disclaimer_accepted_at)
  values (new.id, member_name, nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), version, now());
  insert into public.lift_lab_admin_notifications (profile_id, title, message)
  values (new.id, 'New Lift Lab account request', member_name || ' submitted a request to join Madie''s Lift Lab.');
  return new;
end; $$;

drop policy "Members read published classes" on public.lift_lab_classes;
create policy "Approved members read published classes" on public.lift_lab_classes for select to authenticated
using ((is_published and exists (select 1 from public.lift_lab_profiles p where p.id = (select auth.uid()) and p.approval_status = 'approved')) or private.is_lift_lab_admin());

drop policy "Members create own registrations" on public.lift_lab_registrations;
create policy "Approved members create own registrations" on public.lift_lab_registrations for insert to authenticated
with check ((select auth.uid()) = user_id and exists (select 1 from public.lift_lab_profiles p where p.id = (select auth.uid()) and p.approval_status = 'approved'));
