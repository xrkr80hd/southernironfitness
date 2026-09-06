-- Lift Lab progress tools, limited master oversight, and optional private photos.

create sequence if not exists private.lift_lab_account_number_seq;

alter table public.lift_lab_profiles add column if not exists account_number text;
update public.lift_lab_profiles
set account_number = 'MLL-' || lpad(nextval('private.lift_lab_account_number_seq')::text, 6, '0')
where account_number is null;
alter table public.lift_lab_profiles alter column account_number set default ('MLL-' || lpad(nextval('private.lift_lab_account_number_seq')::text, 6, '0'));
alter table public.lift_lab_profiles alter column account_number set not null;
create unique index if not exists lift_lab_profiles_account_number_idx on public.lift_lab_profiles(account_number);

alter table public.lift_lab_programs drop constraint if exists lift_lab_programs_status_check;
alter table public.lift_lab_programs add constraint lift_lab_programs_status_check check (status in ('draft', 'active', 'frozen', 'completed', 'archived'));
alter table public.lift_lab_programs add column if not exists goal text;
alter table public.lift_lab_programs add column if not exists weekly_frequency integer check (weekly_frequency is null or weekly_frequency between 1 and 14);
alter table public.lift_lab_programs add column if not exists frozen_at timestamptz;
alter table public.lift_lab_programs add column if not exists frozen_by uuid references public.lift_lab_profiles(id);
alter table public.lift_lab_program_items add column if not exists day_label text;
alter table public.lift_lab_program_items add column if not exists tempo text;

