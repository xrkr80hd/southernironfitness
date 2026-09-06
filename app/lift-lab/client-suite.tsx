"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type Tab = "home" | "book" | "schedule" | "program" | "progress" | "payments";
type Service = { id: string; trainer_id: string; name: string; description: string | null; duration_minutes: number; cancellation_policy: string | null; lift_lab_service_financials: { price_cents: number; deposit_cents: number | null } | null };
type Slot = { id: string; trainer_id: string; starts_at: string; ends_at: string };
type Appointment = { id: string; status: string; client_note: string | null; service: { name: string } | null; availability: { starts_at: string; ends_at: string } | null };
type Payment = { id: string; appointment_id: string; amount_cents: number; payment_kind: string; status: string; method: string; venmo_username: string | null; venmo_reference: string | null; appointment: { service: { name: string } | null; availability: { starts_at: string } | null } | null };
type Program = { id: string; title: string; description: string | null; goal: string | null; weekly_frequency: number | null; starts_on: string | null; ends_on: string | null; status: string };
type ProgramItem = { id: string; program_id: string; scheduled_for: string | null; day_label: string | null; exercise_name: string; target_sets: number | null; target_reps: string | null; target_weight: string | null; rest_seconds: number | null; tempo: string | null; trainer_notes: string | null };
type WorkoutLog = { id: string; program_item_id: string; completed_at: string; actual_weight: string | null };
type Notice = { id: string; title: string; message: string; read_at: string | null; created_at: string };
type PhotoPreference = { opted_in: boolean; consented_at: string | null; withdrawn_at: string | null };
type ProgressPhoto = { id: string; trainer_id: string; photo_type: "date_started" | "check_in" | "six_month"; storage_path: string; taken_on: string; caption: string | null };

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateTime = (value: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

async function compressImage(file: File) {
  if (file.size <= 900_000 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1500 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.78));
  if (!blob || blob.size > 1_048_576) throw new Error("That image is still too large. Please use a smaller screenshot.");
  return new File([blob], "venmo-proof.jpg", { type: "image/jpeg" });
}

