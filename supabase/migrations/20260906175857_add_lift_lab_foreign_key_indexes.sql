-- Cover Lift Lab foreign keys used by account, scheduling, progress, and audit lookups.

create index if not exists lift_lab_admin_audit_actor_idx on public.lift_lab_admin_audit(actor_id);
create index if not exists lift_lab_admin_audit_target_profile_idx on public.lift_lab_admin_audit(target_profile_id);
create index if not exists lift_lab_admin_notifications_profile_idx on public.lift_lab_admin_notifications(profile_id);
create index if not exists lift_lab_appointment_financials_client_idx on public.lift_lab_appointment_financials(client_id);
create index if not exists lift_lab_appointment_financials_trainer_idx on public.lift_lab_appointment_financials(trainer_id);
create index if not exists lift_lab_appointments_service_idx on public.lift_lab_appointments(service_id);
create index if not exists lift_lab_availability_trainer_idx on public.lift_lab_availability(trainer_id);
create index if not exists lift_lab_classes_created_by_idx on public.lift_lab_classes(created_by);
create index if not exists lift_lab_payments_appointment_idx on public.lift_lab_payments(appointment_id);
create index if not exists lift_lab_photo_access_log_photo_idx on public.lift_lab_photo_access_log(photo_id);
create index if not exists lift_lab_photo_access_log_viewer_idx on public.lift_lab_photo_access_log(viewer_id);
create index if not exists lift_lab_photo_preferences_trainer_idx on public.lift_lab_photo_preferences(trainer_id);
create index if not exists lift_lab_program_items_program_idx on public.lift_lab_program_items(program_id);
create index if not exists lift_lab_program_items_trainer_idx on public.lift_lab_program_items(trainer_id);
create index if not exists lift_lab_programs_frozen_by_idx on public.lift_lab_programs(frozen_by);
create index if not exists lift_lab_programs_trainer_idx on public.lift_lab_programs(trainer_id);
create index if not exists lift_lab_progress_photos_appointment_idx on public.lift_lab_progress_photos(appointment_id);
create index if not exists lift_lab_progress_photos_client_idx on public.lift_lab_progress_photos(client_id);
create index if not exists lift_lab_progress_photos_trainer_idx on public.lift_lab_progress_photos(trainer_id);
create index if not exists lift_lab_service_financials_trainer_idx on public.lift_lab_service_financials(trainer_id);
create index if not exists lift_lab_workout_logs_client_idx on public.lift_lab_workout_logs(client_id);
create index if not exists lift_lab_workout_logs_program_item_idx on public.lift_lab_workout_logs(program_item_id);