create table public.lift_lab_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.lift_lab_profiles(id),
  target_profile_id uuid references public.lift_lab_profiles(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.lift_lab_admin_audit enable row level security;
create policy "Administrators read appropriate audit events" on public.lift_lab_admin_audit for select to authenticated
  using (actor_id = (select auth.uid()) or private.is_lift_lab_master_admin());
grant select on public.lift_lab_admin_audit to authenticated;

-- Master oversight must never expose complete profile records.
drop policy if exists "Master admins manage profiles" on public.lift_lab_profiles;

create or replace function public.get_lift_lab_master_roster()
returns table (id uuid, account_number text, full_name text, role text, approval_status text, program_status text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_lift_lab_master_admin() then raise exception 'Master administrator access required.'; end if;
  return query
    select p.id, p.account_number, p.full_name, p.role, p.approval_status,
      coalesce((select lp.status from public.lift_lab_programs lp where lp.client_id = p.id order by lp.created_at desc limit 1), 'none')
    from public.lift_lab_profiles p
    where p.role in ('member', 'admin')
    order by p.created_at desc;
end; $$;
revoke all on function public.get_lift_lab_master_roster() from public, anon;
grant execute on function public.get_lift_lab_master_roster() to authenticated;

create or replace function public.set_lift_lab_user_role(target_profile_id uuid, target_role text)
returns void language plpgsql security definer set search_path = ''
as $$
declare old_role text;
begin
  if not private.is_lift_lab_master_admin() then raise exception 'Master administrator access required.'; end if;
  if target_role not in ('member', 'admin') then raise exception 'Only client and trainer roles can be assigned here.'; end if;
  select role into old_role from public.lift_lab_profiles where id = target_profile_id for update;
  if old_role is null or old_role = 'master_admin' then raise exception 'This account role cannot be changed.'; end if;
  update public.lift_lab_profiles set role = target_role where id = target_profile_id;
  insert into public.lift_lab_admin_audit(actor_id, target_profile_id, action, details)
  values ((select auth.uid()), target_profile_id, 'role_changed', jsonb_build_object('from', old_role, 'to', target_role));
end; $$;
revoke all on function public.set_lift_lab_user_role(uuid, text) from public, anon;
grant execute on function public.set_lift_lab_user_role(uuid, text) to authenticated;

create or replace function public.set_lift_lab_program_frozen(target_client_id uuid, should_freeze boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare actor uuid := (select auth.uid());
declare changed_count integer;
begin
  if not (private.is_lift_lab_trainer() or private.is_lift_lab_master_admin()) then raise exception 'Administrator access required.'; end if;
  update public.lift_lab_programs
  set status = case when should_freeze then 'frozen' else 'active' end,
      frozen_at = case when should_freeze then now() else null end,
      frozen_by = case when should_freeze then actor else null end,
      updated_at = now()
  where client_id = target_client_id and status in ('active', 'frozen')
    and (private.is_lift_lab_master_admin() or trainer_id = actor);
  get diagnostics changed_count = row_count;
  if changed_count = 0 then raise exception 'No active or frozen program was found.'; end if;
  insert into public.lift_lab_admin_audit(actor_id, target_profile_id, action)
  values (actor, target_client_id, case when should_freeze then 'program_frozen' else 'program_unfrozen' end);
end; $$;
revoke all on function public.set_lift_lab_program_frozen(uuid, boolean) from public, anon;
grant execute on function public.set_lift_lab_program_frozen(uuid, boolean) to authenticated;

create table public.lift_lab_photo_preferences (
  client_id uuid primary key references public.lift_lab_profiles(id) on delete cascade,
  trainer_id uuid references public.lift_lab_profiles(id) on delete set null,
  opted_in boolean not null default false,
  consent_version text,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.lift_lab_progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  appointment_id uuid references public.lift_lab_appointments(id) on delete set null,
  photo_type text not null check (photo_type in ('date_started', 'check_in', 'six_month')),
  storage_path text not null unique,
  taken_on date not null default current_date,
  caption text,
  created_at timestamptz not null default now()
);

create table public.lift_lab_photo_access_log (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.lift_lab_progress_photos(id) on delete cascade,
  viewer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

alter table public.lift_lab_photo_preferences enable row level security;
alter table public.lift_lab_progress_photos enable row level security;
alter table public.lift_lab_photo_access_log enable row level security;

create policy "Clients read own photo preference" on public.lift_lab_photo_preferences for select to authenticated using (client_id = (select auth.uid()) and private.is_approved_lift_lab_member());
create policy "Trainer reads client photo preferences" on public.lift_lab_photo_preferences for select to authenticated using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Clients read own progress photo records" on public.lift_lab_progress_photos for select to authenticated using (client_id = (select auth.uid()) and private.is_approved_lift_lab_member());
create policy "Trainer manages opted-in progress photo records" on public.lift_lab_progress_photos for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer() and exists (select 1 from public.lift_lab_photo_preferences p where p.client_id = client_id and p.opted_in));
create policy "Clients add own opted-in progress photo records" on public.lift_lab_progress_photos for insert to authenticated
  with check (client_id = (select auth.uid()) and private.is_approved_lift_lab_member() and exists (select 1 from public.lift_lab_photo_preferences p where p.client_id = (select auth.uid()) and p.opted_in));
create policy "Photo owners read own access log" on public.lift_lab_photo_access_log for select to authenticated using (viewer_id = (select auth.uid()) or exists (select 1 from public.lift_lab_progress_photos p where p.id = photo_id and p.client_id = (select auth.uid())));

grant select on public.lift_lab_photo_preferences, public.lift_lab_progress_photos, public.lift_lab_photo_access_log to authenticated;
grant insert on public.lift_lab_progress_photos to authenticated;
grant update, delete on public.lift_lab_progress_photos to authenticated;

create or replace function public.set_lift_lab_photo_opt_in(allow_photos boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare trainer uuid;
begin
  if not private.is_approved_lift_lab_member() then raise exception 'Approved client account required.'; end if;
  select id into trainer from public.lift_lab_profiles where role = 'admin' order by created_at limit 1;
  insert into public.lift_lab_photo_preferences(client_id, trainer_id, opted_in, consent_version, consented_at, withdrawn_at)
  values ((select auth.uid()), trainer, allow_photos, '2026-09-06-photo-v1', case when allow_photos then now() else null end, case when allow_photos then null else now() end)
  on conflict (client_id) do update set opted_in = excluded.opted_in, trainer_id = coalesce(public.lift_lab_photo_preferences.trainer_id, excluded.trainer_id), consent_version = excluded.consent_version,
    consented_at = case when allow_photos then now() else public.lift_lab_photo_preferences.consented_at end,
    withdrawn_at = case when allow_photos then null else now() end, updated_at = now();
end; $$;
revoke all on function public.set_lift_lab_photo_opt_in(boolean) from public, anon;
grant execute on function public.set_lift_lab_photo_opt_in(boolean) to authenticated;

create or replace function public.log_lift_lab_photo_access(target_photo_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.lift_lab_progress_photos p where p.id = target_photo_id and (p.client_id = (select auth.uid()) or (p.trainer_id = (select auth.uid()) and private.is_lift_lab_trainer()))) then
    raise exception 'Photo access denied.';
  end if;
  insert into public.lift_lab_photo_access_log(photo_id, viewer_id) values (target_photo_id, (select auth.uid()));
end; $$;
revoke all on function public.log_lift_lab_photo_access(uuid) from public, anon;
grant execute on function public.log_lift_lab_photo_access(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lift-lab-progress-photos', 'lift-lab-progress-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Clients upload opted-in progress photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'lift-lab-progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.lift_lab_photo_preferences p where p.client_id = (select auth.uid()) and p.opted_in));
create policy "Clients read own private progress photos" on storage.objects for select to authenticated
  using (bucket_id = 'lift-lab-progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and private.is_approved_lift_lab_member());
create policy "Trainer reads private progress photos" on storage.objects for select to authenticated
  using (bucket_id = 'lift-lab-progress-photos' and private.is_lift_lab_trainer());

-- The required signup acknowledgment explains the separate service and the optional photo rules.
create or replace function private.create_lift_lab_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare accepted boolean;
declare version text;
declare member_name text;
declare clause_text constant text := 'Legal acknowledgment and electronic signature. By checking this box and creating my account, I affirm that I have read, understand, and agree to this acknowledgment. I understand that Madison Rabalais, doing business as Madie''s Lift Lab, is an independent trainer and independent business—not an employee, agent, partner, or representative of Southern Iron Fitness. Madie''s Lift Lab is an independently owned and operated personal-training service. Its coaching, scheduling, programs, and fees are separate from Southern Iron Fitness and are not included with a Southern Iron Fitness membership. Southern Iron Fitness does not select, direct, supervise, or control her training methods, programming, scheduling, charges, promises, or results. Any agreement for her training services is between me and Madie''s Lift Lab. I understand that exercise and strength training involve inherent risks, including the risk of physical injury, and I voluntarily choose to participate. Optional progress photos are disabled unless I separately opt in. If I opt in, the photos are for private progress tracking by me and Madie''s Lift Lab only. Madie''s Lift Lab and Southern Iron Fitness will not use them for advertising, social media, public display, or promotion without separate written authorization, and Southern Iron Fitness master administrators cannot view them. I may withdraw from photo tracking without affecting my training account. This acknowledgment documents my informed decision and the independent relationship described above. It does not release any person or business from liability that Louisiana law does not permit to be waived.';
begin
  accepted := coalesce((new.raw_user_meta_data ->> 'disclaimer_accepted')::boolean, false);
  version := nullif(new.raw_user_meta_data ->> 'disclaimer_version', '');
  member_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Lift Lab Member');
  if not accepted or version <> '2026-09-06-v4' then raise exception 'The current legal acknowledgment is required.'; end if;
  insert into public.lift_lab_profiles (id, full_name, phone, disclaimer_version, disclaimer_accepted_at)
  values (new.id, member_name, nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), version, now());
  insert into public.lift_lab_legal_acknowledgments (user_id, email, full_name, acknowledgment_version, acknowledgment_text, acknowledgment_sha256, accepted_at, auth_user_created_at, evidence)
  values (new.id, new.email, member_name, version, clause_text, encode(extensions.digest(clause_text, 'sha256'), 'hex'), now(), new.created_at,
    jsonb_build_object('source', new.raw_user_meta_data ->> 'acceptance_source', 'user_agent', new.raw_user_meta_data ->> 'acceptance_user_agent', 'request_id', new.raw_user_meta_data ->> 'acceptance_request_id', 'method', 'required_checkbox_and_account_creation', 'consent_receipt_id', new.raw_user_meta_data ->> 'consent_receipt_id', 'consent_receipt_issued_at', new.raw_user_meta_data ->> 'consent_receipt_issued_at', 'consent_receipt_signature', new.raw_user_meta_data ->> 'consent_receipt_signature', 'consent_receipt_algorithm', new.raw_user_meta_data ->> 'consent_receipt_algorithm', 'cookie_security', 'Secure; HttpOnly; SameSite=Strict'));
  insert into public.lift_lab_admin_notifications (profile_id, title, message) values (new.id, 'New Lift Lab account request', member_name || ' submitted a signed request to join Madie''s Lift Lab.');
  return new;
end; $$;
