"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type LegalRecord = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  acknowledgment_version: string;
  acknowledgment_text: string;
  acknowledgment_sha256: string;
  accepted_at: string;
  evidence: Record<string, unknown>;
};

type ServiceRecord = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  lift_lab_profiles: { full_name: string } | null;
  lift_lab_classes: { title: string; starts_at: string } | null;
};

function downloadJson(records: LegalRecord[]) {
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), records }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `southern-iron-lift-lab-legal-archive-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SouthernIronAdmin() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [legalRecords, setLegalRecords] = useState<LegalRecord[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: profile } = await supabase.from("lift_lab_profiles").select("role").single();
      if (profile?.role !== "master_admin") { setAuthorized(false); return; }
      setAuthorized(true);
      const [{ data: acknowledgments }, { data: registrations }] = await Promise.all([
        supabase.from("lift_lab_legal_acknowledgments").select("id, user_id, email, full_name, acknowledgment_version, acknowledgment_text, acknowledgment_sha256, accepted_at, evidence").neq("email", "lift-lab-legal-test@example.com").order("accepted_at", { ascending: false }),
        supabase.from("lift_lab_registrations").select("id, status, payment_status, created_at, lift_lab_profiles(full_name), lift_lab_classes(title, starts_at)").order("created_at", { ascending: false }),
      ]);
      setLegalRecords((acknowledgments ?? []) as LegalRecord[]);
      setServiceRecords((registrations ?? []) as unknown as ServiceRecord[]);
    } catch { setAuthorized(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (authorized === null) return <section className="lift-lab-admin"><p>Opening the secure archive…</p></section>;
  if (!authorized) return <section className="lift-lab-admin"><h1>Master administration</h1><p>This private archive is available only to the Southern Iron Fitness master administrator.</p><a className="button" href="/lift-lab">Go to secure login</a></section>;

  return (
    <section className="lift-lab-admin master-admin">
      <div className="lift-lab-admin__title">
        <div><p className="eyebrow">Southern Iron Fitness</p><h1>Legal archive</h1></div>
        <p>Read-only evidence copies of Lift Lab acknowledgments and service registrations.</p>
      </div>
      <div className="master-admin__summary">
        <article><strong>{legalRecords.length}</strong><span>Signed acknowledgments</span></article>
        <article><strong>{serviceRecords.length}</strong><span>Class registrations</span></article>
        <button className="button" onClick={() => downloadJson(legalRecords)} disabled={!legalRecords.length}>Download Evidence Archive</button>
      </div>
      <section className="lift-lab-card master-admin__records">
        <h2>Signed acknowledgments</h2>
        <p>These records are immutable. Each entry preserves the exact wording accepted, account identity, timestamp, evidence details, and document checksum.</p>
        <div>
          {legalRecords.length ? legalRecords.map(record => (
            <details key={record.id}>
              <summary><span><strong>{record.full_name}</strong><small>{record.email}</small></span><time>{new Date(record.accepted_at).toLocaleString()}</time></summary>
              <div className="master-admin__record-body">
                <p>{record.acknowledgment_text}</p>
                <dl><div><dt>Version</dt><dd>{record.acknowledgment_version}</dd></div><div><dt>SHA-256</dt><dd>{record.acknowledgment_sha256}</dd></div><div><dt>User ID</dt><dd>{record.user_id || "Account removed; evidence retained"}</dd></div></dl>
              </div>
            </details>
          )) : <p>No acknowledgments have been recorded yet.</p>}
        </div>
      </section>
      <section className="lift-lab-card master-admin__records">
        <h2>Users of training services</h2>
        <div>{serviceRecords.length ? serviceRecords.map(record => <article className="master-admin__service" key={record.id}><div><strong>{record.lift_lab_profiles?.full_name || "Former account"}</strong><span>{record.lift_lab_classes?.title || "Class"}</span></div><time>{record.lift_lab_classes?.starts_at ? new Date(record.lift_lab_classes.starts_at).toLocaleString() : new Date(record.created_at).toLocaleString()}</time><span>{record.status} · {record.payment_status.replaceAll("_", " ")}</span></article>) : <p>No class registrations have been recorded yet.</p>}</div>
      </section>
    </section>
  );
}
