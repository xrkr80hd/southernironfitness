"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import LiftLabClientSuite from "./client-suite";

type Profile = { full_name: string; phone: string | null; role: "member" | "admin" | "master_admin"; approval_status: "pending" | "approved" | "denied" };

export default function LiftLabPortal() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPortal = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data: profileData, error } = await supabase.from("lift_lab_profiles").select("full_name, phone, role, approval_status").eq("id", user.id).single();
    if (error) setMessage(error.message);
    setProfile(profileData as Profile | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const supabase = createClient();
      queueMicrotask(() => void loadPortal());
      const { data } = supabase.auth.onAuthStateChange(() => void loadPortal());
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      queueMicrotask(() => setMessage("Lift Lab sign-in is being connected. Please check back shortly."));
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
        const response = await fetch("/api/lift-lab/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName, phone, legalAcknowledgmentAccepted: true }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "We couldn’t create your account.");
        setMessage("Your signed account request was sent directly to Madie for approval.");
        await loadPortal();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
  }

  if (loading) return <section className="lift-lab-card"><p>Opening your secure Lift Lab account…</p></section>;

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
                <strong>Legal acknowledgment and electronic signature.</strong> By checking
                this box and creating my account, I affirm that I have read, understand,
                and agree to this acknowledgment. I understand that Madison Rabalais, doing
                business as Madie&apos;s Lift Lab, is an independent trainer and independent
                business—not an employee, agent, partner, or representative of Southern
                Iron Fitness. Madie&apos;s Lift Lab is an independently owned and operated
                personal-training service. Its coaching, scheduling, programs, and fees are
                separate from Southern Iron Fitness and are not included with a Southern
                Iron Fitness membership. Southern Iron Fitness does not select, direct, supervise, or
                control her training methods, programming, scheduling, charges, promises,
                or results. Any agreement for her training services is between me and
                Madie&apos;s Lift Lab. I understand that exercise and strength training involve
                inherent risks, including the risk of physical injury, and I voluntarily
                choose to participate. Optional progress photos are disabled unless I
                separately opt in. If I opt in, the photos are for private progress tracking
                by me and Madie&apos;s Lift Lab only. Madie&apos;s Lift Lab and Southern Iron Fitness
                will not use them for advertising, social media, public display, or promotion
                without separate written authorization, and Southern Iron Fitness master
                administrators cannot view them. I may withdraw from photo tracking without
                affecting my training account. This acknowledgment documents my informed decision
                and the independent relationship described above. It does not release any
                person or business from liability that Louisiana law does not permit to be
                waived.
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

  if (profile?.role === "member" && profile?.approval_status !== "approved") {
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

  if (profile?.role === "master_admin") {
    return (
      <section className="lift-lab-card lift-lab-dashboard lift-master-home">
        <div className="lift-lab-dashboard__head"><div><p className="eyebrow">Master administrator</p><h2>Southern Iron oversight</h2></div><button className="lift-lab-text-button" onClick={signOut}>Sign out</button></div>
        <p className="lift-lab-card__intro">Your account has scheduling, user-support, and legal archive access. Madie’s prices, revenue, payments, and private programs remain hidden.</p>
        <div className="lift-master-actions"><a className="button" href="/lift-lab/admin">Open Scheduler &amp; Users</a><a className="button button--outline" href="/admin">Open Legal Evidence Archive</a></div>
      </section>
    );
  }

  if (profile?.role === "admin") {
    return (
      <section className="lift-lab-card lift-lab-dashboard lift-master-home">
        <div className="lift-lab-dashboard__head"><div><p className="eyebrow">Independent trainer</p><h2>Welcome, Madie.</h2></div><button className="lift-lab-text-button" onClick={signOut}>Sign out</button></div>
        <p className="lift-lab-card__intro">Manage your availability, appointment approvals, services, private pricing, payments, and client programs.</p>
        <a className="button" href="/lift-lab/admin">Open Madie’s Dashboard</a>
      </section>
    );
  }

  return (
    <section className="lift-lab-card lift-lab-dashboard">
      <div className="lift-lab-dashboard__head">
        <div><p className="eyebrow">Your Lift Lab</p><h2>Hey, {profile?.full_name?.split(" ")[0] || "there"}.</h2></div>
        <button className="lift-lab-text-button" onClick={signOut}>Sign out</button>
      </div>
      <LiftLabClientSuite userId={userId} firstName={profile?.full_name?.split(" ")[0] || "there"} />
    </section>
  );
}
