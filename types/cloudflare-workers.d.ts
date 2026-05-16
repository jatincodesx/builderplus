/**
 * Type declaration for the Cloudflare Workers module.
 *
 * In Cloudflare Pages/Workers runtime, `import { env } from "cloudflare:workers"`
 * provides access to environment variables and bindings (D1, KV, R2, etc.).
 *
 * This declaration allows TypeScript to compile without errors when this
 * module is referenced via dynamic import. It does NOT make the module
 * available at runtime in local development — that is handled by try/catch
 * in lib/accessGate/getRuntimeEnv.ts.
 */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
