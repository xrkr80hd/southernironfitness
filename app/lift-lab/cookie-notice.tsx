"use client";

import { useEffect, useState } from "react";

const noticeCookie = "lift_lab_cookie_notice";

export default function LiftLabCookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setVisible(!document.cookie.split("; ").some(item => item.startsWith(`${noticeCookie}=`))));
  }, []);

  function acknowledge() {
    document.cookie = `${noticeCookie}=acknowledged; Max-Age=31536000; Path=/lift-lab; Secure; SameSite=Lax`;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="lift-lab-cookie-notice" aria-label="Essential cookie notice">
      <div>
        <strong>Just the essentials.</strong>
        <p>Madie&apos;s Lift Lab uses only essential cookies for secure sign-in and your acknowledgment receipt. No advertising or tracking cookies.</p>
      </div>
      <button type="button" onClick={acknowledge}>Got It</button>
    </aside>
  );
}
