import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

const acknowledgmentVersion = "2026-09-05-v2";

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
        acceptance_request_id: request.headers.get("x-vercel-id") || crypto.randomUUID(),
      },
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
