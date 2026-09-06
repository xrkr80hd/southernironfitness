"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { CustomerExperiencePreview, TrainerExperiencePreview } from "./experience-previews";

type Role = "admin" | "master_admin";
type Tab = "overview" | "calendar" | "clients" | "services" | "programs" | "progress" | "payments" | "settings" | "customer preview" | "madie preview";
type Client = { id: string; account_number?: string; full_name: string; phone?: string | null; role?: string; approval_status: "pending" | "approved" | "denied"; disclaimer_accepted_at?: string | null; created_at?: string; program_status?: string };
type Service = { id: string; trainer_id: string; name: string; description: string | null; duration_minutes: number; buffer_minutes: number; capacity: number; cancellation_policy: string | null; is_active: boolean; lift_lab_service_financials?: { price_cents: number; deposit_cents: number | null } | null };
type Slot = { id: string; trainer_id: string; starts_at: string; ends_at: string; status: "open" | "blocked" | "closed"; note: string | null };
type Appointment = { id: string; status: string; client_note: string | null; trainer_note: string | null; requested_at: string; client: { full_name: string } | null; service: { name: string } | null; availability: { starts_at: string; ends_at: string } | null };
type MasterAppointment = { id: string; status: string; requested_at: string; client_name: string; service_name: string; starts_at: string; ends_at: string };
type Program = { id: string; trainer_id: string; client_id: string; title: string; description: string | null; goal: string | null; weekly_frequency: number | null; starts_on: string | null; ends_on: string | null; status: string; client: { full_name: string } | null };
type ProgramItem = { id: string; program_id: string; scheduled_for: string | null; day_label: string | null; exercise_name: string; target_sets: number | null; target_reps: string | null; target_weight: string | null; rest_seconds: number | null; tempo: string | null };
type Payment = { id: string; amount_cents: number; payment_kind: string; status: string; method: string; venmo_username: string | null; venmo_reference: string | null; proof_path: string | null; client: { full_name: string } | null };
type Settings = { trainer_id: string; booking_window_days: number; default_buffer_minutes: number; timezone: string; venmo_url: string };
type WorkoutLog = { id: string; client_id: string; completed_at: string; actual_weight: string | null };
type PhotoPreference = { client_id: string; opted_in: boolean; consented_at: string | null };
type ProgressPhoto = { id: string; client_id: string; photo_type: string; storage_path: string; taken_on: string };
type AdminNotification = { id: string; profile_id: string | null; title: string; message: string; read_at: string | null; created_at: string };

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const toCents = (value: FormDataEntryValue | null) => Math.round(Number(value || 0) * 100);

