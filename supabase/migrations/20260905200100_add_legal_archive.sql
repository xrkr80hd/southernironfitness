create or replace function private.is_lift_lab_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.lift_lab_profiles where id = (select auth.uid()) and role in ('admin', 'master_admin')) $$;

create or replace function private.is_lift_lab_master_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.lift_lab_profiles where id = (select auth.uid()) and role = 'master_admin') $$;
revoke all on function private.is_lift_lab_master_admin() from public;
grant execute on function private.is_lift_lab_master_admin() to authenticated;

drop policy if exists "Admins manage profiles" on public.lift_lab_profiles;
create policy "Admins read member profiles" on public.lift_lab_profiles for select to authenticated using (private.is_lift_lab_admin());
create policy "Master admins manage profiles" on public.lift_lab_profiles for all to authenticated using (private.is_lift_lab_master_admin()) with check (private.is_lift_lab_master_admin());

create or replace function public.review_lift_lab_account(target_profile_id uuid, decision public.lift_lab_approval_status)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_lift_lab_admin() then raise exception 'Administrator access required.'; end if;
  if decision not in ('approved', 'denied') then raise exception 'Invalid account decision.'; end if;
  update public.lift_lab_profiles set approval_status = decision, updated_at = now()
    where id = target_profile_id and role = 'member';
  update public.lift_lab_admin_notifications set read_at = coalesce(read_at, now())
    where profile_id = target_profile_id;
end; $$;
revoke all on function public.review_lift_lab_account(uuid, public.lift_lab_approval_status) from public, anon;
grant execute on function public.review_lift_lab_account(uuid, public.lift_lab_approval_status) to authenticated;
revoke update on public.lift_lab_profiles from authenticated;

create table public.lift_lab_legal_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  full_name text not null,
  acknowledgment_version text not null,
  acknowledgment_text text not null,
  acknowledgment_sha256 text not null,
  accepted_at timestamptz not null,
  auth_user_created_at timestamptz not null,
  evidence jsonb not null default '{}'::jsonb,
  archived_at timestamptz not null default now(),
  unique (user_id, acknowledgment_version)
);

create index lift_lab_legal_acknowledgments_email_idx on public.lift_lab_legal_acknowledgments(lower(email));
create index lift_lab_legal_acknowledgments_accepted_at_idx on public.lift_lab_legal_acknowledgments(accepted_at desc);
alter table public.lift_lab_legal_acknowledgments enable row level security;
create policy "Master admins read legal archive" on public.lift_lab_legal_acknowledgments for select to authenticated using (private.is_lift_lab_master_admin());
grant select on public.lift_lab_legal_acknowledgments to authenticated;

create or replace function private.prevent_legal_archive_change()
returns trigger language plpgsql set search_path = ''
as $$ begin raise exception 'Legal acknowledgment records are immutable.'; end; $$;
revoke all on function private.prevent_legal_archive_change() from public;
create trigger preserve_lift_lab_legal_acknowledgment before update or delete on public.lift_lab_legal_acknowledgments
for each row execute function private.prevent_legal_archive_change();

create or replace function private.create_lift_lab_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare accepted boolean;
declare version text;
declare member_name text;
declare clause_text constant text := 'Legal acknowledgment and electronic signature. By checking this box and creating my account, I affirm that I have read, understand, and agree to this acknowledgment. I understand that Madison Rabalais, doing business as Madie''s Lift Lab, is an independent trainer and independent business—not an employee, agent, partner, or representative of Southern Iron Fitness. Southern Iron Fitness does not select, direct, supervise, or control her training methods, programming, scheduling, charges, promises, or results. Any agreement for her training services is between me and Madie''s Lift Lab. I understand that exercise and strength training involve inherent risks, including the risk of physical injury, and I voluntarily choose to participate. This acknowledgment documents my informed decision and the independent relationship described above. It does not release any person or business from liability that Louisiana law does not permit to be waived.';
begin
  accepted := coalesce((new.raw_user_meta_data ->> 'disclaimer_accepted')::boolean, false);
  version := nullif(new.raw_user_meta_data ->> 'disclaimer_version', '');
  member_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Lift Lab Member');
  if not accepted or version <> '2026-09-05-v2' then raise exception 'The current legal acknowledgment is required.'; end if;
  insert into public.lift_lab_profiles (id, full_name, phone, disclaimer_version, disclaimer_accepted_at)
  values (new.id, member_name, nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), version, now());
  insert into public.lift_lab_legal_acknowledgments
    (user_id, email, full_name, acknowledgment_version, acknowledgment_text, acknowledgment_sha256, accepted_at, auth_user_created_at, evidence)
  values
    (new.id, new.email, member_name, version, clause_text, encode(extensions.digest(clause_text, 'sha256'), 'hex'), now(), new.created_at,
     jsonb_build_object('source', new.raw_user_meta_data ->> 'acceptance_source', 'user_agent', new.raw_user_meta_data ->> 'acceptance_user_agent', 'request_id', new.raw_user_meta_data ->> 'acceptance_request_id', 'method', 'required_checkbox_and_account_creation'));
  insert into public.lift_lab_admin_notifications (profile_id, title, message)
  values (new.id, 'New Lift Lab account request', member_name || ' submitted a signed request to join Madie''s Lift Lab.');
  return new;
end; $$;

create policy "Master admins read registrations" on public.lift_lab_registrations for select to authenticated using (private.is_lift_lab_master_admin());
