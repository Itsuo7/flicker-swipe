import { count, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/db";
import { movieCache, userRatings } from "@/db/schema";
import { getMovieByImdbId } from "@/lib/tmdb";
import { detectRequestLanguage } from "@/lib/language";
import { warmSwipeMovieCache } from "@/lib/swipe-movies";
import { requireSessionUser } from "@/lib/api-auth";

export const maxDuration = 60;

const lookupConcurrency = 10;
const cacheLookupBatchSize = 50;
const insertBatchSize = 100;
const tmdbTimeoutMs = 15_000;
const maxCsvBytes = 10 * 1024 * 1024;
const maxCsvRows = 20_000;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    chunks.push(items.slice(offset, offset + size));
  }
  return chunks;
}

async function getImportedRatingCount(userId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(userRatings)
    .where(eq(userRatings.userId, userId));

  return result.count;
}

export async function GET() {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;
    return NextResponse.json({
      success: true,
      count: await getImportedRatingCount(userId),
    });
  } catch (error) {
    console.error("Could not load IMDb import status.", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not load the imported ratings count.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface ImdbCsvRow {
  Const?: string;
  "Title Type"?: string;
  "Your Rating"?: string;
}

export async function POST(request: Request) {
  const startedAt = performance.now();

  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected a multipart form-data request." },
        { status: 400 },
      );
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Could not read the multipart form data." },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    const languageValue = formData.get("language");
    const language = detectRequestLanguage(request.headers, languageValue);

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A CSV file is required in the file field." },
        { status: 400 },
      );
    }
    if (file.size > maxCsvBytes) {
      return NextResponse.json(
        { error: "The CSV file exceeds the 10 MB upload limit." },
        { status: 413 },
      );
    }

    const parsed = Papa.parse<ImdbCsvRow>(await file.text(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: `Could not parse the IMDb CSV: ${parsed.errors[0].message}` },
        { status: 400 },
      );
    }
    if (parsed.data.length > maxCsvRows) {
      return NextResponse.json(
        { error: `The CSV file exceeds the ${maxCsvRows} row limit.` },
        { status: 413 },
      );
    }

    const headers = parsed.meta.fields ?? [];
    const requiredHeaders = ["Const", "Title Type", "Your Rating"];
    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `The IMDb CSV is missing required columns: ${missingHeaders.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const candidatesByImdbId = new Map<string, number>();
    let skipped = 0;

    for (const row of parsed.data) {
      const imdbId = row.Const?.trim();
      const rating = Number(row["Your Rating"]);

      if (
        row["Title Type"]?.trim().toLowerCase() !== "movie" ||
        !imdbId ||
        !/^tt\d+$/.test(imdbId) ||
        !Number.isFinite(rating) ||
        rating < 1 ||
        rating > 10
      ) {
        skipped += 1;
        continue;
      }

      candidatesByImdbId.set(imdbId, rating);
    }

    const candidates = [...candidatesByImdbId].map(([imdbId, rating]) => ({
      imdbId,
      rating,
    }));
    const moviesById = new Map<
      number,
      {
        tmdbId: number;
        imdbId: string;
        title: string;
        posterPath: string | null;
        year: number | null;
        voteAverage: number;
        rating: number;
      }
    >();

    const cachedMoviesByImdbId = new Map<
      string,
      {
        tmdbId: number;
        imdbId: string | null;
        title: string;
        posterPath: string | null;
        year: number | null;
        voteAverage: number | null;
      }
    >();

    const allImdbIds = candidates
      .map((candidate) => candidate.imdbId)
      .filter(
        (imdbId): imdbId is string =>
          typeof imdbId === "string" && imdbId.trim().length > 0,
      );

    for (const imdbIds of chunkArray(allImdbIds, cacheLookupBatchSize)) {
      const cachedMovies = await db
        .select({
          tmdbId: movieCache.tmdbId,
          imdbId: movieCache.imdbId,
          title: movieCache.title,
          posterPath: movieCache.posterPath,
          year: movieCache.year,
          voteAverage: movieCache.voteAverage,
        })
        .from(movieCache)
        .where(inArray(movieCache.imdbId, imdbIds));

      for (const movie of cachedMovies) {
        if (movie.imdbId) {
          cachedMoviesByImdbId.set(movie.imdbId, movie);
        }
      }
    }

    for (const candidate of candidates) {
      const movie = cachedMoviesByImdbId.get(candidate.imdbId);
      if (movie) {
        moviesById.set(movie.tmdbId, {
          tmdbId: movie.tmdbId,
          imdbId: candidate.imdbId,
          title: movie.title,
          posterPath: movie.posterPath,
          year: movie.year,
          voteAverage: movie.voteAverage ?? 0,
          rating: candidate.rating,
        });
      }
    }

    const uncachedCandidates = candidates.filter(
      (candidate) => !cachedMoviesByImdbId.has(candidate.imdbId),
    );

    for (
      let offset = 0;
      offset < uncachedCandidates.length;
      offset += lookupConcurrency
    ) {
      const batch = uncachedCandidates.slice(offset, offset + lookupConcurrency);
      const results = await Promise.all(
        batch.map(async (candidate) => {
          try {
            return {
              candidate,
              movie: await getMovieByImdbId(
                candidate.imdbId,
                AbortSignal.timeout(tmdbTimeoutMs),
                language,
              ),
            };
          } catch (error) {
            console.error(
              `TMDb lookup failed for IMDb ID ${candidate.imdbId}; skipping this rating.`,
              error,
            );
            return { candidate, movie: null };
          }
        }),
      );

      for (const { candidate, movie } of results) {
        if (!movie) {
          skipped += 1;
          continue;
        }

        const releaseYear = movie.release_date.match(/^\d{4}/)?.[0];

        moviesById.set(movie.id, {
          tmdbId: movie.id,
          imdbId: candidate.imdbId,
          title: movie.title,
          posterPath: movie.poster_path,
          year: releaseYear ? Number(releaseYear) : null,
          voteAverage: movie.vote_average,
          rating: candidate.rating,
        });
      }
    }

    const moviesToImport = [...moviesById.values()];
    let imported = 0;

    await db.transaction(async (tx) => {
      for (let offset = 0; offset < moviesToImport.length; offset += insertBatchSize) {
        const batch = moviesToImport.slice(offset, offset + insertBatchSize);
        const cachedAt = new Date();

        await tx
          .insert(movieCache)
          .values(
            batch.map((movie) => ({
              tmdbId: movie.tmdbId,
              imdbId: movie.imdbId,
              title: movie.title,
              posterPath: movie.posterPath,
              year: movie.year,
              voteAverage: movie.voteAverage,
              cachedAt,
            })),
          )
          .onConflictDoUpdate({
            target: movieCache.tmdbId,
            set: {
              imdbId: sql`excluded.imdb_id`,
              title: sql`excluded.title`,
              posterPath: sql`excluded.poster_path`,
              year: sql`excluded.year`,
              voteAverage: sql`excluded.vote_average`,
              cachedAt: sql`excluded.cached_at`,
            },
          });

        const upsertedRatings = await tx
          .insert(userRatings)
          .values(
            batch.map((movie) => ({
              userId,
              movieId: movie.tmdbId,
              rating: movie.rating,
              updatedAt: cachedAt,
            })),
          )
          .onConflictDoUpdate({
            target: [userRatings.userId, userRatings.movieId],
            set: {
              rating: sql`excluded.rating`,
              updatedAt: sql`excluded.updated_at`,
            },
          })
          .returning({ movieId: userRatings.movieId });
        imported += upsertedRatings.length;
      }
    });

    let cachedCandidates = 0;
    let recommendationsWarmed = true;
    try {
      cachedCandidates = await warmSwipeMovieCache(userId, language);
    } catch (error) {
      recommendationsWarmed = false;
      console.error("Could not prewarm the swipe movie cache after import.", error);
    }

    return NextResponse.json({
      success: true,
      imported,
      processed: moviesToImport.length,
      skipped,
      count: await getImportedRatingCount(userId),
      durationMs: Math.round(performance.now() - startedAt),
      recommendationsWarmed,
      cachedCandidates,
    });
  } catch (error) {
    console.error("IMDb ratings import failed.", error);
    const message =
      error instanceof Error ? error.message : "Failed to import IMDb ratings.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
