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
import { getRuntimeEnvValue } from "@/lib/accessGate/getRuntimeEnv";
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

    const hashResult = await getRuntimeEnvValue("DEMO_ACCESS_PASSWORD_HASH");
    const storedHash = hashResult.value || undefined;

    let devFallback: string | undefined;
    if (process.env.NODE_ENV !== "production") {
      const devResult = await getRuntimeEnvValue("DEMO_ACCESS_DEV_PASSWORD");
      devFallback = devResult.value || undefined;
    }

    const valid = await verifyPassword(body.password, storedHash, devFallback);

    if (!valid) {
      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json<AccessGateVerifyResponse>(
        {
          ok: false,
          error: "Invalid password.",
          ...(isDev
            ? { hasPasswordHash: !!storedHash, source: hashResult.source }
            : {}),
        },
        { status: 401 }
      );
    }

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json<AccessGateVerifyResponse>({
      ok: true,
      ...(isDev
        ? { hasPasswordHash: !!storedHash, source: hashResult.source }
        : {}),
    });
  } catch {
    return NextResponse.json<AccessGateVerifyResponse>(
      { ok: false, error: "Verification failed." },
      { status: 500 }
    );
  }
}
