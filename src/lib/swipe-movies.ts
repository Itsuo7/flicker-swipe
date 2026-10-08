import {
  and,
  desc,
  eq,
  notExists,
  notInArray,
  sql,
} from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import {
  movieCache,
  swipeHistory,
  userRatings,
} from "@/db/schema";
import { defaultLanguage, type Language } from "@/lib/i18n";
import { getPersonalizedRecommendations } from "@/lib/recommendations";
import { getPopularMovies } from "@/lib/tmdb";

export interface SwipeMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  genres?: string[];
  release_date: string;
  vote_average: number;
}

const minimumCachedMovies = 5;
const cacheRefreshBatchSize = 20;
const cacheRefreshInFlight = new Map<string, Promise<number>>();
const cacheRefreshScheduled = new Set<string>();

async function fetchAndCacheCandidates(
  userId: string,
  page: number,
  language: Language,
): Promise<number> {
  const existingRefresh = cacheRefreshInFlight.get(userId);
  if (existingRefresh) {
    return existingRefresh;
  }

  const refresh = (async () => {
    let cachedRecommendations = 0;
    try {
      const recommendations = await getPersonalizedRecommendations(
        userId,
        page,
        [],
        cacheRefreshBatchSize,
        language,
      );
      cachedRecommendations = recommendations.length;
    } catch (error) {
      console.error("Could not refresh personalized recommendations.", error);
    }

    const popularMovies =
      cachedRecommendations < minimumCachedMovies
        ? await getPopularMovies(page, language)
        : [];
    if (popularMovies.length > 0) {
      await db
        .insert(movieCache)
        .values(
          popularMovies.map((movie) => ({
            tmdbId: movie.id,
            title: movie.title,
            posterPath: movie.poster_path,
            year: /^\d{4}/.test(movie.release_date)
              ? Number(movie.release_date.slice(0, 4))
              : null,
            voteAverage: movie.vote_average,
          })),
        )
        .onConflictDoNothing();
    }

    return cachedRecommendations + popularMovies.length;
  })();
  cacheRefreshInFlight.set(userId, refresh);

  try {
    return await refresh;
  } finally {
    if (cacheRefreshInFlight.get(userId) === refresh) {
      cacheRefreshInFlight.delete(userId);
    }
  }
}

export async function warmSwipeMovieCache(
  userId: string,
  language: Language = defaultLanguage,
): Promise<number> {
  return fetchAndCacheCandidates(userId, 1, language);
}

function scheduleCacheRefresh(userId: string, page: number, language: Language) {
  if (!process.env.TMDB_READ_TOKEN || cacheRefreshScheduled.has(userId)) {
    return;
  }

  cacheRefreshScheduled.add(userId);
  after(async () => {
    try {
      await fetchAndCacheCandidates(userId, page, language);
    } catch (error) {
      console.error("Background swipe movie cache refresh failed.", error);
    } finally {
      cacheRefreshScheduled.delete(userId);
    }
  });
}

export async function getSwipeMovies(
  userId: string,
  page = 1,
  excludedIds: number[] = [],
  limit = 10,
  language: Language = defaultLanguage,
): Promise<SwipeMovie[]> {
  const cachedConditions = [
    notExists(
      db
        .select({ one: sql`1` })
        .from(swipeHistory)
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.movieId, movieCache.tmdbId),
          ),
        ),
    ),
    notExists(
      db
        .select({ one: sql`1` })
        .from(userRatings)
        .where(
          and(
            eq(userRatings.userId, userId),
            eq(userRatings.movieId, movieCache.tmdbId),
          ),
        ),
    ),
  ];

  if (excludedIds.length > 0) {
    cachedConditions.push(notInArray(movieCache.tmdbId, excludedIds));
  }

  const cachedMovies = await db
    .select({
      id: movieCache.tmdbId,
      title: movieCache.title,
      posterPath: movieCache.posterPath,
      year: movieCache.year,
      voteAverage: movieCache.voteAverage,
    })
    .from(movieCache)
    .where(and(...cachedConditions))
    .orderBy(desc(movieCache.cachedAt))
    .limit(Math.max(limit, minimumCachedMovies));

  if (cachedMovies.length < minimumCachedMovies) {
    scheduleCacheRefresh(userId, page, language);
  }

  return cachedMovies.slice(0, limit).map((movie) => ({
    id: movie.id,
    title: movie.title,
    overview: "",
    poster_path: movie.posterPath,
    backdrop_path: null,
    genre_ids: [],
    release_date: movie.year ? `${movie.year}-01-01` : "",
    vote_average: movie.voteAverage ?? 0,
  }));
}