export default function LiftLabClientSuite({ userId, firstName }: { userId: string; firstName: string }) {
  const [tab, setTab] = useState<Tab>("home");
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [photoPreference, setPhotoPreference] = useState<PhotoPreference | null>(null);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loadedAt, setLoadedAt] = useState(0);
  const [venmoUrl, setVenmoUrl] = useState("https://venmo.com/u/Madison-Rabalais-1");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [serviceResult, slotResult, appointmentResult, paymentResult, programResult, itemResult, logResult, noticeResult, settingsResult, preferenceResult, photoResult] = await Promise.all([
      supabase.from("lift_lab_services").select("id, trainer_id, name, description, duration_minutes, cancellation_policy, lift_lab_service_financials(price_cents, deposit_cents)").eq("is_active", true).order("name"),
      supabase.from("lift_lab_availability").select("id, trainer_id, starts_at, ends_at").eq("status", "open").gte("starts_at", new Date().toISOString()).order("starts_at"),
      supabase.from("lift_lab_appointments").select("id, status, client_note, service:lift_lab_services!lift_lab_appointments_service_id_fkey(name), availability:lift_lab_availability!lift_lab_appointments_availability_id_fkey(starts_at, ends_at)").order("created_at", { ascending: false }),
      supabase.from("lift_lab_payments").select("id, appointment_id, amount_cents, payment_kind, status, method, venmo_username, venmo_reference, appointment:lift_lab_appointments!lift_lab_payments_appointment_id_fkey(service:lift_lab_services!lift_lab_appointments_service_id_fkey(name), availability:lift_lab_availability!lift_lab_appointments_availability_id_fkey(starts_at))").order("created_at", { ascending: false }),
      supabase.from("lift_lab_programs").select("id, title, description, goal, weekly_frequency, starts_on, ends_on, status").order("created_at", { ascending: false }),
      supabase.from("lift_lab_program_items").select("id, program_id, scheduled_for, day_label, exercise_name, target_sets, target_reps, target_weight, rest_seconds, tempo, trainer_notes").order("scheduled_for"),
      supabase.from("lift_lab_workout_logs").select("id, program_item_id, completed_at, actual_weight"),
      supabase.from("lift_lab_notifications").select("id, title, message, read_at, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("lift_lab_settings").select("venmo_url").maybeSingle(),
      supabase.from("lift_lab_photo_preferences").select("opted_in, consented_at, withdrawn_at").maybeSingle(),
      supabase.from("lift_lab_progress_photos").select("id, trainer_id, photo_type, storage_path, taken_on, caption").order("taken_on"),
    ]);
    const error = [serviceResult, slotResult, appointmentResult, paymentResult, programResult, itemResult, logResult, noticeResult, settingsResult, preferenceResult, photoResult].find(result => result.error)?.error;
    if (error) setMessage(error.message);
    setServices((serviceResult.data ?? []) as unknown as Service[]);
    setSlots((slotResult.data ?? []) as Slot[]);
    setAppointments((appointmentResult.data ?? []) as unknown as Appointment[]);
    setPayments((paymentResult.data ?? []) as unknown as Payment[]);
    setPrograms((programResult.data ?? []) as Program[]);
    setItems((itemResult.data ?? []) as ProgramItem[]);
    setLogs((logResult.data ?? []) as WorkoutLog[]);
    setNotices((noticeResult.data ?? []) as Notice[]);
    setPhotoPreference((preferenceResult.data as PhotoPreference | null) ?? null);
    setPhotos((photoResult.data ?? []) as ProgressPhoto[]);
    if (settingsResult.data?.venmo_url) setVenmoUrl(settingsResult.data.venmo_url);
    setLoadedAt(new Date().getTime());
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const reminders = useMemo(() => {
    const upcoming = appointments.filter(a => a.status === "confirmed" && a.availability && new Date(a.availability.starts_at).getTime() > loadedAt).sort((a, b) => new Date(a.availability!.starts_at).getTime() - new Date(b.availability!.starts_at).getTime())[0];
    const today = new Date().toISOString().slice(0, 10);
    return [
      appointments.some(a => a.status === "pending") ? "Madie is reviewing your appointment request." : null,
      upcoming ? `Next session: ${dateTime(upcoming.availability!.starts_at)}.` : null,
      payments.some(p => p.status === "awaiting") ? "A payment or deposit is ready when you are." : null,
      items.some(item => item.scheduled_for === today && !logs.some(log => log.program_item_id === item.id)) ? "You have a workout scheduled for today." : null,
      notices.find(notice => !notice.read_at)?.message ?? null,
    ].filter(Boolean) as string[];
  }, [appointments, items, loadedAt, logs, notices, payments]);

  async function requestAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const service = services.find(item => item.id === String(form.get("serviceId")));
    const slot = slots.find(item => item.id === String(form.get("slotId")));
    if (!service || !slot || service.trainer_id !== slot.trainer_id) { setBusy(false); setMessage("Choose a service and an available time."); return; }
    const { error } = await createClient().from("lift_lab_appointments").insert({ client_id: userId, trainer_id: service.trainer_id, service_id: service.id, availability_id: slot.id, client_note: String(form.get("note") || "") || null });
    setMessage(error ? error.message : "Your request was sent to Madie for approval.");
    if (!error) { event.currentTarget.reset(); setTab("schedule"); await load(); }
    setBusy(false);
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>, paymentId: string) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const screenshot = form.get("screenshot");
      let uploadedPath: string | null = null;
      if (screenshot instanceof File && screenshot.size) {
        const file = await compressImage(screenshot);
        uploadedPath = `${userId}/${paymentId}-${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
        const { error } = await createClient().storage.from("lift-lab-payment-proofs").upload(uploadedPath, file, { contentType: file.type, upsert: false });
        if (error) throw error;
      }
      const { error } = await createClient().rpc("submit_lift_lab_venmo_proof", { target_payment_id: paymentId, venmo_name: String(form.get("venmoName") || "") || null, confirmation: String(form.get("confirmation") || "") || null, uploaded_path: uploadedPath });
      if (error) throw error;
      setMessage("Payment information sent privately to Madie for verification.");
      event.currentTarget.reset();
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Payment information could not be submitted."); }
    setBusy(false);
  }

  async function completeWorkout(event: FormEvent<HTMLFormElement>, item: ProgramItem) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { error } = await createClient().from("lift_lab_workout_logs").insert({ program_item_id: item.id, client_id: userId, actual_sets: Number(form.get("sets")) || null, actual_reps: String(form.get("reps") || "") || null, actual_weight: String(form.get("weight") || "") || null, client_notes: String(form.get("notes") || "") || null });
    setMessage(error ? error.message : `${item.exercise_name} marked complete.`);
    if (!error) await load();
    setBusy(false);
  }

  async function setPhotoOptIn(optedIn: boolean) {
    setBusy(true);
    const { error } = await createClient().rpc("set_lift_lab_photo_opt_in", { allow_photos: optedIn });
    setMessage(error ? error.message : optedIn ? "Private progress photos are now available." : "Photo tracking is off. Your training account is unchanged.");
    if (!error) await load();
    setBusy(false);
  }

  async function uploadProgressPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const source = form.get("photo");
      if (!(source instanceof File) || !source.size) throw new Error("Choose a photo first.");
      const file = await compressImage(source);
      const kind = String(form.get("photoType")) as ProgressPhoto["photo_type"];
      const path = `${userId}/${kind}-${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
      const supabase = createClient();
      const uploaded = await supabase.storage.from("lift-lab-progress-photos").upload(path, file, { contentType: file.type });
      if (uploaded.error) throw uploaded.error;
      const activeProgram = programs.find(program => program.status === "active") || programs[0];
      const trainerId = services[0]?.trainer_id;
      if (!trainerId) throw new Error("Madie’s account is not connected yet.");
      const inserted = await supabase.from("lift_lab_progress_photos").insert({ client_id: userId, trainer_id: trainerId, photo_type: kind, storage_path: path, taken_on: String(form.get("takenOn")), caption: String(form.get("caption") || "") || null });
      if (inserted.error) throw inserted.error;
      setMessage(`Your ${kind.replaceAll("_", " ")} photo was stored privately${activeProgram ? ` with ${activeProgram.title}` : ""}.`);
      event.currentTarget.reset(); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The photo could not be saved."); }
    setBusy(false);
  }

  const tabs: Tab[] = ["home", "book", "schedule", "program", "progress", "payments"];
  return <div className="lift-client-suite">
    <nav className="lift-suite__tabs" aria-label="Lift Lab account sections">{tabs.map(item => <button key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {message && <p className="lift-lab-message" role="status">{message}</p>}

    {tab === "home" && <div className="lift-suite__stack"><section className="lift-lab-card"><p className="eyebrow">Your private training space</p><h2>Welcome, {firstName}.</h2><p className="lift-lab-card__intro">Request a session, handle a deposit, and follow your program—all in one place.</p></section><section className="lift-lab-card"><h2>What’s next</h2><div className="lift-client-reminders">{reminders.length ? reminders.map((reminder, index) => <p key={`${reminder}-${index}`}>{reminder}</p>) : <p>You’re all caught up. Madie’s open schedule is ready when you are.</p>}</div><button className="button" onClick={() => setTab("book")}>Find a Time</button></section></div>}

    {tab === "book" && <section className="lift-lab-card"><p className="eyebrow">Private sessions</p><h2>Request an appointment</h2><p className="lift-lab-card__intro">Choose what you need and a time Madie has opened. Madie personally approves every request.</p>{services.length && slots.length ? <form className="lift-lab-form" onSubmit={requestAppointment}><label>Service<select name="serviceId" required defaultValue=""><option value="" disabled>Choose a service</option>{services.map(service => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min · {money(service.lift_lab_service_financials?.price_cents ?? 0)}{service.lift_lab_service_financials?.deposit_cents != null ? ` · ${money(service.lift_lab_service_financials.deposit_cents)} deposit` : ""}</option>)}</select></label><label>Available time<select name="slotId" required defaultValue=""><option value="" disabled>Choose a time</option>{slots.map(slot => <option key={slot.id} value={slot.id}>{dateTime(slot.starts_at)}</option>)}</select></label><label>Anything Madie should know? <span>(optional)</span><textarea name="note" /></label><button className="button" disabled={busy}>{busy ? "Sending…" : "Request This Time"}</button></form> : <div className="lift-lab-empty"><strong>New openings are coming.</strong><p>Madie hasn’t published an available private session yet.</p></div>}</section>}

    {tab === "schedule" && <section className="lift-lab-card"><h2>Your schedule</h2><div className="lift-suite__list">{appointments.length ? appointments.map(item => <article key={item.id}><div><strong>{item.service?.name || "Private session"}</strong><span>{item.availability ? dateTime(item.availability.starts_at) : "Time unavailable"}</span></div><span className={`lift-lab-status lift-lab-status--${item.status}`}>{item.status}</span></article>) : <p>You haven’t requested a session yet.</p>}</div></section>}

    {tab === "program" && <div className="lift-suite__stack">{programs.length ? programs.map(program => <section className="lift-lab-card" key={program.id}><p className="eyebrow">{program.status} program{program.weekly_frequency ? ` · ${program.weekly_frequency} days weekly` : ""}</p><h2>{program.title}</h2>{program.goal && <p><strong>Goal:</strong> {program.goal}</p>}{program.description && <p>{program.description}</p>}{program.status === "frozen" ? <p className="lift-lab-message">This program is frozen. Your history is safe, but new workout logging is paused.</p> : null}<div className="lift-client-workouts">{items.filter(item => item.program_id === program.id).map(item => { const log = logs.find(entry => entry.program_item_id === item.id); return <article key={item.id}><div><strong>{item.day_label ? `${item.day_label} · ` : ""}{item.exercise_name}</strong><span>{item.scheduled_for || "Flexible date"} · {item.target_sets || "—"} sets × {item.target_reps || "—"}{item.target_weight ? ` · ${item.target_weight}` : ""}{item.rest_seconds != null ? ` · ${item.rest_seconds}s rest` : ""}{item.tempo ? ` · ${item.tempo} tempo` : ""}</span>{item.trainer_notes && <p>{item.trainer_notes}</p>}</div>{log ? <span className="lift-lab-status lift-lab-status--completed">Completed</span> : program.status !== "frozen" ? <form className="lift-client-workout-form" onSubmit={event => completeWorkout(event, item)}><input name="sets" type="number" min="0" placeholder="Sets" aria-label="Completed sets" /><input name="reps" placeholder="Reps" aria-label="Completed reps" /><input name="weight" placeholder="Weight" aria-label="Completed weight" /><input name="notes" placeholder="Notes" aria-label="Workout notes" /><button disabled={busy}>Complete</button></form> : null}</article>; })}</div></section>) : <section className="lift-lab-card lift-lab-empty"><strong>Your program will appear here.</strong><p>Once Madie assigns a workout program, you can track it from this tab.</p></section>}</div>}

    {tab === "progress" && <div className="lift-suite__stack"><div className="lift-suite__metrics"><article><strong>{logs.length}</strong><span>Workouts completed</span></article><article><strong>{appointments.filter(item => ["confirmed", "completed"].includes(item.status)).length}</strong><span>Sessions attended/booked</span></article><article><strong>{programs.find(item => item.status === "active")?.title || "Not assigned"}</strong><span>Current program</span></article></div><section className="lift-lab-card"><h2>Private progress photos</h2><p className="lift-lab-card__intro">Completely optional and off by default. If you opt in, only you and Madie can see these photos. They are never available to Southern Iron Fitness or the master administrator and cannot be used publicly without separate written permission.</p>{!photoPreference?.opted_in ? <div className="lift-photo-consent"><p>Opting in does not change your training agreement. You can turn this off later without affecting your account.</p><button className="button" disabled={busy} onClick={() => setPhotoOptIn(true)}>Opt In to Private Photos</button></div> : <><div className="lift-photo-consent lift-photo-consent--active"><strong>Private photo tracking is on.</strong><button className="lift-lab-text-button" disabled={busy} onClick={() => setPhotoOptIn(false)}>Turn off future photo tracking</button></div><form className="lift-lab-form" onSubmit={uploadProgressPhoto}><label>Progress point<select name="photoType" required defaultValue="check_in"><option value="date_started">Date Started</option><option value="check_in">Visit Check-In</option><option value="six_month">Six Months Progress</option></select></label><label>Date<input name="takenOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Private photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label><label>Private note <span>(optional)</span><input name="caption" /></label><button className="button" disabled={busy}>{busy ? "Saving…" : "Save Private Progress Photo"}</button></form><div className="lift-photo-slots">{["date_started", "check_in", "six_month"].map(kind => { const count = photos.filter(photo => photo.photo_type === kind).length; return <article key={kind}><span>{kind.replaceAll("_", " ")}</span><strong>{count ? `${count} saved` : "Not added"}</strong><small>{kind === "six_month" && programs[0]?.starts_on ? `Target ${new Date(new Date(programs[0].starts_on).setMonth(new Date(programs[0].starts_on).getMonth() + 6)).toLocaleDateString()}` : "Optional and private"}</small></article>; })}</div></>}</section></div>}

    {tab === "payments" && <section className="lift-lab-card"><p className="eyebrow">Paid directly to Madie’s Lift Lab</p><h2>Payments</h2><p className="lift-lab-card__intro">Southern Iron Fitness cannot see these amounts or payment details.</p><div className="lift-suite__stack">{payments.length ? payments.map(payment => <article className="lift-client-payment" key={payment.id}><div><strong>{payment.appointment?.service?.name || "Private session"} · {money(payment.amount_cents)}</strong><span>{payment.payment_kind.replaceAll("_", " ")} · {payment.appointment?.availability ? dateTime(payment.appointment.availability.starts_at) : ""}</span></div><span className={`lift-lab-status lift-lab-status--${payment.status}`}>{payment.status.replaceAll("_", " ")}</span>{["awaiting", "rejected"].includes(payment.status) && <><a className="button" href={venmoUrl} target="_blank" rel="noreferrer">Pay Madie with Venmo</a><form className="lift-lab-form lift-client-payment-form" onSubmit={event => submitPayment(event, payment.id)}><label>Venmo name <span>(optional)</span><input name="venmoName" /></label><label>Confirmation/reference <span>(or upload a screenshot)</span><input name="confirmation" /></label><label>Payment screenshot <span>(optional, private)</span><input name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" /></label><button disabled={busy}>Send Payment Details</button></form></>}</article>) : <p>No payment requests yet.</p>}</div></section>}
  </div>;
}
