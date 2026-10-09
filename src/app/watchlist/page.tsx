import { and, desc, eq, inArray } from "drizzle-orm";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { movieCache, swipeHistory } from "@/db/schema";
import {
  WatchlistGrid,
  WatchlistHeader,
  WatchlistLoading,
  type WatchlistAction,
  type WatchlistMovie,
} from "@/components/WatchlistGrid";
import { getMovieDetails } from "@/lib/tmdb";
import { getSessionUserId } from "@/lib/session";
import { detectRequestLanguage } from "@/lib/language";

const detailLookupConcurrency = 5;
const detailLookupTimeoutMs = 10_000;

export default function WatchlistPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          <section className="mx-auto w-full max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
            <WatchlistLoading />
          </section>
        </main>
      }
    >
      <WatchlistGate />
    </Suspense>
  );
}

async function WatchlistGate() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login?callbackUrl=%2Fwatchlist");
  }

  return (
    <main className="flex-1 bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <section className="mx-auto w-full max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <WatchlistHeader />

        <Suspense fallback={<WatchlistLoading />}>
          <WatchlistData userId={userId} />
        </Suspense>
      </section>
    </main>
  );
}

async function WatchlistData({ userId }: { userId: string }) {
  const requestHeaders = await headers();
  const language = detectRequestLanguage(requestHeaders);
  const watchlistEntries = await db
    .select({
      id: movieCache.tmdbId,
      title: movieCache.title,
      posterPath: movieCache.posterPath,
      year: movieCache.year,
      voteAverage: movieCache.voteAverage,
      action: swipeHistory.action,
    })
    .from(swipeHistory)
    .innerJoin(movieCache, eq(swipeHistory.movieId, movieCache.tmdbId))
    .where(
      and(
        eq(swipeHistory.userId, userId),
        inArray(swipeHistory.action, ["LIKE", "WATCHLATER"]),
      ),
    )
    .orderBy(desc(swipeHistory.createdAt));

  const movies: WatchlistMovie[] = watchlistEntries.map((entry) => ({
    ...entry,
    genres: [],
    action: entry.action as WatchlistAction,
  }));

  if (process.env.TMDB_READ_TOKEN) {
    for (
      let offset = 0;
      offset < movies.length;
      offset += detailLookupConcurrency
    ) {
      const batch = movies.slice(offset, offset + detailLookupConcurrency);
      const details = await Promise.all(
        batch.map(async (movie) => {
          try {
            return await getMovieDetails(
              movie.id,
              AbortSignal.timeout(detailLookupTimeoutMs),
              language,
            );
          } catch (error) {
            console.error(
              `Could not load watchlist genres for movie ${movie.id}.`,
              error,
            );
            return null;
          }
        }),
      );

      details.forEach((detail, index) => {
        if (detail) {
          const movie = batch[index];
          movie.title = detail.title;
          movie.posterPath = detail.poster_path;
          movie.year = /^\d{4}/.test(detail.release_date)
            ? Number(detail.release_date.slice(0, 4))
            : movie.year;
          movie.voteAverage = detail.vote_average;
          movie.genres = detail.genres.map((genre) => genre.name);
        }
      });
    }
  }

  return <WatchlistGrid movies={movies} />;
}
