-- Require the revised acknowledgment that clearly separates Madie's paid
-- training business from Southern Iron Fitness memberships.
create or replace function private.create_lift_lab_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare accepted boolean;
declare version text;
declare member_name text;
declare clause_text constant text := 'Legal acknowledgment and electronic signature. By checking this box and creating my account, I affirm that I have read, understand, and agree to this acknowledgment. I understand that Madison Rabalais, doing business as Madie''s Lift Lab, is an independent trainer and independent business—not an employee, agent, partner, or representative of Southern Iron Fitness. Madie''s Lift Lab is an independently owned and operated personal-training service. Its coaching, scheduling, programs, and fees are separate from Southern Iron Fitness and are not included with a Southern Iron Fitness membership. Southern Iron Fitness does not select, direct, supervise, or control her training methods, programming, scheduling, charges, promises, or results. Any agreement for her training services is between me and Madie''s Lift Lab. I understand that exercise and strength training involve inherent risks, including the risk of physical injury, and I voluntarily choose to participate. This acknowledgment documents my informed decision and the independent relationship described above. It does not release any person or business from liability that Louisiana law does not permit to be waived.';
begin
  accepted := coalesce((new.raw_user_meta_data ->> 'disclaimer_accepted')::boolean, false);
  version := nullif(new.raw_user_meta_data ->> 'disclaimer_version', '');
  member_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Lift Lab Member');
  if not accepted or version <> '2026-09-05-v3' then raise exception 'The current legal acknowledgment is required.'; end if;
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
