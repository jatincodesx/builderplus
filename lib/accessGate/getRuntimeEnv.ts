/**
 * Runtime environment variable accessor for Cloudflare Pages Edge + local dev.
 *
 * Resolution order for each env key:
 *   1. Cloudflare Workers env import (cloudflare:workers) — production preview/deployed
 *   2. process.env — local Next.js dev/build
 *
 * The cloudflare:workers import is loaded dynamically so the bundler
 * does not try to resolve it at build time (it only exists in the
 * Cloudflare runtime).
 *
 * This module is server-only. Never import it from client components.
 * Only server API routes should read secrets like DEMO_ACCESS_PASSWORD_HASH.
 */

export type EnvSource = "cloudflare-env" | "process-env" | "fallback";

let cachedCfEnv: Record<string, string | undefined> | null = null;
let cfEnvResolveAttempted = false;

async function resolveCfEnv(): Promise<Record<string, string | undefined> | null> {
  if (cfEnvResolveAttempted) return cachedCfEnv;
  cfEnvResolveAttempted = true;

  try {
    const mod = await import(
      /* webpackIgnore: true */ "cloudflare:workers"
    ) as { env?: Record<string, unknown> };
    if (mod.env && typeof mod.env === "object") {
      const env: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(mod.env)) {
        if (typeof value === "string") {
          env[key] = value;
        } else if (value != null) {
          env[key] = String(value);
        }
      }
      cachedCfEnv = env;
      return cachedCfEnv;
    }
  } catch {
    // cloudflare:workers module not available (local dev or non-CF runtime)
  }

  cachedCfEnv = null;
  return null;
}

export interface RuntimeEnvValue {
  value: string | undefined;
  source: EnvSource;
}

export async function getRuntimeEnvValue(key: string): Promise<RuntimeEnvValue> {
  const cfEnv = await resolveCfEnv();

  if (cfEnv && key in cfEnv && cfEnv[key] !== undefined) {
    return { value: cfEnv[key], source: "cloudflare-env" };
  }

  const procValue = process.env[key];
  if (procValue !== undefined) {
    return { value: procValue, source: "process-env" };
  }

  return { value: undefined, source: "fallback" };
}

export async function getRuntimeEnvBoolean(
  key: string,
  fallback: boolean
): Promise<{ value: boolean; source: EnvSource }> {
  const { value, source } = await getRuntimeEnvValue(key);
  if (value === undefined) return { value: fallback, source: "fallback" };
  return { value: value === "true", source };
}

/**
 * Resolve the Cloudflare D1 binding from the Workers env.
 * Returns the raw D1Database object (not a string), or undefined.
 */
export async function getD1Binding(): Promise<unknown> {
  const cfEnv = await resolveCfEnv();
  if (cfEnv && "DB" in cfEnv) {
    try {
      const mod = await import(
        /* webpackIgnore: true */ "cloudflare:workers"
      ) as { env?: Record<string, unknown> };
      const db = mod.env?.DB;
      if (db && typeof db === "object" && db !== null && "prepare" in db) {
        return db;
      }
    } catch {
      // not available
    }
  }

  try {
    type ProcessEnvWithBindings = typeof process.env & Record<string, unknown>;
    const db = (process.env as ProcessEnvWithBindings).DB;
    if (db && typeof db === "object" && db !== null && "prepare" in db) {
      return db;
    }
  } catch {
    // not available
  }

  try {
    type GlobalWithCf = typeof globalThis & {
      cf?: { env?: Record<string, unknown> };
    };
    const db = (globalThis as GlobalWithCf).cf?.env?.DB;
    if (db && typeof db === "object" && db !== null && "prepare" in db) {
      return db;
    }
  } catch {
    // not available
  }

  return undefined;
}
