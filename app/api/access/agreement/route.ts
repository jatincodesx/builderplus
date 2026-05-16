/**
 * Lightweight demo access gate — agreement logging.
 *
 * Persists to Cloudflare D1 when DB binding is available.
 * Falls back to console logging when DB is missing.
 * Do not block access if logging fails.
 *
 * This is NOT enterprise-grade audit logging.
 * For production, consider signed tokens, database-backed audit, and rate limiting.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { logAccessAgreement } from "@/lib/accessGate/logAgreement";
import { getD1Binding } from "@/lib/accessGate/getRuntimeEnv";
import type {
  AccessGateAgreementPayload,
  AccessGateAgreementResponse,
} from "@/types/accessGate";
import type { CloudflareEnv } from "@/lib/accessGate/cloudflareEnv";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AccessGateAgreementPayload;

    if (!body.accepted) {
      return NextResponse.json<AccessGateAgreementResponse>(
        { ok: false, logged: false, error: "Terms must be accepted." },
        { status: 400 }
      );
    }

    if (!body.termsVersion) {
      return NextResponse.json<AccessGateAgreementResponse>(
        { ok: false, logged: false, error: "Terms version is required." },
        { status: 400 }
      );
    }

    if (!body.clientName) {
      return NextResponse.json<AccessGateAgreementResponse>(
        { ok: false, logged: false, error: "Client name is required." },
        { status: 400 }
      );
    }

    if (!body.passwordLabel) {
      return NextResponse.json<AccessGateAgreementResponse>(
        { ok: false, logged: false, error: "Password label is required." },
        { status: 400 }
      );
    }

    const dbBinding = await getD1Binding();
    const env: CloudflareEnv = dbBinding
      ? { DB: dbBinding as CloudflareEnv["DB"] }
      : {};

    const result = await logAccessAgreement({
      payload: {
        name: body.name,
        company: body.company,
        email: body.email,
        accepted: body.accepted,
        termsVersion: body.termsVersion,
        clientName: body.clientName,
        passwordLabel: body.passwordLabel,
      },
      request,
      env,
    });

    return NextResponse.json<AccessGateAgreementResponse>({
      ok: true,
      logged: result.logged,
      storage: result.storage,
    });
  } catch {
    return NextResponse.json<AccessGateAgreementResponse>(
      { ok: false, logged: false, error: "Agreement logging failed." },
      { status: 500 }
    );
  }
}
