/**
 * Hash utilities using Web Crypto API (Cloudflare Edge compatible).
 *
 * Prefer comparing a hash in production, not raw passwords.
 * If DEMO_ACCESS_PASSWORD_HASH is set, it will be used for comparison.
 * Otherwise falls back to raw env password comparison temporarily.
 */

export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  input: string,
  storedHash: string | undefined,
  fallbackRaw?: string
): Promise<boolean> {
  const inputHash = await sha256(input);

  if (storedHash) {
    return inputHash === storedHash;
  }

  // TODO: Remove raw password fallback before production.
  // Replace with mandatory hash comparison once all environments
  // have DEMO_ACCESS_PASSWORD_HASH configured.
  if (fallbackRaw) {
    return input === fallbackRaw;
  }

  return false;
}
