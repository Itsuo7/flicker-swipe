import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { movieCache, swipeHistory, userRatings } from "@/db/schema";
import { defaultLanguage, type Language } from "@/lib/i18n";
import { getMoviesByGenres, type TMDBMovie } from "@/lib/tmdb";
import { getTasteGenres } from "@/lib/taste";

export async function getPersonalizedRecommendations(
  userId: string,
  page: number,
  excludedIds: number[] = [],
  limit = 10,
  language: Language = defaultLanguage,
): Promise<TMDBMovie[]> {
  const tasteGenres = await getTasteGenres(userId, language);
  const topGenreIds = tasteGenres
    .filter((genre) => genre.score > 0)
    .slice(0, 3)
    .map((genre) => genre.id);

  if (topGenreIds.length === 0 || limit <= 0) {
    return [];
  }

  let candidates: TMDBMovie[];
  try {
    candidates = await getMoviesByGenres(topGenreIds, page, language);
  } catch (error) {
    console.error("Could not fetch personalized movies from TMDb.", error);
    return [];
  }
  const candidateIds = candidates.map(({ id }) => id);

  if (candidateIds.length === 0) {
    return [];
  }

  const [swipedMovies, ratedMovies] = await Promise.all([
    db
      .select({ movieId: swipeHistory.movieId })
      .from(swipeHistory)
      .where(
        and(
          eq(swipeHistory.userId, userId),
          inArray(swipeHistory.movieId, candidateIds),
        ),
      ),
    db
      .select({ movieId: userRatings.movieId })
      .from(userRatings)
      .where(
        and(
          eq(userRatings.userId, userId),
          inArray(userRatings.movieId, candidateIds),
        ),
      ),
  ]);

  const unavailableIds = new Set([
    ...excludedIds,
    ...swipedMovies.map(({ movieId }) => movieId),
    ...ratedMovies.map(({ movieId }) => movieId),
  ]);
  const recommendations = candidates
    .filter((movie) => !unavailableIds.has(movie.id))
    .slice(0, limit);

  if (recommendations.length > 0) {
    await db
      .insert(movieCache)
      .values(
        recommendations.map((movie) => ({
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

  return recommendations;
}
