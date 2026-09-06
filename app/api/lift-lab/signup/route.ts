import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

const acknowledgmentVersion = "2026-09-06-v4";
const consentCookieName = "lift_lab_consent_receipt";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
    legalAcknowledgmentAccepted?: boolean;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const fullName = body?.fullName?.trim();
  if (!email || !fullName || !body?.password || body.password.length < 8) {
    return NextResponse.json({ error: "Please complete the required account fields." }, { status: 400 });
  }
  if (body.legalAcknowledgmentAccepted !== true) {
    return NextResponse.json({ error: "Your legal acknowledgment is required to create an account." }, { status: 400 });
  }

  const receiptId = randomUUID();
  const acceptedAt = new Date().toISOString();
  const requestId = request.headers.get("x-vercel-id") || randomUUID();
  // An unguessable receipt token is written to both the secure cookie and the
  // immutable database evidence record. Signup does not depend on an external
  // SMTP service or an extra Vercel secret.
  const receiptSignature = randomBytes(32).toString("base64url");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: body.password,
    options: {
      data: {
        full_name: fullName,
        phone: body.phone?.trim() || "",
        disclaimer_accepted: true,
        disclaimer_version: acknowledgmentVersion,
        acceptance_source: "southernironfitness.com/lift-lab",
        acceptance_user_agent: request.headers.get("user-agent") || "unavailable",
        acceptance_request_id: requestId,
        consent_receipt_id: receiptId,
        consent_receipt_issued_at: acceptedAt,
        consent_receipt_signature: receiptSignature,
        consent_receipt_algorithm: "CSPRNG-256 receipt token",
      },
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const response = NextResponse.json({ success: true });
  const encodedTimestamp = Buffer.from(acceptedAt).toString("base64url");
  response.cookies.set(consentCookieName, `${receiptId}.${encodedTimestamp}.${receiptSignature}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/lift-lab",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
