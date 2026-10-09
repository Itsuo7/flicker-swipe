import { and, count, countDistinct, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { swipeHistory, userRatings, users } from "@/db/schema";
import { detectRequestLanguage } from "@/lib/language";
import { requireSessionUser } from "@/lib/api-auth";
import { getTasteGenres } from "@/lib/taste";

export async function GET(request: Request) {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;
    const requestedLanguage = new URL(request.url).searchParams.get("language");
    const language = detectRequestLanguage(request.headers, requestedLanguage);

    const [
      [user],
      [ratingCount],
      [likedTotal],
      [watchLaterTotal],
      [swipeCount],
      tasteGenres,
    ] = await Promise.all([
      db
        .select({
          email: users.email,
          displayName: users.displayName,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
      db
        .select({ count: count() })
        .from(userRatings)
        .where(eq(userRatings.userId, userId)),
      db
        .select({ count: countDistinct(swipeHistory.movieId) })
        .from(swipeHistory)
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.action, "LIKE"),
          ),
        ),
      db
        .select({ count: countDistinct(swipeHistory.movieId) })
        .from(swipeHistory)
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.action, "WATCHLATER"),
          ),
        ),
      db
        .select({ count: countDistinct(swipeHistory.movieId) })
        .from(swipeHistory)
        .where(eq(swipeHistory.userId, userId)),
      getTasteGenres(userId, language),
    ]);

    const topGenres = tasteGenres
      .filter((genre) => genre.score > 0)
      .map((genre) => ({
        id: genre.id,
        name: genre.name,
        count: genre.score,
      }))
      .slice(0, 5);

    return NextResponse.json({
      profile: {
        username: user?.displayName?.trim() || userId,
        email: user?.email ?? "",
        createdAt: user?.createdAt ?? null,
      },
      stats: {
        ratings: ratingCount.count,
        liked: likedTotal.count,
        watchLater: watchLaterTotal.count,
        watchlist: likedTotal.count + watchLaterTotal.count,
        swipes: swipeCount.count,
      },
      topGenres,
    });
  } catch (error) {
    console.error("Could not load user profile.", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load user profile.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;
    await db.delete(userRatings).where(eq(userRatings.userId, userId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not clear imported user ratings.", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not clear imported ratings.",
      },
      { status: 500 },
    );
  }
}
