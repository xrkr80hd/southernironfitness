-- Own-record policies must also verify the member role. This prevents a trainer
-- or master administrator from gaining private client access through a mistaken FK.

drop policy if exists "Members read own appointment financials" on public.lift_lab_appointment_financials;
create policy "Members read own appointment financials" on public.lift_lab_appointment_financials for select to authenticated
  using (client_id = (select auth.uid()) and private.is_approved_lift_lab_member());

drop policy if exists "Members read own payments" on public.lift_lab_payments;
create policy "Members read own payments" on public.lift_lab_payments for select to authenticated
  using (client_id = (select auth.uid()) and private.is_approved_lift_lab_member());

drop policy if exists "Members read own programs" on public.lift_lab_programs;
create policy "Members read own programs" on public.lift_lab_programs for select to authenticated
  using (client_id = (select auth.uid()) and private.is_approved_lift_lab_member());

drop policy if exists "Members read own program items" on public.lift_lab_program_items;
create policy "Members read own program items" on public.lift_lab_program_items for select to authenticated
  using (client_id = (select auth.uid()) and private.is_approved_lift_lab_member());

drop policy if exists "Members manage own workout logs" on public.lift_lab_workout_logs;
create policy "Members manage own workout logs" on public.lift_lab_workout_logs for all to authenticated
  using (client_id = (select auth.uid()) and private.is_approved_lift_lab_member())
  with check (client_id = (select auth.uid()) and private.is_approved_lift_lab_member() and exists (
    select 1 from public.lift_lab_program_items i where i.id = program_item_id and i.client_id = (select auth.uid())
  ));
