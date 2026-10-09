import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureGuestUser } from "@/lib/session";
import {
  createGuestId,
  guestCookieMaxAge,
  guestCookieName,
  isGuestId,
} from "@/lib/guest";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get(guestCookieName)?.value;
    const guestId = isGuestId(existing) ? existing : createGuestId();
    await ensureGuestUser(guestId);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(guestCookieName, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: guestCookieMaxAge,
    });
    return response;
  } catch (error) {
    console.error("Could not start guest mode.", error);
    return NextResponse.json(
      { error: "Could not start guest mode." },
      { status: 500 },
    );
  }
}
