import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { swipeHistory, userRatings } from "@/db/schema";
import { defaultLanguage, type Language } from "@/lib/i18n";
import { getMovieDetails } from "@/lib/tmdb";

const tasteMovieLimit = 20;
const genreLookupConcurrency = 5;
const genreLookupTimeoutMs = 10_000;

interface TasteSignal {
  positive: Set<number>;
  negative: Set<number>;
}

export interface TasteGenre {
  id: number;
  name: string;
  positive: number;
  negative: number;
  score: number;
}

export async function getTasteGenres(
  userId: string,
  language: Language = defaultLanguage,
): Promise<TasteGenre[]> {
  if (!process.env.TMDB_READ_TOKEN) {
    return [];
  }

  const [
    positiveRatings,
    negativeRatings,
    positiveSwipes,
    negativeSwipes,
  ] = await Promise.all([
    db
      .select({ movieId: userRatings.movieId })
      .from(userRatings)
      .where(and(eq(userRatings.userId, userId), gte(userRatings.rating, 7)))
      .orderBy(desc(userRatings.rating), desc(userRatings.updatedAt))
      .limit(tasteMovieLimit),
    db
      .select({ movieId: userRatings.movieId })
      .from(userRatings)
      .where(and(eq(userRatings.userId, userId), lte(userRatings.rating, 5)))
      .orderBy(userRatings.rating, desc(userRatings.updatedAt))
      .limit(tasteMovieLimit),
    db
      .select({ movieId: swipeHistory.movieId })
      .from(swipeHistory)
      .where(
        and(
          eq(swipeHistory.userId, userId),
          eq(swipeHistory.action, "LIKE"),
        ),
      )
      .orderBy(desc(swipeHistory.createdAt))
      .limit(tasteMovieLimit),
    db
      .select({ movieId: swipeHistory.movieId })
      .from(swipeHistory)
      .where(
        and(
          eq(swipeHistory.userId, userId),
          eq(swipeHistory.action, "DISLIKE"),
        ),
      )
      .orderBy(desc(swipeHistory.createdAt))
      .limit(tasteMovieLimit),
  ]);

  const signals: TasteSignal = {
    positive: new Set([
      ...positiveRatings.map(({ movieId }) => movieId),
      ...positiveSwipes.map(({ movieId }) => movieId),
    ]),
    negative: new Set([
      ...negativeRatings.map(({ movieId }) => movieId),
      ...negativeSwipes.map(({ movieId }) => movieId),
    ]),
  };
  const movieIds = [
    ...new Set([...signals.positive, ...signals.negative]),
  ];
  const genreScores = new Map<number, TasteGenre>();

  for (let offset = 0; offset < movieIds.length; offset += genreLookupConcurrency) {
    const batch = movieIds.slice(offset, offset + genreLookupConcurrency);
    const detailsBatch = await Promise.all(
      batch.map(async (movieId) => {
        try {
          return await getMovieDetails(
            movieId,
            AbortSignal.timeout(genreLookupTimeoutMs),
            language,
          );
        } catch (error) {
          console.error(`Could not load taste details for movie ${movieId}.`, error);
          return null;
        }
      }),
    );

    for (let index = 0; index < detailsBatch.length; index += 1) {
      const details = detailsBatch[index];
      if (!details) {
        continue;
      }

      const movieId = batch[index];
      const isPositive = signals.positive.has(movieId);
      const isNegative = signals.negative.has(movieId);
      for (const genre of details.genres) {
        const existing = genreScores.get(genre.id) ?? {
          id: genre.id,
          name: genre.name,
          positive: 0,
          negative: 0,
          score: 0,
        };
        if (isPositive) {
          existing.positive += 1;
        }
        if (isNegative) {
          existing.negative += 1;
        }
        existing.score = existing.positive - existing.negative;
        genreScores.set(genre.id, existing);
      }
    }
  }

  return [...genreScores.values()].sort(
    (first, second) =>
      second.score - first.score ||
      second.positive - first.positive ||
      first.id - second.id,
  );
}
