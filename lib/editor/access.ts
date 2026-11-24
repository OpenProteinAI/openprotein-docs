const STAFF_DOMAINS = new Set(['openprotein.ai', 'ne47.bio']);

/** Staff emails only. */
export function canUseEditor(email: string | null): boolean {
  const at = email?.lastIndexOf('@') ?? -1;
  if (!email || at < 1) return false;
  return STAFF_DOMAINS.has(email.slice(at + 1).trim().toLowerCase());
}
