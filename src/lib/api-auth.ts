import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";

export async function requireSessionUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  return { userId };
}
