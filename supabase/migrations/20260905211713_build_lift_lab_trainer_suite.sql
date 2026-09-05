-- Madie's Lift Lab trainer suite.
-- Financial and program data is intentionally excluded from master-admin access.

create or replace function private.is_lift_lab_trainer()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lift_lab_profiles
    where id = (select auth.uid()) and role = 'admin'
  )
$$;
revoke all on function private.is_lift_lab_trainer() from public;
grant execute on function private.is_lift_lab_trainer() to authenticated;

create or replace function private.is_approved_lift_lab_member()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lift_lab_profiles
    where id = (select auth.uid()) and role = 'member' and approval_status = 'approved'
  )
$$;
revoke all on function private.is_approved_lift_lab_member() from public;
grant execute on function private.is_approved_lift_lab_member() to authenticated;

create table public.lift_lab_settings (
  trainer_id uuid primary key references public.lift_lab_profiles(id) on delete cascade,
  booking_window_days integer not null default 14 check (booking_window_days between 1 and 365),
  default_buffer_minutes integer not null default 15 check (default_buffer_minutes between 0 and 120),
  timezone text not null default 'America/Chicago',
  venmo_url text not null default 'https://venmo.com/u/Madison-Rabalais-1',
  updated_at timestamptz not null default now()
);

create table public.lift_lab_services (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  buffer_minutes integer not null default 15 check (buffer_minutes between 0 and 120),
  capacity integer not null default 1 check (capacity between 1 and 100),
  cancellation_policy text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lift_lab_service_financials (
  service_id uuid primary key references public.lift_lab_services(id) on delete cascade,
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  price_cents integer not null check (price_cents >= 0),
  deposit_cents integer check (deposit_cents is null or deposit_cents between 0 and price_cents),
  updated_at timestamptz not null default now()
);

create table public.lift_lab_availability (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'blocked', 'closed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.lift_lab_appointments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  client_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  service_id uuid not null references public.lift_lab_services(id),
  availability_id uuid not null references public.lift_lab_availability(id),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show')),
  client_note text,
  trainer_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lift_lab_active_appointments_per_slot_idx
  on public.lift_lab_appointments(availability_id)
  where status in ('pending', 'confirmed');

create table public.lift_lab_appointment_financials (
  appointment_id uuid primary key references public.lift_lab_appointments(id) on delete cascade,
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  client_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  price_cents integer not null check (price_cents >= 0),
  deposit_cents integer check (deposit_cents is null or deposit_cents between 0 and price_cents),
  amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0),
  updated_at timestamptz not null default now()
);

create table public.lift_lab_payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.lift_lab_appointments(id) on delete cascade,
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  client_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  payment_kind text not null default 'deposit' check (payment_kind in ('deposit', 'full', 'balance', 'other')),
  status text not null default 'awaiting' check (status in ('awaiting', 'submitted', 'verified', 'rejected', 'paid_in_person')),
  method text not null default 'venmo' check (method in ('venmo', 'in_person', 'phone', 'stripe')),
  venmo_username text,
  venmo_reference text,
  proof_path text,
  trainer_note text,
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lift_lab_programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  client_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.lift_lab_program_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.lift_lab_programs(id) on delete cascade,
  trainer_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  client_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  scheduled_for date,
  sort_order integer not null default 0,
  exercise_name text not null check (char_length(exercise_name) between 1 and 160),
  target_sets integer check (target_sets is null or target_sets between 1 and 100),
  target_reps text,
  target_weight text,
  rest_seconds integer check (rest_seconds is null or rest_seconds between 0 and 3600),
  trainer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lift_lab_workout_logs (
  id uuid primary key default gen_random_uuid(),
  program_item_id uuid not null references public.lift_lab_program_items(id) on delete cascade,
  client_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  actual_sets integer check (actual_sets is null or actual_sets between 0 and 100),
  actual_reps text,
  actual_weight text,
  client_notes text,
  created_at timestamptz not null default now()
);

create table public.lift_lab_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index lift_lab_services_trainer_idx on public.lift_lab_services(trainer_id, is_active);
create index lift_lab_availability_open_idx on public.lift_lab_availability(starts_at) where status = 'open';
create index lift_lab_appointments_trainer_time_idx on public.lift_lab_appointments(trainer_id, created_at desc);
create index lift_lab_appointments_client_idx on public.lift_lab_appointments(client_id, created_at desc);
create index lift_lab_payments_trainer_idx on public.lift_lab_payments(trainer_id, created_at desc);
create index lift_lab_payments_client_idx on public.lift_lab_payments(client_id, created_at desc);
create index lift_lab_programs_client_idx on public.lift_lab_programs(client_id, status);
create index lift_lab_program_items_schedule_idx on public.lift_lab_program_items(client_id, scheduled_for);
create index lift_lab_notifications_recipient_idx on public.lift_lab_notifications(recipient_id, created_at desc);

alter table public.lift_lab_settings enable row level security;
alter table public.lift_lab_services enable row level security;
alter table public.lift_lab_service_financials enable row level security;
alter table public.lift_lab_availability enable row level security;
alter table public.lift_lab_appointments enable row level security;
alter table public.lift_lab_appointment_financials enable row level security;
alter table public.lift_lab_payments enable row level security;
alter table public.lift_lab_programs enable row level security;
alter table public.lift_lab_program_items enable row level security;
alter table public.lift_lab_workout_logs enable row level security;
alter table public.lift_lab_notifications enable row level security;

create policy "Trainer manages settings" on public.lift_lab_settings for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read trainer settings" on public.lift_lab_settings for select to authenticated
  using (private.is_approved_lift_lab_member());
create policy "Master reads operational settings" on public.lift_lab_settings for select to authenticated
  using (private.is_lift_lab_master_admin());

create policy "Trainer manages services" on public.lift_lab_services for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read active services" on public.lift_lab_services for select to authenticated
  using (is_active and private.is_approved_lift_lab_member());
create policy "Master reads service operations" on public.lift_lab_services for select to authenticated
  using (private.is_lift_lab_master_admin());

create policy "Trainer manages service financials" on public.lift_lab_service_financials for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read active service financials" on public.lift_lab_service_financials for select to authenticated
  using (private.is_approved_lift_lab_member() and exists (
    select 1 from public.lift_lab_services s where s.id = service_id and s.is_active
  ));

create policy "Trainer manages availability" on public.lift_lab_availability for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read open availability" on public.lift_lab_availability for select to authenticated
  using (status = 'open' and starts_at > now() and private.is_approved_lift_lab_member());
create policy "Master reads availability" on public.lift_lab_availability for select to authenticated
  using (private.is_lift_lab_master_admin());

create policy "Trainer manages appointments" on public.lift_lab_appointments for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read own appointments" on public.lift_lab_appointments for select to authenticated
  using (client_id = (select auth.uid()));
create policy "Members request own appointments" on public.lift_lab_appointments for insert to authenticated
  with check (client_id = (select auth.uid()) and private.is_approved_lift_lab_member());
create policy "Master reads appointments" on public.lift_lab_appointments for select to authenticated
  using (private.is_lift_lab_master_admin());

create policy "Trainer manages appointment financials" on public.lift_lab_appointment_financials for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read own appointment financials" on public.lift_lab_appointment_financials for select to authenticated
  using (client_id = (select auth.uid()));

create policy "Trainer reads payments" on public.lift_lab_payments for select to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read own payments" on public.lift_lab_payments for select to authenticated
  using (client_id = (select auth.uid()));

create policy "Trainer manages programs" on public.lift_lab_programs for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read own programs" on public.lift_lab_programs for select to authenticated
  using (client_id = (select auth.uid()));

create policy "Trainer manages program items" on public.lift_lab_program_items for all to authenticated
  using (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer())
  with check (trainer_id = (select auth.uid()) and private.is_lift_lab_trainer());
create policy "Members read own program items" on public.lift_lab_program_items for select to authenticated
  using (client_id = (select auth.uid()));

create policy "Trainer reads workout logs" on public.lift_lab_workout_logs for select to authenticated
  using (exists (select 1 from public.lift_lab_program_items i where i.id = program_item_id and i.trainer_id = (select auth.uid()) and private.is_lift_lab_trainer()));
create policy "Members manage own workout logs" on public.lift_lab_workout_logs for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and exists (
    select 1 from public.lift_lab_program_items i where i.id = program_item_id and i.client_id = (select auth.uid())
  ));

