import { auth, authSecret, oauthProvidersConfigured } from "@/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const guestUserId = "test-user-1";

export async function getAuthSession() {
  if (!authSecret || !oauthProvidersConfigured) {
    return null;
  }
  return auth();
}

export async function getSessionUserId(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.user?.id ?? null;
}

export async function getAuthenticatedUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (userId) {
    return userId;
  }

  await db.execute(sql`
    INSERT INTO users (id, email)
    VALUES (${guestUserId}, 'test-user-1@example.com')
    ON CONFLICT DO NOTHING
  `);

  return guestUserId;
}
