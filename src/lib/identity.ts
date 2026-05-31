import { headers } from "next/headers";
import { auth } from "./auth";

export interface Requester {
  userId: string | null;
  guestId: string | null;
}

/**
 * Resolve the caller as either a logged-in user (via NextAuth session) or an
 * anonymous guest (via the `x-guest-id` header set by the client). Exactly one
 * of `userId` / `guestId` will be populated for a valid requester.
 */
export async function getRequester(): Promise<Requester> {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, guestId: null };
  }
  const h = await headers();
  const guestId = h.get("x-guest-id");
  return { userId: null, guestId: guestId || null };
}

/**
 * Prisma `where` clause that scopes a Document/ChatSession to its owner.
 * Returns null when the requester is neither authenticated nor a known guest.
 */
export function ownerWhere(req: Requester): { userId: string } | { guestId: string } | null {
  if (req.userId) return { userId: req.userId };
  if (req.guestId) return { guestId: req.guestId };
  return null;
}
