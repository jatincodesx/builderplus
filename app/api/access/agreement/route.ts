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
import type {
  AccessGateAgreementPayload,
  AccessGateAgreementResponse,
} from "@/types/accessGate";
import type { CloudflareEnv } from "@/lib/accessGate/cloudflareEnv";

/**
 * Access Cloudflare D1 binding from the Next.js edge runtime.
 *
 * On Cloudflare Pages with OpenNext/next-on-pages, bindings are available
 * via process.env or through the global cf object. This helper attempts
 * both patterns and falls back gracefully.
 *
 * To use D1 in production:
 * 1. Create a D1 database: wrangler d1 create builderplus_access_logs
 * 2. Bind it to your Cloudflare Pages project with binding name: DB
 * 3. Run the migration SQL from migrations/001_access_agreements.sql
 */
function getCloudflareEnv(): CloudflareEnv {
  try {
    // Pattern 1: OpenNext/next-on-pages exposes bindings via process.env
    // The binding name "DB" is set in the Cloudflare Pages dashboard
    type ProcessEnvWithBindings = typeof process.env & Record<string, unknown>;
    const db = (process.env as ProcessEnvWithBindings).DB;
    if (db && typeof db === "object" && "prepare" in (db as object)) {
      return { DB: db as CloudflareEnv["DB"] };
    }
  } catch {
    // Binding not available via process.env
  }

  try {
    // Pattern 2: Access via globalThis for Cloudflare Workers runtime
    type GlobalWithCf = typeof globalThis & {
      cf?: { env?: CloudflareEnv };
    };
    const cfEnv = (globalThis as GlobalWithCf).cf?.env;
    if (cfEnv?.DB) {
      return { DB: cfEnv.DB };
    }
  } catch {
    // Binding not available via globalThis
  }

  return {};
}

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

    const env = getCloudflareEnv();

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
