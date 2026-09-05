"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type AdminClass = { id: string; title: string; starts_at: string; duration_minutes: number; capacity: number; location: string; is_published: boolean };
type Signup = { id: string; status: string; payment_status: string; created_at: string; lift_lab_profiles: { full_name: string; phone: string | null } | null; lift_lab_classes: { title: string; starts_at: string } | null };
type AccountRequest = { id: string; full_name: string; phone: string | null; approval_status: "pending" | "approved" | "denied"; disclaimer_accepted_at: string | null; created_at: string };
type AdminNotification = { id: string; title: string; message: string; read_at: string | null; created_at: string; profile_id: string | null };

export default function LiftLabAdmin() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: profile } = await supabase.from("lift_lab_profiles").select("role").single();
      if (profile?.role !== "admin") { setAuthorized(false); return; }
      setAuthorized(true);
      const [{ data: classData }, { data: signupData }, { data: requestData }, { data: notificationData }] = await Promise.all([
        supabase.from("lift_lab_classes").select("id, title, starts_at, duration_minutes, capacity, location, is_published").order("starts_at"),
        supabase.from("lift_lab_registrations").select("id, status, payment_status, created_at, lift_lab_profiles(full_name, phone), lift_lab_classes(title, starts_at)").order("created_at", { ascending: false }),
        supabase.from("lift_lab_profiles").select("id, full_name, phone, approval_status, disclaimer_accepted_at, created_at").eq("role", "member").order("created_at", { ascending: false }),
        supabase.from("lift_lab_admin_notifications").select("id, title, message, read_at, created_at, profile_id").order("created_at", { ascending: false }).limit(30),
      ]);
      setClasses((classData ?? []) as AdminClass[]);
      setSignups((signupData ?? []) as unknown as Signup[]);
      setRequests((requestData ?? []) as AccountRequest[]);
      setNotifications((notificationData ?? []) as AdminNotification[]);
    } catch { setAuthorized(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await createClient().from("lift_lab_classes").insert({
      title: String(form.get("title")), starts_at: new Date(String(form.get("startsAt"))).toISOString(),
      duration_minutes: Number(form.get("duration")), capacity: Number(form.get("capacity")),
      location: String(form.get("location")), is_published: form.get("published") === "on",
    });
    setMessage(error ? error.message : "Class added to the schedule.");
    if (!error) { event.currentTarget.reset(); await load(); }
  }

  async function updateRegistration(id: string, field: "status" | "payment_status", value: string) {
    const { error } = await createClient().from("lift_lab_registrations").update({ [field]: value }).eq("id", id);
    setMessage(error ? error.message : "Updated.");
    if (!error) await load();
  }

  async function reviewAccount(id: string, approvalStatus: "approved" | "denied") {
    const supabase = createClient();
    const { error } = await supabase.from("lift_lab_profiles").update({ approval_status: approvalStatus }).eq("id", id);
    if (!error) await supabase.from("lift_lab_admin_notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", id).is("read_at", null);
    setMessage(error ? error.message : approvalStatus === "approved" ? "Account approved. They can now reserve classes." : "Account request declined.");
    if (!error) await load();
  }

  if (authorized === null) return <section className="lift-lab-admin"><p>Opening Madie&apos;s dashboard…</p></section>;
  if (!authorized) return <section className="lift-lab-admin"><h1>Private dashboard</h1><p>Please log in with Madie&apos;s administrator account to continue.</p><a className="button" href="/lift-lab">Return to login</a></section>;

  return (
    <section className="lift-lab-admin">
      <div className="lift-lab-admin__title"><div><p className="eyebrow">Class management</p><h1>Madie&apos;s Dashboard</h1></div><p>Create classes, see who signed up, and record attendance or payment status.</p></div>
      {message && <p className="lift-lab-message" role="status">{message}</p>}
      <section className="lift-lab-card lift-lab-notifications">
        <div className="lift-lab-notifications__title">
          <div><p className="eyebrow">Application notifications</p><h2>New account requests</h2></div>
          <strong>{notifications.filter(item => !item.read_at).length} new</strong>
        </div>
        <div className="lift-lab-request-list">
          {requests.length ? requests.map(request => (
            <article key={request.id} className={request.approval_status === "pending" ? "is-pending" : ""}>
              <div><strong>{request.full_name}</strong><span>{request.phone || "No phone provided"} · Requested {new Date(request.created_at).toLocaleDateString()}</span><small>{request.disclaimer_accepted_at ? "Independent-trainer acknowledgment accepted" : "Acknowledgment not recorded"}</small></div>
              <span className={`lift-lab-status lift-lab-status--${request.approval_status}`}>{request.approval_status}</span>
              {request.approval_status === "pending" && <div className="lift-lab-request-actions"><button onClick={() => reviewAccount(request.id, "approved")}>Approve</button><button onClick={() => reviewAccount(request.id, "denied")}>Decline</button></div>}
            </article>
          )) : <p>No account requests yet.</p>}
        </div>
      </section>
      <div className="lift-lab-admin-grid">
        <section className="lift-lab-card">
          <h2>Add a class</h2>
          <form className="lift-lab-form" onSubmit={createClass}>
            <label>Class name<input name="title" required /></label>
            <label>Date and time<input name="startsAt" type="datetime-local" required /></label>
            <div className="lift-lab-form-row"><label>Minutes<input name="duration" type="number" min="15" defaultValue="60" required /></label><label>Capacity<input name="capacity" type="number" min="1" defaultValue="10" required /></label></div>
            <label>Location<input name="location" defaultValue="Southern Iron Fitness" required /></label>
            <label className="lift-lab-check"><input name="published" type="checkbox" defaultChecked /> Show this class to members</label>
            <button className="button">Add Class</button>
          </form>
        </section>
        <section className="lift-lab-card"><h2>Schedule</h2><div className="lift-lab-admin-list">{classes.length ? classes.map(item => <article key={item.id}><strong>{item.title}</strong><time>{new Date(item.starts_at).toLocaleString()}</time><small>{item.duration_minutes} min · {item.capacity} spots · {item.is_published ? "Published" : "Hidden"}</small></article>) : <p>No classes scheduled yet.</p>}</div></section>
      </div>
      <section className="lift-lab-card lift-lab-roster">
        <h2>Recent signups</h2>
        <div className="lift-lab-roster-list">{signups.length ? signups.map(item => <article key={item.id}><div><strong>{item.lift_lab_profiles?.full_name ?? "Member"}</strong><span>{item.lift_lab_classes?.title ?? "Class"} · {item.lift_lab_classes?.starts_at ? new Date(item.lift_lab_classes.starts_at).toLocaleString() : ""}</span></div><select aria-label="Attendance status" value={item.status} onChange={e => updateRegistration(item.id, "status", e.target.value)}><option value="registered">Registered</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select><select aria-label="Payment status" value={item.payment_status} onChange={e => updateRegistration(item.id, "payment_status", e.target.value)}><option value="unpaid">Unpaid</option><option value="paid_in_person">Paid in person</option><option value="paid_by_phone">Paid by phone</option><option value="paid_online">Paid online</option></select></article>) : <p>No class signups yet.</p>}</div>
      </section>
    </section>
  );
}