create policy "Recipients manage own notifications" on public.lift_lab_notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "Recipients update own notifications" on public.lift_lab_notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

grant select, insert, update, delete on public.lift_lab_settings to authenticated;
grant select, insert, update, delete on public.lift_lab_services to authenticated;
grant select, insert, update, delete on public.lift_lab_service_financials to authenticated;
grant select, insert, update, delete on public.lift_lab_availability to authenticated;
grant select, insert, update, delete on public.lift_lab_appointments to authenticated;
grant select, insert, update, delete on public.lift_lab_appointment_financials to authenticated;
grant select on public.lift_lab_payments to authenticated;
grant select, insert, update, delete on public.lift_lab_programs to authenticated;
grant select, insert, update, delete on public.lift_lab_program_items to authenticated;
grant select, insert, update, delete on public.lift_lab_workout_logs to authenticated;
grant select, update on public.lift_lab_notifications to authenticated;

create or replace function private.prepare_lift_lab_appointment()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare service_record public.lift_lab_services%rowtype;
declare slot_record public.lift_lab_availability%rowtype;
declare active_count integer;
begin
  if new.client_id <> (select auth.uid()) or not private.is_approved_lift_lab_member() then
    raise exception 'Approved client account required.';
  end if;
  select * into service_record from public.lift_lab_services where id = new.service_id and is_active;
  select * into slot_record from public.lift_lab_availability where id = new.availability_id and status = 'open' and starts_at > now() for update;
  if service_record.id is null or slot_record.id is null then raise exception 'This service or time is unavailable.'; end if;
  if service_record.trainer_id <> slot_record.trainer_id then raise exception 'Service and availability do not match.'; end if;
  select count(*) into active_count from public.lift_lab_appointments
    where availability_id = new.availability_id and status in ('pending', 'confirmed');
  if active_count >= service_record.capacity then raise exception 'This time has just filled. Please choose another opening.'; end if;
  if slot_record.ends_at < slot_record.starts_at + make_interval(mins => service_record.duration_minutes + service_record.buffer_minutes) then
    raise exception 'This time slot is too short for the selected service.';
  end if;
  new.trainer_id := service_record.trainer_id;
  new.status := 'pending';
  return new;
