import type { AccessGateAgreementPayload } from "@/types/accessGate";

/**
 * Agreement logging abstraction.
 *
 * For now: console.log fallback when no persistent storage is configured.
 *
 * TODO: Plug in Cloudflare D1 for production persistence:
 *   if (env.D1_DATABASE) { await env.D1_DATABASE.prepare(...).run() }
 *
 * TODO: Plug in Supabase for production persistence:
 *   if (env.SUPABASE_URL) { await supabase.from('agreement_logs').insert(...) }
 *
 * TODO: Plug in Cloudflare KV for production persistence:
 *   if (env.KV_NAMESPACE) { await env.KV_NAMESPACE.put(key, value) }
 *
 * TODO: Plug in R2 for production persistence:
 *   if (env.R2_BUCKET) { await env.R2_BUCKET.put(key, body) }
 *
 * Do not block access if logging fails.
 */

export interface AgreementLogResult {
  logged: boolean;
  backend: string;
}

export async function logAgreement(
  payload: AccessGateAgreementPayload,
  meta: {
    userAgent: string;
    ip: string | null;
    country: string | null;
    serverTimestamp: string;
    projectId: string;
  }
): Promise<AgreementLogResult> {
  const logEntry = {
    ...payload,
    ...meta,
  };

  // TODO: Replace console.log with D1/Supabase/KV/R2 in production.
  // Production agreement storage requires D1 or Supabase.
  console.log("[AccessGate] Agreement logged:", JSON.stringify(logEntry, null, 2));

  return {
    logged: true,
    backend: "console-fallback",
  };
}
