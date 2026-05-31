import { getGuestId } from "./guest";

/**
 * Build request headers that include the anonymous guest id. The server
 * (`getRequester`) prefers an authenticated session when present, so attaching
 * the guest id unconditionally is safe for logged-in users too.
 */
export function guestHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const guestId = getGuestId();
  if (guestId) headers["x-guest-id"] = guestId;
  return headers;
}
