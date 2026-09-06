"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      setMessage("Your password is updated. You can return to your Lift Lab account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please request a new recovery link.");
    } finally { setBusy(false); }
  }
  return (
    <main className="lift-lab-recovery">
      <section className="lift-lab-card">
        <Image src="/brand/madies-lift-lab-dark.jpg" alt="Madie's Lift Lab" width={1536} height={1536} />
        <p className="eyebrow">Secure account recovery</p>
        <h1>Choose a new password.</h1>
        <form className="lift-lab-form" onSubmit={updatePassword}>
          <label>New password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
          <button className="button" disabled={busy}>{busy ? "Updating…" : "Update Password"}</button>
        </form>
        {message && <p className="lift-lab-message" role="status">{message}</p>}
        <Link href="/lift-lab">Return to Madie&apos;s Lift Lab</Link>
      </section>
    </main>
  );
}
