import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  movieCache,
  swipeActionEnum,
  swipeHistory,
} from "@/db/schema";
import { getSwipeMovies } from "@/lib/swipe-movies";
import { detectRequestLanguage } from "@/lib/language";
import { getMovieDetails } from "@/lib/tmdb";
import { requireSessionUser } from "@/lib/api-auth";

type SwipeAction = (typeof swipeActionEnum.enumValues)[number];

interface SwipeMoviePayload {
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genres: string[];
}

function isSwipeAction(action: unknown): action is SwipeAction {
  return (
    typeof action === "string" &&
    swipeActionEnum.enumValues.some((value) => value === action)
  );
}

function isSwipeMoviePayload(value: unknown): value is SwipeMoviePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const movie = value as Record<string, unknown>;
  return (
    typeof movie.title === "string" &&
    movie.title.trim().length > 0 &&
    movie.title.length <= 300 &&
    (movie.posterPath === null ||
      (typeof movie.posterPath === "string" &&
        movie.posterPath.length <= 300)) &&
    typeof movie.releaseDate === "string" &&
    movie.releaseDate.length <= 20 &&
    typeof movie.voteAverage === "number" &&
    Number.isFinite(movie.voteAverage) &&
    movie.voteAverage >= 0 &&
    movie.voteAverage <= 10 &&
    Array.isArray(movie.genres) &&
    movie.genres.length <= 30 &&
    movie.genres.every(
      (genre) =>
        typeof genre === "string" &&
        genre.trim().length > 0 &&
        genre.length <= 80,
    )
  );
}

export async function GET(request: Request) {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;
    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page");
    const requestedPage = Number(pageParam ?? "1");
    const excludeParam = url.searchParams.get("exclude") ?? "";
    const excludedIds = excludeParam
      ? excludeParam.split(",").map(Number)
      : [];
    if (
      (pageParam !== null &&
        (!/^\d+$/.test(pageParam) ||
          !Number.isInteger(requestedPage) ||
          requestedPage < 1 ||
          requestedPage > 500)) ||
      excludedIds.length > 500 ||
      excludedIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid swipe pagination or exclusion parameters." },
        { status: 400 },
      );
    }
    const page = requestedPage;
    const requestedLanguage = url.searchParams.get("language");
    const language = detectRequestLanguage(request.headers, requestedLanguage);

    const requestedIds = url.searchParams.get("ids");
    if (requestedIds !== null) {
      const movieIds = [
        ...new Set(
          requestedIds
            .split(",")
            .map(Number)
            .filter((id) => Number.isSafeInteger(id) && id > 0),
        ),
      ];

      if (
        movieIds.length > 20 ||
        requestedIds.split(",").some((id) => !/^\d+$/.test(id))
      ) {
        return NextResponse.json(
          { error: "Movie IDs must be positive integers (up to 20 IDs)." },
          { status: 400 },
        );
      }

      const localizedMovies = [];
      for (let offset = 0; offset < movieIds.length; offset += 5) {
        const batch = movieIds.slice(offset, offset + 5);
        localizedMovies.push(
          ...(await Promise.all(
            batch.map(async (movieId) => {
              const details = await getMovieDetails(
                movieId,
                AbortSignal.timeout(10_000),
                language,
              );
              return {
                id: details.id,
                title: details.title,
                overview: details.overview,
                poster_path: details.poster_path,
                backdrop_path: details.backdrop_path,
                genre_ids: details.genres.map((genre) => genre.id),
                genres: details.genres.map((genre) => genre.name),
                release_date: details.release_date,
                vote_average: details.vote_average,
              };
            }),
          )),
        );
      }
      return NextResponse.json({ movies: localizedMovies });
    }

    const movies = await getSwipeMovies(userId, page, excludedIds, 10, language);
    return NextResponse.json({
      movies,
      refreshing:
        movies.length < 5 && Boolean(process.env.TMDB_READ_TOKEN),
    });
  } catch (error) {
    console.error("Could not load swipe movies.", error);
    const message =
      error instanceof Error ? error.message : "Could not load more movies.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "The request body must be valid JSON." },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "A movieId and valid action are required." },
        { status: 400 },
      );
    }

    const { movieId, action, movie, language: requestedLanguage } = body as {
      movieId?: unknown;
      action?: unknown;
      movie?: unknown;
      language?: unknown;
    };

    if (
      typeof movieId !== "number" ||
      !Number.isSafeInteger(movieId) ||
      movieId <= 0 ||
      !isSwipeAction(action)
    ) {
      return NextResponse.json(
        { error: "A positive movieId and valid action are required." },
        { status: 400 },
      );
    }
    const language = detectRequestLanguage(request.headers, requestedLanguage);

    const [cachedMovie] = await db
      .select({ tmdbId: movieCache.tmdbId })
      .from(movieCache)
      .where(eq(movieCache.tmdbId, movieId))
      .limit(1);

    if (!cachedMovie) {
      const movieDetails = isSwipeMoviePayload(movie)
        ? movie
        : await getMovieDetails(
            movieId,
            AbortSignal.timeout(10_000),
            language,
          ).then(
            (details) => ({
              title: details.title,
              posterPath: details.poster_path,
              releaseDate: details.release_date,
              voteAverage: details.vote_average,
              genres: details.genres.map((genre) => genre.name),
            }),
          );
      const releaseYear = movieDetails.releaseDate.match(/^\d{4}/)?.[0];

      await db
        .insert(movieCache)
        .values({
          tmdbId: movieId,
          title: movieDetails.title.trim(),
          posterPath: movieDetails.posterPath,
          year: releaseYear ? Number(releaseYear) : null,
          voteAverage: movieDetails.voteAverage,
        })
        .onConflictDoNothing();
    }

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(swipeHistory)
        .set({ action, createdAt: new Date() })
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.movieId, movieId),
          ),
        )
        .returning({ id: swipeHistory.id });

      if (updated.length === 0) {
        await tx.insert(swipeHistory).values({
          userId,
          movieId,
          action,
        });
      }
    });

    revalidatePath("/watchlist");
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not save movie swipe.", error);
    const message =
      error instanceof Error ? error.message : "Could not save movie swipe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "The request body must be valid JSON." },
        { status: 400 },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("movieId" in body) ||
      typeof body.movieId !== "number" ||
      !Number.isSafeInteger(body.movieId) ||
      body.movieId <= 0
    ) {
      return NextResponse.json(
        { error: "A positive movieId is required." },
        { status: 400 },
      );
    }

    await db
      .delete(swipeHistory)
      .where(
        and(
          eq(swipeHistory.userId, userId),
          eq(swipeHistory.movieId, body.movieId),
        ),
      );

    revalidatePath("/watchlist");
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not undo movie swipe.", error);
    const message =
      error instanceof Error ? error.message : "Could not undo movie swipe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
