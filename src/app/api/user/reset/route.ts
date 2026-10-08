import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { swipeHistory, userRatings } from "@/db/schema";
import { requireSessionUser } from "@/lib/api-auth";

export async function POST() {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;

    await db.transaction(async (tx) => {
      await tx.delete(swipeHistory).where(
        eq(swipeHistory.userId, userId),
      );
      await tx.delete(userRatings).where(
        eq(userRatings.userId, userId),
      );
    });

    revalidatePath("/");
    revalidatePath("/watchlist");
    revalidatePath("/profile");

    return NextResponse.json({
      success: true,
      message: "User activity reset successfully",
    });
  } catch (error) {
    console.error("Could not reset user activity.", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not reset user activity.",
      },
      { status: 500 },
    );
  }
}