end; $$;
revoke all on function private.prepare_lift_lab_appointment() from public;
create trigger prepare_lift_lab_appointment_before_insert before insert on public.lift_lab_appointments
for each row execute function private.prepare_lift_lab_appointment();

create or replace function private.create_lift_lab_appointment_financials()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare terms public.lift_lab_service_financials%rowtype;
declare payment_amount integer;
declare payment_kind text;
begin
  select * into terms from public.lift_lab_service_financials where service_id = new.service_id;
  if terms.service_id is not null then
    insert into public.lift_lab_appointment_financials (appointment_id, trainer_id, client_id, price_cents, deposit_cents)
    values (new.id, new.trainer_id, new.client_id, terms.price_cents, terms.deposit_cents);
    payment_amount := coalesce(terms.deposit_cents, terms.price_cents);
    payment_kind := case when terms.deposit_cents is not null and terms.deposit_cents < terms.price_cents then 'deposit' else 'full' end;
    insert into public.lift_lab_payments (appointment_id, trainer_id, client_id, amount_cents, payment_kind)
    values (new.id, new.trainer_id, new.client_id, payment_amount, payment_kind);
  end if;
  insert into public.lift_lab_notifications (recipient_id, notification_type, title, message, related_id)
  values (new.trainer_id, 'appointment_request', 'New appointment request', 'A client requested an appointment.', new.id);
  if (select count(*) from public.lift_lab_appointments where availability_id = new.availability_id and status in ('pending', 'confirmed')) >=
     (select capacity from public.lift_lab_services where id = new.service_id) then
    update public.lift_lab_availability set status = 'closed', updated_at = now() where id = new.availability_id;
  end if;
  return new;
end; $$;
revoke all on function private.create_lift_lab_appointment_financials() from public;
create trigger create_lift_lab_appointment_financials_after_insert after insert on public.lift_lab_appointments
for each row execute function private.create_lift_lab_appointment_financials();

