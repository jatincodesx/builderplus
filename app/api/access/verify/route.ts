/**
 * Lightweight demo access gate — password verification.
 *
 * This is NOT enterprise-grade authentication.
 * For high-stakes production access, replace with proper auth,
 * signed tokens, database-backed audit logging, and rate limiting.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/accessGate/hash";
import type { AccessGateVerifyResponse } from "@/types/accessGate";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };

    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json<AccessGateVerifyResponse>(
        { ok: false, error: "Password is required." },
        { status: 400 }
      );
    }

    const storedHash = process.env.DEMO_ACCESS_PASSWORD_HASH;
    const devFallback =
      process.env.NODE_ENV !== "production"
        ? process.env.DEMO_ACCESS_DEV_PASSWORD
        : undefined;

    const valid = await verifyPassword(body.password, storedHash, devFallback);

    if (!valid) {
      return NextResponse.json<AccessGateVerifyResponse>(
        { ok: false, error: "Invalid password." },
        { status: 401 }
      );
    }

    return NextResponse.json<AccessGateVerifyResponse>({ ok: true });
  } catch {
    return NextResponse.json<AccessGateVerifyResponse>(
      { ok: false, error: "Verification failed." },
      { status: 500 }
    );
  }
}
