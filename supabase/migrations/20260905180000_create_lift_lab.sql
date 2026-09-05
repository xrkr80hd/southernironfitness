create schema if not exists private;

create type public.lift_lab_role as enum ('member', 'admin');
create type public.lift_lab_registration_status as enum ('registered', 'attended', 'cancelled', 'no_show');
create type public.lift_lab_payment_status as enum ('unpaid', 'paid_in_person', 'paid_by_phone', 'paid_online');

create table public.lift_lab_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text,
  role public.lift_lab_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lift_lab_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  capacity integer not null default 10 check (capacity between 1 and 500),
  location text not null default 'Southern Iron Fitness',
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lift_lab_registrations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.lift_lab_classes(id) on delete cascade,
  user_id uuid not null references public.lift_lab_profiles(id) on delete cascade,
  status public.lift_lab_registration_status not null default 'registered',
  payment_status public.lift_lab_payment_status not null default 'unpaid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, user_id)
);

create index lift_lab_classes_starts_at_idx on public.lift_lab_classes(starts_at);
create index lift_lab_registrations_user_id_idx on public.lift_lab_registrations(user_id);
create index lift_lab_registrations_class_id_idx on public.lift_lab_registrations(class_id);

create or replace function private.is_lift_lab_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.lift_lab_profiles where id = (select auth.uid()) and role = 'admin') $$;
revoke all on function private.is_lift_lab_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_lift_lab_admin() to authenticated;

create or replace function private.create_lift_lab_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.lift_lab_profiles (id, full_name, phone)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Lift Lab Member'), nullif(trim(new.raw_user_meta_data ->> 'phone'), ''));
  return new;
end; $$;
revoke all on function private.create_lift_lab_profile() from public;

create trigger create_lift_lab_profile_after_signup after insert on auth.users
for each row execute function private.create_lift_lab_profile();

create or replace function private.enforce_lift_lab_capacity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare available_capacity integer;
declare active_registrations integer;
begin
  if new.user_id <> (select auth.uid()) and not private.is_lift_lab_admin() then
    raise exception 'You can only register your own account.';
  end if;
  select capacity into available_capacity from public.lift_lab_classes
    where id = new.class_id and is_published = true and starts_at > now() for update;
  if available_capacity is null then raise exception 'This class is not available.'; end if;
  select count(*) into active_registrations from public.lift_lab_registrations
    where class_id = new.class_id and status <> 'cancelled';
  if active_registrations >= available_capacity then raise exception 'This class is full.'; end if;
  return new;
end; $$;
revoke all on function private.enforce_lift_lab_capacity() from public;

create trigger enforce_lift_lab_capacity_before_registration before insert on public.lift_lab_registrations
for each row execute function private.enforce_lift_lab_capacity();

alter table public.lift_lab_profiles enable row level security;
alter table public.lift_lab_classes enable row level security;
alter table public.lift_lab_registrations enable row level security;

create policy "Members read own profile" on public.lift_lab_profiles for select to authenticated using ((select auth.uid()) = id or private.is_lift_lab_admin());
create policy "Members update own profile" on public.lift_lab_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id and role = 'member');
create policy "Admins manage profiles" on public.lift_lab_profiles for all to authenticated using (private.is_lift_lab_admin()) with check (private.is_lift_lab_admin());

create policy "Members read published classes" on public.lift_lab_classes for select to authenticated using (is_published or private.is_lift_lab_admin());
create policy "Admins manage classes" on public.lift_lab_classes for all to authenticated using (private.is_lift_lab_admin()) with check (private.is_lift_lab_admin());

create policy "Members read own registrations" on public.lift_lab_registrations for select to authenticated using ((select auth.uid()) = user_id or private.is_lift_lab_admin());
create policy "Members create own registrations" on public.lift_lab_registrations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Admins manage registrations" on public.lift_lab_registrations for all to authenticated using (private.is_lift_lab_admin()) with check (private.is_lift_lab_admin());

grant select, update on public.lift_lab_profiles to authenticated;
grant select on public.lift_lab_classes to authenticated;
grant select, insert, update on public.lift_lab_registrations to authenticated;
grant insert, update, delete on public.lift_lab_classes to authenticated;