export default function LiftLabAdmin() {
  const [role, setRole] = useState<Role | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [photoPreferences, setPhotoPreferences] = useState<PhotoPreference[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setRole(null); setAuthChecked(true); return; }
      const { data: profile } = await supabase.from("lift_lab_profiles").select("role").eq("id", authData.user.id).single();
      if (profile?.role !== "admin" && profile?.role !== "master_admin") { setRole(null); setAuthChecked(true); setMessage("This account does not have administrator access."); return; }
      const currentRole = profile.role as Role;
      setRole(currentRole);
      setUserId(authData.user.id);
      setAuthChecked(true);

      const serviceSelect = currentRole === "admin"
        ? "id, trainer_id, name, description, duration_minutes, buffer_minutes, capacity, cancellation_policy, is_active, lift_lab_service_financials(price_cents, deposit_cents)"
        : "id, trainer_id, name, description, duration_minutes, buffer_minutes, capacity, cancellation_policy, is_active";
      const clientRequest = currentRole === "admin"
        ? supabase.from("lift_lab_profiles").select("id, account_number, full_name, phone, approval_status, disclaimer_accepted_at, created_at").eq("role", "member").order("created_at", { ascending: false })
        : supabase.rpc("get_lift_lab_master_roster");
      const slotRequest = currentRole === "admin"
        ? supabase.from("lift_lab_availability").select("id, trainer_id, starts_at, ends_at, status, note").order("starts_at")
        : supabase.rpc("get_lift_lab_master_availability");
      const appointmentRequest = currentRole === "admin"
        ? supabase.from("lift_lab_appointments").select("id, status, client_note, trainer_note, requested_at, client:lift_lab_profiles!lift_lab_appointments_client_id_fkey(full_name), service:lift_lab_services!lift_lab_appointments_service_id_fkey(name), availability:lift_lab_availability!lift_lab_appointments_availability_id_fkey(starts_at, ends_at)").order("requested_at", { ascending: false })
        : supabase.rpc("get_lift_lab_master_appointments");
      const [clientResult, serviceResult, slotResult, appointmentResult] = await Promise.all([
        clientRequest,
        supabase.from("lift_lab_services").select(serviceSelect).order("created_at", { ascending: false }),
        slotRequest,
        appointmentRequest,
      ]);
      setClients((clientResult.data ?? []) as Client[]);
      setServices((serviceResult.data ?? []) as unknown as Service[]);
      setSlots(((slotResult.data ?? []) as Array<Omit<Slot, "note"> & { note?: string | null }>).map(item => ({ ...item, note: item.note ?? null })));
      setAppointments(currentRole === "admin" ? (appointmentResult.data ?? []) as unknown as Appointment[] : ((appointmentResult.data ?? []) as MasterAppointment[]).map(item => ({ id: item.id, status: item.status, requested_at: item.requested_at, client_note: null, trainer_note: null, client: { full_name: item.client_name }, service: { name: item.service_name }, availability: { starts_at: item.starts_at, ends_at: item.ends_at } })));

      if (currentRole === "admin") {
        const [programResult, itemResult, paymentResult, settingsResult, workoutResult, preferenceResult, photoResult, signupNotificationResult, workflowNotificationResult] = await Promise.all([
          supabase.from("lift_lab_programs").select("id, trainer_id, client_id, title, description, goal, weekly_frequency, starts_on, ends_on, status, client:lift_lab_profiles!lift_lab_programs_client_id_fkey(full_name)").order("created_at", { ascending: false }),
          supabase.from("lift_lab_program_items").select("id, program_id, scheduled_for, day_label, exercise_name, target_sets, target_reps, target_weight, rest_seconds, tempo").order("scheduled_for"),
          supabase.from("lift_lab_payments").select("id, amount_cents, payment_kind, status, method, venmo_username, venmo_reference, proof_path, client:lift_lab_profiles!lift_lab_payments_client_id_fkey(full_name)").order("created_at", { ascending: false }),
          supabase.from("lift_lab_settings").select("trainer_id, booking_window_days, default_buffer_minutes, timezone, venmo_url").maybeSingle(),
          supabase.from("lift_lab_workout_logs").select("id, client_id, completed_at, actual_weight").order("completed_at", { ascending: false }),
          supabase.from("lift_lab_photo_preferences").select("client_id, opted_in, consented_at"),
          supabase.from("lift_lab_progress_photos").select("id, client_id, photo_type, storage_path, taken_on").order("taken_on", { ascending: false }),
          supabase.from("lift_lab_admin_notifications").select("id, profile_id, title, message, read_at, created_at").order("created_at", { ascending: false }).limit(20),
          supabase.from("lift_lab_notifications").select("id, title, message, read_at, created_at").order("created_at", { ascending: false }).limit(20),
        ]);
        setPrograms((programResult.data ?? []) as unknown as Program[]);
        setProgramItems((itemResult.data ?? []) as ProgramItem[]);
        setPayments((paymentResult.data ?? []) as unknown as Payment[]);
        setSettings((settingsResult.data as Settings | null) ?? null);
        setWorkoutLogs((workoutResult.data ?? []) as WorkoutLog[]);
        setPhotoPreferences((preferenceResult.data ?? []) as PhotoPreference[]);
        setProgressPhotos((photoResult.data ?? []) as ProgressPhoto[]);
        setNotifications([
          ...((signupNotificationResult.data ?? []) as AdminNotification[]),
          ...((workflowNotificationResult.data ?? []) as Omit<AdminNotification, "profile_id">[]).map(item => ({ ...item, profile_id: null })),
        ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 30));
      } else {
        setPrograms([]); setProgramItems([]); setPayments([]); setSettings(null); setWorkoutLogs([]); setPhotoPreferences([]); setProgressPhotos([]); setNotifications([]);
      }
    } catch (error) {
      setAuthChecked(true);
      setMessage(error instanceof Error ? error.message : "The dashboard could not be loaded.");
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const calendarDays = useMemo(() => {
    const first = new Date(month);
    first.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(first);
      day.setDate(first.getDate() + index);
      return day;
    });
  }, [month]);

  async function reviewClient(id: string, decision: "approved" | "denied") {
    const { error } = await createClient().rpc("review_lift_lab_account", { target_profile_id: id, decision });
    setMessage(error ? error.message : `Client ${decision}.`);
    if (!error) await load();
  }

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "admin") return;
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data, error } = await supabase.from("lift_lab_services").insert({ trainer_id: userId, name: String(form.get("name")), description: String(form.get("description") || ""), duration_minutes: Number(form.get("duration")), buffer_minutes: Number(form.get("buffer")), capacity: Number(form.get("capacity")) || 1, cancellation_policy: String(form.get("policy") || "") || null }).select("id").single();
    if (!error && data) {
      const price = toCents(form.get("price"));
      const depositRaw = String(form.get("deposit") || "").trim();
      const terms = await supabase.from("lift_lab_service_financials").insert({ service_id: data.id, trainer_id: userId, price_cents: price, deposit_cents: depositRaw ? toCents(depositRaw) : null });
      if (terms.error) await supabase.from("lift_lab_services").delete().eq("id", data.id);
      setMessage(terms.error ? terms.error.message : "Service and pricing saved privately for Madie.");
    } else setMessage(error?.message || "Service could not be saved.");
    if (!error) { event.currentTarget.reset(); await load(); }
  }

  async function toggleService(service: Service) {
    if (role !== "admin") return;
    const { error } = await createClient().from("lift_lab_services").update({ is_active: !service.is_active, updated_at: new Date().toISOString() }).eq("id", service.id);
    setMessage(error ? error.message : "Service updated.");
    if (!error) await load();
  }

  async function createAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "admin") return;
    const form = new FormData(event.currentTarget);
    const startsAt = new Date(String(form.get("startsAt")));
    const endsAt = new Date(String(form.get("endsAt")));
    const repeatWeeks = Math.min(52, Math.max(1, Number(form.get("repeatWeeks")) || 1));
    const rows = Array.from({ length: repeatWeeks }, (_, index) => ({ trainer_id: userId, starts_at: new Date(startsAt.getTime() + index * 7 * 86400000).toISOString(), ends_at: new Date(endsAt.getTime() + index * 7 * 86400000).toISOString(), status: "open", note: String(form.get("note") || "") || null }));
    const { error } = await createClient().from("lift_lab_availability").insert(rows);
    setMessage(error ? error.message : `${rows.length} available time${rows.length === 1 ? "" : "s"} opened.`);
    if (!error) { event.currentTarget.reset(); await load(); }
  }

  async function reviewAppointment(id: string, decision: "confirmed" | "declined") {
    if (role !== "admin") return;
    const { error } = await createClient().rpc("review_lift_lab_appointment", { target_appointment_id: id, decision, note: null });
    setMessage(error ? error.message : `Appointment ${decision}.`);
    if (!error) await load();
  }

  async function setAppointmentStatus(id: string, nextStatus: "completed" | "no_show" | "cancelled") {
    if (role !== "admin") return;
    const label = nextStatus === "no_show" ? "no-show" : nextStatus;
    if (nextStatus === "cancelled" && !window.confirm("Cancel this confirmed appointment and reopen its time slot?")) return;
    const { error } = await createClient().rpc("set_lift_lab_appointment_status", { target_appointment_id: id, next_status: nextStatus });
    setMessage(error ? error.message : `Appointment marked ${label}. The client was notified in the app.`);
    if (!error) await load();
  }

  async function setAvailabilityStatus(slot: Slot, nextStatus: Slot["status"]) {
    if (role !== "admin") return;
    const { error } = await createClient().rpc("set_lift_lab_availability_status", { target_availability_id: slot.id, next_status: nextStatus });
    setMessage(error ? error.message : `Availability marked ${nextStatus}.`);
    if (!error) await load();
  }

  async function markNotificationsRead() {
    if (role !== "admin") return;
    const supabase = createClient();
    const readAt = new Date().toISOString();
    const [signupResult, workflowResult] = await Promise.all([
      supabase.from("lift_lab_admin_notifications").update({ read_at: readAt }).is("read_at", null),
      supabase.from("lift_lab_notifications").update({ read_at: readAt }).is("read_at", null),
    ]);
    const error = signupResult.error || workflowResult.error;
    setMessage(error ? error.message : "Notifications marked read.");
    if (!error) await load();
  }

  async function createProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "admin") return;
    const form = new FormData(event.currentTarget);
    const { error } = await createClient().from("lift_lab_programs").insert({ trainer_id: userId, client_id: String(form.get("clientId")), title: String(form.get("title")), description: String(form.get("description") || ""), goal: String(form.get("goal") || "") || null, weekly_frequency: Number(form.get("frequency")) || null, starts_on: String(form.get("startsOn") || "") || null, ends_on: String(form.get("endsOn") || "") || null, status: "active" });
    setMessage(error ? error.message : "Program assigned to the client.");
    if (!error) { event.currentTarget.reset(); await load(); }
  }

  async function addExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "admin") return;
    const form = new FormData(event.currentTarget);
    const program = programs.find(item => item.id === String(form.get("programId")));
    if (!program) return;
    const { error } = await createClient().from("lift_lab_program_items").insert({ program_id: program.id, trainer_id: userId, client_id: program.client_id, scheduled_for: String(form.get("scheduledFor") || "") || null, day_label: String(form.get("dayLabel") || "") || null, exercise_name: String(form.get("exercise")), target_sets: Number(form.get("sets")) || null, target_reps: String(form.get("reps") || "") || null, target_weight: String(form.get("weight") || "") || null, rest_seconds: Number(form.get("rest")) || null, tempo: String(form.get("tempo") || "") || null, trainer_notes: String(form.get("notes") || "") || null });
    setMessage(error ? error.message : "Exercise added to the program.");
    if (!error) { event.currentTarget.reset(); await load(); }
  }

  async function reviewPayment(id: string, decision: "verified" | "rejected" | "paid_in_person") {
    if (role !== "admin") return;
    const { error } = await createClient().rpc("review_lift_lab_payment", { target_payment_id: id, decision, note: null });
    setMessage(error ? error.message : "Payment status updated.");
    if (!error) await load();
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "admin") return;
    const form = new FormData(event.currentTarget);
    const { error } = await createClient().from("lift_lab_settings").upsert({ trainer_id: userId, booking_window_days: Number(form.get("window")), default_buffer_minutes: Number(form.get("buffer")), timezone: "America/Chicago", venmo_url: String(form.get("venmo")), updated_at: new Date().toISOString() });
    setMessage(error ? error.message : "Scheduling settings saved.");
    if (!error) await load();
  }

  async function setProgramFrozen(clientId: string, frozen: boolean) {
    const { error } = await createClient().rpc("set_lift_lab_program_frozen", { target_client_id: clientId, should_freeze: frozen });
    setMessage(error ? error.message : frozen ? "Program frozen. History was preserved." : "Program reactivated.");
    if (!error) await load();
  }

  async function setAccountRole(client: Client, nextRole: "member" | "admin") {
    if (role !== "master_admin") return;
    const verb = nextRole === "admin" ? "make this account Madie’s trainer administrator" : "return this account to client access";
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;
    const { error } = await createClient().rpc("set_lift_lab_user_role", { target_profile_id: client.id, target_role: nextRole });
    setMessage(error ? error.message : "Account role updated and recorded in the audit log.");
    if (!error) await load();
  }

  async function viewPrivatePhoto(photo: ProgressPhoto) {
    if (role !== "admin") return;
    const supabase = createClient();
    const logged = await supabase.rpc("log_lift_lab_photo_access", { target_photo_id: photo.id });
    if (logged.error) { setMessage(logged.error.message); return; }
    const signed = await supabase.storage.from("lift-lab-progress-photos").createSignedUrl(photo.storage_path, 60);
    if (signed.error || !signed.data?.signedUrl) { setMessage(signed.error?.message || "The private photo could not be opened."); return; }
    window.open(signed.data.signedUrl, "_blank", "noopener,noreferrer");
    setMessage("Private photo access recorded. The secure link expires in one minute.");
  }

  if (!authChecked) return <section className="lift-lab-admin"><p>Opening the secure dashboard…</p></section>;
  if (role === null) return <section className="lift-lab-admin"><h1>Private dashboard</h1><p>{message || "Authorized administrator access is required."}</p><a className="button" href="/lift-lab">Return to login</a></section>;

  const trainer = role === "admin";
  const tabs: Tab[] = trainer ? ["overview", "calendar", "clients", "services", "programs", "progress", "payments", "settings"] : ["overview", "calendar", "clients", "customer preview", "madie preview"];
  const pendingAppointments = appointments.filter(item => item.status === "pending");

  return (
    <section className="lift-lab-admin lift-suite">
      <div className="lift-lab-admin__title"><div><p className="eyebrow">{trainer ? "Independent trainer workspace" : "Read-only system oversight"}</p><h1>{trainer ? "Madie’s Lift Lab" : "Lift Lab Support"}</h1></div><p>{trainer ? "Run scheduling, clients, programs, and payments from one private workspace." : "Scheduling and account visibility for technical support. Financial and program data remains private to Madie."}</p></div>
      <nav className="lift-suite__tabs" aria-label="Dashboard sections">{tabs.map(item => <button key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
      {message ? <p className="lift-lab-message" role="status">{message}</p> : null}

      {tab === "overview" ? <div className="lift-suite__stack"><div className="lift-suite__metrics"><article><strong>{pendingAppointments.length}</strong><span>Appointment requests</span></article><article><strong>{slots.filter(item => item.status === "open").length}</strong><span>Open times</span></article><article><strong>{clients.filter(item => item.approval_status === "approved").length}</strong><span>Approved clients</span></article>{trainer ? <article><strong>{programs.filter(item => item.status === "active").length}</strong><span>Active programs</span></article> : null}</div>{trainer ? <section className="lift-lab-card"><div className="lift-lab-dashboard__head"><div><h2>In-app notifications</h2><p className="lift-lab-card__intro">New signups, appointment requests, cancellations, and payment updates appear here for Madie—no email service is required.</p></div>{notifications.some(item => !item.read_at) ? <button className="lift-preview__small" onClick={markNotificationsRead}>Mark All Read</button> : null}</div><div className="lift-suite__list">{notifications.length ? notifications.map(item => <article key={item.id}><div><strong>{item.title}</strong><span>{item.message} · {new Date(item.created_at).toLocaleString()}</span></div><span className={`lift-lab-status lift-lab-status--${item.read_at ? "completed" : "pending"}`}>{item.read_at ? "handled" : "new"}</span></article>) : <p>No notifications yet.</p>}</div></section> : null}</div> : null}

      {tab === "calendar" ? <div className="lift-suite__stack">
        <section className="lift-lab-card lift-suite__calendar-card"><div className="lift-suite__calendar-head"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><h2>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div><div className="lift-suite__weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <strong key={day}>{day}</strong>)}</div><div className="lift-suite__calendar">{calendarDays.map(day => { const dayKey = day.toDateString(); const daySlots = slots.filter(item => new Date(item.starts_at).toDateString() === dayKey); const dayAppointments = appointments.filter(item => item.availability && new Date(item.availability.starts_at).toDateString() === dayKey && !["declined", "cancelled"].includes(item.status)); return <article key={day.toISOString()} className={day.getMonth() === month.getMonth() ? "" : "is-muted"}><span>{day.getDate()}</span>{daySlots.length ? <small>{daySlots.length} time{daySlots.length === 1 ? "" : "s"}</small> : null}{dayAppointments.length ? <b>{dayAppointments.length} booked</b> : null}</article>; })}</div></section>
        {trainer ? <section className="lift-lab-card"><h2>Open availability</h2><p className="lift-lab-card__intro">Open one date or repeat the same time weekly. The normal booking window is 14 days, but you can open dates as far ahead as you choose.</p><form className="lift-lab-form" onSubmit={createAvailability}><label>Starts<input name="startsAt" type="datetime-local" required /></label><label>Ends<input name="endsAt" type="datetime-local" required /></label><label>Repeat weekly<input name="repeatWeeks" type="number" min="1" max="52" defaultValue="1" /></label><label>Private note<input name="note" /></label><button className="button">Open Time</button></form><h3>Manage upcoming times</h3><div className="lift-suite__list">{slots.filter(slot => new Date(slot.ends_at) >= new Date()).slice(0, 30).map(slot => <article key={slot.id}><div><strong>{new Date(slot.starts_at).toLocaleString()}</strong><span>Ends {new Date(slot.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{slot.note ? ` · ${slot.note}` : ""}</span></div><span className={`lift-lab-status lift-lab-status--${slot.status}`}>{slot.status}</span><div className="lift-lab-request-actions">{slot.status !== "open" ? <button onClick={() => setAvailabilityStatus(slot, "open")}>Open</button> : null}{slot.status !== "blocked" ? <button onClick={() => setAvailabilityStatus(slot, "blocked")}>Block</button> : null}{slot.status !== "closed" ? <button onClick={() => setAvailabilityStatus(slot, "closed")}>Close</button> : null}</div></article>)}</div></section> : null}
        <section className="lift-lab-card"><h2>Appointments</h2><div className="lift-suite__list">{appointments.length ? appointments.map(item => <article key={item.id}><div><strong>{item.client?.full_name || "Client"}</strong><span>{item.service?.name || "Private session"} · {item.availability ? new Date(item.availability.starts_at).toLocaleString() : "Time unavailable"}</span></div><span className={`lift-lab-status lift-lab-status--${item.status}`}>{item.status.replaceAll("_", " ")}</span>{trainer && item.status === "pending" ? <div className="lift-lab-request-actions"><button onClick={() => reviewAppointment(item.id, "confirmed")}>Approve</button><button onClick={() => reviewAppointment(item.id, "declined")}>Decline</button></div> : null}{trainer && item.status === "confirmed" ? <div className="lift-lab-request-actions"><button onClick={() => setAppointmentStatus(item.id, "completed")}>Complete</button><button onClick={() => setAppointmentStatus(item.id, "no_show")}>No Show</button><button onClick={() => setAppointmentStatus(item.id, "cancelled")}>Cancel</button></div> : null}</article>) : <p>No appointments yet.</p>}</div></section>
      </div> : null}

      {tab === "clients" ? <section className="lift-lab-card"><h2>{trainer ? "Clients & acknowledgments" : "Limited customer roster"}</h2><p className="lift-lab-card__intro">{trainer ? "Madie sees acceptance status and signing time. Southern Iron separately preserves the immutable evidence record." : "Only names, Lift Lab account numbers, access status, and program state are shown. Contact details, money, workouts, notes, and photos stay private."}</p><div className="lift-suite__list">{clients.length ? clients.map(client => <article key={client.id}><div><strong>{client.full_name}{client.account_number ? ` · ${client.account_number}` : ""}</strong><span>{trainer ? `${client.phone || "No phone"} · ${client.disclaimer_accepted_at ? `Signed ${new Date(client.disclaimer_accepted_at).toLocaleString()}` : "Acknowledgment missing"}` : `${client.role === "admin" ? "Trainer administrator" : "Client"} · program ${client.program_status || "none"}`}</span></div><span className={`lift-lab-status lift-lab-status--${client.approval_status}`}>{client.approval_status}</span>{trainer && client.approval_status === "pending" ? <div className="lift-lab-request-actions"><button onClick={() => reviewClient(client.id, "approved")}>Approve</button><button onClick={() => reviewClient(client.id, "denied")}>Decline</button></div> : null}{(client.program_status === "active" || client.program_status === "frozen") ? <button className="lift-preview__small" onClick={() => setProgramFrozen(client.id, client.program_status !== "frozen")}>{client.program_status === "frozen" ? "Unfreeze" : "Freeze"}</button> : null}{!trainer ? <button className="lift-preview__small" onClick={() => setAccountRole(client, client.role === "admin" ? "member" : "admin")}>{client.role === "admin" ? "Remove trainer role" : "Make trainer admin"}</button> : null}</article>) : <p>No accounts yet.</p>}</div></section> : null}

      {tab === "services" && trainer ? <div className="lift-lab-admin-grid"><section className="lift-lab-card"><h2>Create a service</h2><form className="lift-lab-form" onSubmit={createService}><label>Service name<input name="name" required /></label><label>Description<textarea name="description" /></label><div className="lift-lab-form-row"><label>Session minutes<input name="duration" type="number" min="15" defaultValue="60" required /></label><label>Buffer minutes<input name="buffer" type="number" min="0" defaultValue="15" required /></label></div><label>Capacity<input name="capacity" type="number" min="1" max="100" defaultValue="1" required /><span>Keep at 1 for private training. Increase later for groups.</span></label><div className="lift-lab-form-row"><label>Full price<input name="price" type="number" min="0" step="0.01" required /></label><label>Deposit <span>(optional)</span><input name="deposit" type="number" min="0" step="0.01" /></label></div><label>Cancellation policy <span>(optional for now)</span><textarea name="policy" /></label><button className="button">Save Service</button></form></section><section className="lift-lab-card"><h2>Services</h2><div className="lift-suite__list">{services.length ? services.map(service => <article key={service.id}><div><strong>{service.name}</strong><span>{service.duration_minutes} min + {service.buffer_minutes} min buffer · capacity {service.capacity} · {service.lift_lab_service_financials ? money(service.lift_lab_service_financials.price_cents) : "No price"}{service.lift_lab_service_financials?.deposit_cents != null ? ` · ${money(service.lift_lab_service_financials.deposit_cents)} deposit` : ""}</span></div><button className="lift-lab-text-button" onClick={() => toggleService(service)}>{service.is_active ? "Pause" : "Activate"}</button></article>) : <p>No services created yet.</p>}</div></section></div> : null}

      {tab === "programs" && trainer ? <div className="lift-suite__stack"><div className="lift-lab-admin-grid"><section className="lift-lab-card"><h2>Assign a program</h2><form className="lift-lab-form" onSubmit={createProgram}><label>Client<select name="clientId" required><option value="">Choose a client</option>{clients.filter(item => item.approval_status === "approved").map(client => <option key={client.id} value={client.id}>{client.full_name}</option>)}</select></label><label>Program name<input name="title" required /></label><label>Goal<input name="goal" placeholder="Build strength and consistency" /></label><label>Sessions each week<input name="frequency" type="number" min="1" max="14" defaultValue="3" /></label><label>Program description<textarea name="description" /></label><div className="lift-lab-form-row"><label>Starts<input name="startsOn" type="date" /></label><label>Ends<input name="endsOn" type="date" /></label></div><button className="button">Assign Program</button></form></section><section className="lift-lab-card"><h2>Add an exercise</h2><form className="lift-lab-form" onSubmit={addExercise}><label>Program<select name="programId" required><option value="">Choose a program</option>{programs.map(program => <option key={program.id} value={program.id}>{program.client?.full_name} · {program.title}</option>)}</select></label><div className="lift-lab-form-row"><label>Workout date<input name="scheduledFor" type="date" /></label><label>Training day<input name="dayLabel" placeholder="Monday · Lower Body" /></label></div><label>Exercise<input name="exercise" required /></label><div className="lift-lab-form-row"><label>Sets<input name="sets" type="number" min="1" /></label><label>Reps<input name="reps" placeholder="8-10" /></label></div><div className="lift-lab-form-row"><label>Weight target<input name="weight" placeholder="Client appropriate" /></label><label>Rest seconds<input name="rest" type="number" min="0" /></label></div><label>Tempo<input name="tempo" placeholder="3-1-1 or controlled" /></label><label>Trainer instructions<textarea name="notes" /></label><button className="button">Add Exercise</button></form></section></div><section className="lift-lab-card"><h2>Client programs</h2><div className="lift-suite__programs">{programs.length ? programs.map(program => <article key={program.id}><div><strong>{program.title}</strong><span>{program.client?.full_name} · {program.status}{program.weekly_frequency ? ` · ${program.weekly_frequency}× weekly` : ""}</span>{program.goal ? <p>Goal: {program.goal}</p> : null}</div><button className="lift-preview__small" onClick={() => setProgramFrozen(program.client_id, program.status !== "frozen")}>{program.status === "frozen" ? "Unfreeze program" : "Freeze program"}</button><ul>{programItems.filter(item => item.program_id === program.id).map(item => <li key={item.id}>{item.day_label || item.scheduled_for || "Flexible"}: {item.exercise_name} · {item.target_sets || "-"} sets × {item.target_reps || "-"}{item.tempo ? ` · ${item.tempo} tempo` : ""}</li>)}</ul></article>) : <p>No programs assigned yet.</p>}</div></section></div> : null}

      {tab === "progress" && trainer ? <section className="lift-lab-card"><p className="eyebrow">Private client progress</p><h2>Progress overview</h2><p className="lift-lab-card__intro">Workout history and optional progress photos are visible only to Madie and the individual client. Every private photo opening is recorded.</p><div className="lift-suite__list">{clients.filter(client => client.approval_status === "approved").length ? clients.filter(client => client.approval_status === "approved").map(client => { const preference = photoPreferences.find(item => item.client_id === client.id); const photos = progressPhotos.filter(item => item.client_id === client.id); const workouts = workoutLogs.filter(item => item.client_id === client.id); return <article key={client.id}><div><strong>{client.full_name} · {client.account_number || "Account pending"}</strong><span>{workouts.length} workout{workouts.length === 1 ? "" : "s"} logged · photos {preference?.opted_in ? "opted in" : "off"} · {photos.length} private photo{photos.length === 1 ? "" : "s"}</span></div><span className={`lift-lab-status ${preference?.opted_in ? "lift-lab-status--approved" : ""}`}>{preference?.opted_in ? "photo opt-in" : "photos off"}</span>{photos.length ? <div className="lift-progress-photo-actions">{photos.slice(0, 3).map(photo => <button key={photo.id} onClick={() => viewPrivatePhoto(photo)}>{photo.photo_type.replaceAll("_", " ")} · {new Date(photo.taken_on).toLocaleDateString()}</button>)}</div> : null}</article>; }) : <p>No approved clients yet.</p>}</div></section> : null}

      {tab === "customer preview" && !trainer ? <CustomerExperiencePreview /> : null}
      {tab === "madie preview" && !trainer ? <TrainerExperiencePreview /> : null}

      {tab === "payments" && trainer ? <section className="lift-lab-card"><h2>Private payment records</h2><p className="lift-lab-card__intro">Payments go directly to Madie&apos;s Lift Lab. Southern Iron Fitness cannot view this section.</p><div className="lift-suite__list">{payments.length ? payments.map(payment => <article key={payment.id}><div><strong>{payment.client?.full_name || "Client"} · {money(payment.amount_cents)}</strong><span>{payment.payment_kind.replaceAll("_", " ")} · {payment.method} · {payment.venmo_username || "No Venmo name"} {payment.venmo_reference ? `· ${payment.venmo_reference}` : ""}</span></div><span className={`lift-lab-status lift-lab-status--${payment.status}`}>{payment.status.replaceAll("_", " ")}</span>{["submitted", "awaiting"].includes(payment.status) ? <div className="lift-lab-request-actions"><button onClick={() => reviewPayment(payment.id, payment.status === "awaiting" ? "paid_in_person" : "verified")}>{payment.status === "awaiting" ? "Paid In Person" : "Verify"}</button>{payment.status === "submitted" ? <button onClick={() => reviewPayment(payment.id, "rejected")}>Reject</button> : null}</div> : null}</article>) : <p>No payment records yet.</p>}</div></section> : null}

      {tab === "settings" && trainer ? <section className="lift-lab-card lift-suite__settings"><h2>Business settings</h2><form className="lift-lab-form" onSubmit={saveSettings}><label>Normal booking window in days<input name="window" type="number" min="1" max="365" defaultValue={settings?.booking_window_days ?? 14} required /><span>You can still open individual dates further ahead.</span></label><label>Default session buffer in minutes<input name="buffer" type="number" min="0" max="120" defaultValue={settings?.default_buffer_minutes ?? 15} required /></label><label>Venmo payment link<input name="venmo" type="url" defaultValue={settings?.venmo_url ?? "https://venmo.com/u/Madison-Rabalais-1"} required /></label><button className="button">Save Settings</button></form></section> : null}
    </section>
  );
}
