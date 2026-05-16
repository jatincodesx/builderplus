/**
 * Minimal D1Database interface for Cloudflare D1 binding access.
 *
 * This avoids requiring @cloudflare/workers-types as a dependency.
 * The interface matches the Cloudflare D1 API used in Workers/Pages.
 * If @cloudflare/workers-types is added later, this can be removed.
 */

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: unknown;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1Result>;
}

/**
 * Cloudflare Pages/Workers environment bindings.
 * The DB binding is optional — the app falls back to console logging when absent.
 */
export interface CloudflareEnv {
  DB?: D1Database;
}
