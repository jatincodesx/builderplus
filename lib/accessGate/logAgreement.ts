import type { CloudflareEnv, D1Database } from "./cloudflareEnv";
import type {
  AccessAgreementPayload,
  AgreementLogStorage,
} from "@/types/accessGate";

/**
 * Reusable access agreement logging.
 *
 * Inserts into Cloudflare D1 when the DB binding is available.
 * Falls back to console.log when DB is missing.
 *
 * This is NOT enterprise-grade audit logging.
 * For production, consider signed tokens, database-backed audit, and rate limiting.
 *
 * Do not block access if logging fails.
 * Never store or log raw passwords.
 */

interface LogAgreementInput {
  payload: AccessAgreementPayload;
  request: Request;
  env?: CloudflareEnv;
}

interface LogAgreementResult {
  ok: boolean;
  logged: boolean;
  storage: AgreementLogStorage;
  error?: string;
}

function extractRequestMeta(request: Request) {
  const headers = request.headers;
  const userAgent = headers.get("user-agent") ?? undefined;
  const ip =
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for") ??
    headers.get("x-real-ip") ??
    undefined;
  const country = headers.get("cf-ipcountry") ?? undefined;
  return { userAgent, ip, country };
}

async function insertIntoD1(
  db: D1Database,
  entry: {
    name: string | undefined;
    company: string | undefined;
    email: string | undefined;
    clientName: string;
    passwordLabel: string;
    termsVersion: string;
    ipAddress: string | undefined;
    country: string | undefined;
    userAgent: string | undefined;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO access_agreements
        (name, company, email, client_name, password_label, terms_version, accepted, ip_address, country, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    )
    .bind(
      entry.name ?? null,
      entry.company ?? null,
      entry.email ?? null,
      entry.clientName,
      entry.passwordLabel,
      entry.termsVersion,
      entry.ipAddress ?? null,
      entry.country ?? null,
      entry.userAgent ?? null
    )
    .run();
}

export async function logAccessAgreement(
  input: LogAgreementInput
): Promise<LogAgreementResult> {
  const { payload, request, env } = input;
  const meta = extractRequestMeta(request);

  const entry = {
    name: payload.name,
    company: payload.company,
    email: payload.email,
    clientName: payload.clientName,
    passwordLabel: payload.passwordLabel,
    termsVersion: payload.termsVersion,
    ipAddress: meta.ip,
    country: meta.country,
    userAgent: meta.userAgent,
  };

  if (env?.DB) {
    try {
      await insertIntoD1(env.DB, entry);
      return { ok: true, logged: true, storage: "d1" };
    } catch (err) {
      console.error(
        "[AccessGate] D1 insert failed:",
        err instanceof Error ? err.message : err
      );
      console.log(
        "[AccessGate] Agreement (D1 failed, logging to console):",
        JSON.stringify(entry, null, 2)
      );
      return {
        ok: true,
        logged: false,
        storage: "d1-error",
        error: err instanceof Error ? err.message : "D1 insert failed",
      };
    }
  }

  console.log(
    "[AccessGate] Agreement (no DB binding, console fallback):",
    JSON.stringify(entry, null, 2)
  );
  return { ok: true, logged: false, storage: "console-fallback" };
}
