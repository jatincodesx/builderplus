/**
 * Lightweight demo access gate — agreement logging.
 *
 * This is NOT enterprise-grade audit logging.
 * For production, persist to D1/Supabase/KV/R2.
 * Do not block access if logging fails.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { logAgreement } from "@/lib/accessGate/logAgreement";
import type {
  AccessGateAgreementPayload,
  AccessGateAgreementResponse,
} from "@/types/accessGate";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AccessGateAgreementPayload;

    if (!body.accepted) {
      return NextResponse.json<AccessGateAgreementResponse>(
        { ok: false, logged: false, error: "Terms must be accepted." },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      null;
    const country = request.headers.get("cf-ipcountry") ?? null;
    const serverTimestamp = new Date().toISOString();
    const projectId = body.passwordLabel;

    const result = await logAgreement(body, {
      userAgent,
      ip,
      country,
      serverTimestamp,
      projectId,
    });

    return NextResponse.json<AccessGateAgreementResponse>({
      ok: true,
      logged: result.logged,
    });
  } catch {
    return NextResponse.json<AccessGateAgreementResponse>(
      { ok: false, logged: false, error: "Agreement logging failed." },
      { status: 500 }
    );
  }
}