create or replace function public.review_lift_lab_appointment(target_appointment_id uuid, decision text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.lift_lab_appointments%rowtype;
begin
  if not private.is_lift_lab_trainer() then raise exception 'Trainer access required.'; end if;
  if decision not in ('confirmed', 'declined') then raise exception 'Invalid appointment decision.'; end if;
  update public.lift_lab_appointments set status = decision, trainer_note = nullif(trim(note), ''), reviewed_at = now(), updated_at = now()
    where id = target_appointment_id and trainer_id = (select auth.uid()) and status = 'pending'
    returning * into target;
  if target.id is null then raise exception 'Appointment request not found.'; end if;
  if decision = 'declined' then update public.lift_lab_availability set status = 'open', updated_at = now() where id = target.availability_id; end if;
  insert into public.lift_lab_notifications (recipient_id, notification_type, title, message, related_id)
  values (target.client_id, 'appointment_' || decision, 'Appointment ' || decision, 'Madie has ' || decision || ' your appointment request.', target.id);
end; $$;
revoke all on function public.review_lift_lab_appointment(uuid, text, text) from public, anon;
grant execute on function public.review_lift_lab_appointment(uuid, text, text) to authenticated;

create or replace function public.submit_lift_lab_venmo_proof(target_payment_id uuid, venmo_name text default null, confirmation text default null, uploaded_path text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.lift_lab_payments%rowtype;
begin
  if coalesce(nullif(trim(confirmation), ''), nullif(trim(uploaded_path), '')) is null then
    raise exception 'Enter a confirmation number or upload a payment screenshot.';
  end if;
  update public.lift_lab_payments set venmo_username = nullif(trim(venmo_name), ''), venmo_reference = nullif(trim(confirmation), ''),
    proof_path = nullif(trim(uploaded_path), ''), status = 'submitted', submitted_at = now(), updated_at = now()
    where id = target_payment_id and client_id = (select auth.uid()) and status in ('awaiting', 'rejected')
    returning * into target;
  if target.id is null then raise exception 'Payment request not found.'; end if;
  insert into public.lift_lab_notifications (recipient_id, notification_type, title, message, related_id)
  values (target.trainer_id, 'payment_submitted', 'Venmo payment submitted', 'A client submitted Venmo payment information for review.', target.id);
end; $$;
revoke all on function public.submit_lift_lab_venmo_proof(uuid, text, text, text) from public, anon;
grant execute on function public.submit_lift_lab_venmo_proof(uuid, text, text, text) to authenticated;

create or replace function public.review_lift_lab_payment(target_payment_id uuid, decision text, note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.lift_lab_payments%rowtype;
begin
  if not private.is_lift_lab_trainer() then raise exception 'Trainer access required.'; end if;
  if decision not in ('verified', 'rejected', 'paid_in_person') then raise exception 'Invalid payment decision.'; end if;
  update public.lift_lab_payments set status = decision, trainer_note = nullif(trim(note), ''),
    verified_at = case when decision in ('verified', 'paid_in_person') then now() else null end, updated_at = now()
    where id = target_payment_id and trainer_id = (select auth.uid()) returning * into target;
  if target.id is null then raise exception 'Payment request not found.'; end if;
  if decision in ('verified', 'paid_in_person') then
    update public.lift_lab_appointment_financials set amount_paid_cents = least(price_cents, amount_paid_cents + target.amount_cents), updated_at = now()
      where appointment_id = target.appointment_id;
  end if;
  insert into public.lift_lab_notifications (recipient_id, notification_type, title, message, related_id)
  values (target.client_id, 'payment_' || decision, 'Payment ' || replace(decision, '_', ' '), 'Madie updated your payment status.', target.id);
end; $$;
revoke all on function public.review_lift_lab_payment(uuid, text, text) from public, anon;
grant execute on function public.review_lift_lab_payment(uuid, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lift-lab-payment-proofs', 'lift-lab-payment-proofs', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Clients upload own payment proof" on storage.objects for insert to authenticated
  with check (bucket_id = 'lift-lab-payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Clients read own payment proof" on storage.objects for select to authenticated
  using (bucket_id = 'lift-lab-payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Trainer reads payment proof" on storage.objects for select to authenticated
  using (bucket_id = 'lift-lab-payment-proofs' and private.is_lift_lab_trainer());

-- Preserve server-issued consent receipt data in the immutable legal evidence.
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
     jsonb_build_object(
       'source', new.raw_user_meta_data ->> 'acceptance_source',
       'user_agent', new.raw_user_meta_data ->> 'acceptance_user_agent',
       'request_id', new.raw_user_meta_data ->> 'acceptance_request_id',
       'method', 'required_checkbox_and_account_creation',
       'consent_receipt_id', new.raw_user_meta_data ->> 'consent_receipt_id',
       'consent_receipt_issued_at', new.raw_user_meta_data ->> 'consent_receipt_issued_at',
       'consent_receipt_signature', new.raw_user_meta_data ->> 'consent_receipt_signature',
       'consent_receipt_algorithm', new.raw_user_meta_data ->> 'consent_receipt_algorithm',
       'cookie_security', 'Secure; HttpOnly; SameSite=Strict'));
  insert into public.lift_lab_admin_notifications (profile_id, title, message)
  values (new.id, 'New Lift Lab account request', member_name || ' submitted a signed request to join Madie''s Lift Lab.');
  return new;
end; $$;

-- Remove master-admin access to legacy business registration records. Southern Iron retains only legal evidence.
drop policy if exists "Master admins read registrations" on public.lift_lab_registrations;
