/** Timing-safe string equality for secrets (pure — unit-tested). */
export function safeSecretEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function str(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  return v == null ? "" : String(v).trim();
}
