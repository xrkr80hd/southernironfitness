"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type ClassItem = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  location: string;
};

type Registration = { id: string; class_id: string; status: string; payment_status: string };
type Profile = { full_name: string; phone: string | null; role: "member" | "admin"; approval_status: "pending" | "approved" | "denied" };

export default function LiftLabPortal() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPortal = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) return;
    const [{ data: profileData }, { data: classData }, { data: registrationData }] = await Promise.all([
      supabase.from("lift_lab_profiles").select("full_name, phone, role, approval_status").single(),
      supabase.from("lift_lab_classes").select("id, title, description, starts_at, duration_minutes, capacity, location").eq("is_published", true).gte("starts_at", new Date().toISOString()).order("starts_at"),
      supabase.from("lift_lab_registrations").select("id, class_id, status, payment_status"),
    ]);
    setProfile(profileData as Profile | null);
    setClasses((classData ?? []) as ClassItem[]);
    setRegistrations((registrationData ?? []) as Registration[]);
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const supabase = createClient();
      void loadPortal();
      const { data } = supabase.auth.onAuthStateChange(() => void loadPortal());
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      setMessage("Class signup is being connected. Please check back shortly.");
    }
    return unsubscribe;
  }, [loadPortal]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const fullName = String(form.get("fullName") ?? "").trim();
        const phone = String(form.get("phone") ?? "").trim();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/lift-lab/auth/callback`,
            data: { full_name: fullName, phone, disclaimer_accepted: true, disclaimer_version: "2026-09-05" },
          },
        });
        if (error) throw error;
        setMessage("You’re almost in! Check your email to confirm your Madie’s Lift Lab account.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reserve(classId: string) {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("lift_lab_registrations").insert({ class_id: classId, user_id: userId });
      if (error) throw error;
      setMessage("You’re registered! Madie can now see your reservation.");
      await loadPortal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn’t reserve that class.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    setClasses([]);
    setRegistrations([]);
  }

  if (!userId) {
    return (
      <section className="lift-lab-card" aria-labelledby="account-title">
        <p className="eyebrow">{mode === "signup" ? "Quick signup" : "Welcome back"}</p>
        <h2 id="account-title">{mode === "signup" ? "Join Madie’s Lift Lab" : "Log in"}</h2>
        <p className="lift-lab-card__intro">{mode === "signup" ? "Just the essentials. You’ll be ready to choose a class in a minute or two." : "Use the email connected to your Lift Lab account."}</p>
        <form className="lift-lab-form" onSubmit={handleAuth}>
          {mode === "signup" && <label>Full name<input name="fullName" autoComplete="name" required /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          {mode === "signup" && <label>Phone <span>(optional)</span><input name="phone" type="tel" autoComplete="tel" /></label>}
          <label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required /></label>
          {mode === "signup" && (
            <label className="lift-lab-disclaimer">
              <input name="disclaimer" type="checkbox" required />
              <span>
                I understand that Madison Rabalais, doing business as Madie&apos;s Lift Lab,
                is an independent trainer and is not an employee or agent of Southern Iron
                Fitness. Southern Iron Fitness does not direct or control her training
                services and is not responsible for her instruction, programs, results, or
                injuries arising from participation in her training. I understand that
                physical exercise carries inherent risks, and I voluntarily choose to
                participate. This acknowledgment does not waive rights that cannot legally
                be waived.
              </span>
            </label>
          )}
          <button className="button" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create My Account" : "Log In"}</button>
        </form>
        {message && <p className="lift-lab-message" role="status">{message}</p>}
        <div className="lift-lab-switches">
          <button onClick={() => setMode(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}</button>
          {mode === "login" && <p className="lift-lab-recovery-note">Need help accessing your account? Contact Madie while secure email recovery is being prepared.</p>}
        </div>
      </section>
    );
  }

  if (profile?.role !== "admin" && profile?.approval_status !== "approved") {
    const denied = profile?.approval_status === "denied";
    return (
      <section className="lift-lab-card lift-lab-pending">
        <p className="eyebrow">{denied ? "Account update" : "Request received"}</p>
        <h2>{denied ? "Please speak with Madie." : "Madie has your signup."}</h2>
        <p>{denied ? "Your account isn’t currently approved for class registration. Contact Madie if you believe this needs another look." : "Your account request is waiting for Madie’s approval. Once she approves it, your class schedule will appear here automatically."}</p>
        <button className="button" onClick={signOut}>Sign Out</button>
      </section>
    );
  }

  return (
    <section className="lift-lab-card lift-lab-dashboard">
      <div className="lift-lab-dashboard__head">
        <div><p className="eyebrow">Your Lift Lab</p><h2>Hey, {profile?.full_name?.split(" ")[0] || "there"}.</h2></div>
        <button className="lift-lab-text-button" onClick={signOut}>Sign out</button>
      </div>
      {message && <p className="lift-lab-message" role="status">{message}</p>}
      <div className="lift-lab-class-list">
        {classes.length ? classes.map((item) => {
          const registration = registrations.find((entry) => entry.class_id === item.id && entry.status !== "cancelled");
          return (
            <article key={item.id} className="lift-lab-class">
              <time dateTime={item.starts_at}>{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(item.starts_at))}</time>
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
              <small>{item.duration_minutes} minutes · {item.location}</small>
              <button className="button" disabled={busy || Boolean(registration)} onClick={() => reserve(item.id)}>{registration ? "You’re Registered" : "Reserve My Spot"}</button>
            </article>
          );
        }) : <div className="lift-lab-empty"><strong>New classes are on the way.</strong><p>Once Madie publishes her schedule, you’ll see every available class right here.</p></div>}
      </div>
      {profile?.role === "admin" && <a className="button button--outline" href="/lift-lab/admin">Open Madie’s Dashboard</a>}
    </section>
  );
}
