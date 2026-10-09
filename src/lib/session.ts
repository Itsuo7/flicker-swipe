import { auth, authSecret, oauthProvidersConfigured } from "@/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { guestCookieName, isGuestId } from "@/lib/guest";

export async function getAuthSession() {
  if (!authSecret || !oauthProvidersConfigured) {
    return null;
  }
  return auth();
}

export async function getSessionUserId(): Promise<string | null> {
  const session = await getAuthSession();
  if (session?.user?.id) {
    return session.user.id;
  }

  const guestId = (await cookies()).get(guestCookieName)?.value;
  if (isGuestId(guestId)) {
    await ensureGuestUser(guestId);
    return guestId;
  }
  return null;
}

const ensuredGuestIds = new Set<string>();

export async function ensureGuestUser(guestId: string) {
  if (ensuredGuestIds.has(guestId)) {
    return;
  }
  await db.execute(sql`
    INSERT INTO users (id, display_name)
    VALUES (${guestId}, 'Guest')
    ON CONFLICT DO NOTHING
  `);
  ensuredGuestIds.add(guestId);
}
