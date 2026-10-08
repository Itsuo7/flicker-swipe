"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, LoaderCircle, RotateCcw } from "lucide-react";
import SwipeCard, { type SwipeDirection } from "@/components/SwipeCard";
import { usePreferences } from "@/components/PreferencesProvider";
import type { SwipeMovie } from "@/lib/swipe-movies";

interface DeckProps {
  initialMovies: SwipeMovie[];
  initialLanguage: "pt-BR" | "en-US";
}

interface SwipeResponse {
  movies?: SwipeMovie[];
  refreshing?: boolean;
  error?: string;
}

export function Deck({ initialMovies, initialLanguage }: DeckProps) {
  const { language, t } = usePreferences();
  const [movies, setMovies] = useState(initialMovies);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoMovie, setUndoMovie] = useState<SwipeMovie | null>(null);
  const loadingRef = useRef(false);
  const exhaustedRef = useRef(false);
  const pageRef = useRef(2);
  const initialLanguageRef = useRef(initialLanguage);
  const activeLanguageRef = useRef(language);
  const pendingSwipes = useRef(new Map<number, Promise<void>>());
  const seenMovieIds = useRef(new Set(initialMovies.map((movie) => movie.id)));
  const detailsRequestedIds = useRef(new Set<number>());
  const fetchMoreRef = useRef<() => Promise<void>>(async () => {});
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRetriesRef = useRef(0);

  const scheduleRefreshRetry = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      void fetchMoreRef.current();
    }, 1500);
  }, []);

  const fetchMore = useCallback(async () => {
    if (loadingRef.current || exhaustedRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    try {
      const exclude = [...seenMovieIds.current].join(",");
      const response = await fetch(
        `/api/swipe?page=${pageRef.current}&exclude=${exclude}&language=${language}`,
      );
      const result = (await response.json()) as SwipeResponse;

      if (!response.ok) {
        throw new Error(result.error ?? t.fetchFailed);
      }

      const moreMovies = result.movies ?? [];
      if (moreMovies.length === 0) {
        if (result.refreshing) {
          refreshRetriesRef.current += 1;
          exhaustedRef.current = refreshRetriesRef.current >= 10;
          if (exhaustedRef.current) {
            setError(t.fetchFailed);
          } else {
            scheduleRefreshRetry();
          }
        } else {
          exhaustedRef.current = true;
        }
        return;
      }

      refreshRetriesRef.current = 0;
      pageRef.current += 1;
      for (const movie of moreMovies) {
        seenMovieIds.current.add(movie.id);
      }
      setMovies((currentMovies) => {
        const currentIds = new Set(currentMovies.map((movie) => movie.id));
        return [
          ...currentMovies,
          ...moreMovies.filter((movie) => !currentIds.has(movie.id)),
        ];
      });
      if (result.refreshing) {
        scheduleRefreshRetry();
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : t.fetchFailed,
      );
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [language, scheduleRefreshRetry, t.fetchFailed]);

  useEffect(() => {
    fetchMoreRef.current = fetchMore;
  }, [fetchMore]);

  useEffect(() => {
    const movieIds = movies
      .filter(
        (movie) =>
          (!movie.overview || !movie.genres?.length) &&
          !detailsRequestedIds.current.has(movie.id),
      )
      .slice(0, 20)
      .map((movie) => movie.id);
    if (movieIds.length === 0) {
      return;
    }

    for (const movieId of movieIds) {
      detailsRequestedIds.current.add(movieId);
    }

    async function enrichCachedMovies() {
      try {
        const response = await fetch(
          `/api/swipe?ids=${movieIds.join(",")}&language=${language}`,
        );
        const result = (await response.json()) as SwipeResponse;
        if (!response.ok) {
          throw new Error(result.error ?? t.fetchFailed);
        }

        const detailsById = new Map(
          (result.movies ?? []).map((movie) => [movie.id, movie]),
        );
        setMovies((currentMovies) =>
          currentMovies.map(
            (movie) => detailsById.get(movie.id) ?? movie,
          ),
        );
      } catch (detailsError) {
        console.error("Could not enrich cached swipe movie details.", detailsError);
        for (const movieId of movieIds) {
          detailsRequestedIds.current.delete(movieId);
        }
      }
    }

    void enrichCachedMovies();
  }, [language, movies, t.fetchFailed]);

  useEffect(
    () => () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialLanguageRef.current === initialLanguage) {
      return;
    }

    initialLanguageRef.current = initialLanguage;
    setMovies(initialMovies);
    seenMovieIds.current = new Set(initialMovies.map((movie) => movie.id));
    pageRef.current = 2;
    exhaustedRef.current = false;
  }, [initialLanguage, initialMovies]);

  useEffect(() => {
    if (activeLanguageRef.current === language) {
      return;
    }

    activeLanguageRef.current = language;
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    refreshRetriesRef.current = 0;
    const controller = new AbortController();

    async function reloadMovies() {
      loadingRef.current = true;
      setIsLoadingMore(true);
      setError(null);

      try {
        const movieIds = movies.map((movie) => movie.id).join(",");
        const endpoint = movieIds
          ? `/api/swipe?ids=${movieIds}&language=${language}`
          : `/api/swipe?page=1&language=${language}`;
        const response = await fetch(
          endpoint,
          { signal: controller.signal },
        );
        const result = (await response.json()) as SwipeResponse;

        if (!response.ok) {
          throw new Error(result.error ?? t.fetchFailed);
        }

        const refreshedMovies = result.movies ?? [];
        setMovies(refreshedMovies);
        seenMovieIds.current = new Set(
          refreshedMovies.map((movie) => movie.id),
        );
        pageRef.current = 2;
        exhaustedRef.current = refreshedMovies.length === 0;
      } catch (reloadError) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          reloadError instanceof Error ? reloadError.message : t.fetchFailed,
        );
      } finally {
        if (!controller.signal.aborted) {
          loadingRef.current = false;
          setIsLoadingMore(false);
        }
      }
    }

    void reloadMovies();
    return () => controller.abort();
  }, [language, movies, t.fetchFailed]);

  useEffect(() => {
    if (movies.length < 3) {
      const timeout = setTimeout(() => void fetchMore(), 0);
      return () => clearTimeout(timeout);
    }
  }, [fetchMore, movies.length]);

  const handleSwipe = useCallback(
    (movie: SwipeMovie, action: SwipeDirection) => {
      setMovies((currentMovies) =>
        currentMovies.filter((item) => item.id !== movie.id),
      );
      seenMovieIds.current.add(movie.id);
      setUndoMovie(movie);
      setError(null);

      const request = fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          action,
          language,
          movie: {
            title: movie.title,
            posterPath: movie.poster_path,
            releaseDate: movie.release_date,
            voteAverage: movie.vote_average,
            genres: movie.genres ?? [],
          },
        }),
      })
        .then(async (response) => {
          const result = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(result.error ?? t.swipeFailed);
          }
        })
        .then(() => undefined)
        .catch((swipeError: unknown) => {
          setError(
            swipeError instanceof Error
              ? swipeError.message
              : t.swipeFailed,
          );
          throw swipeError;
        })
        .finally(() => {
          pendingSwipes.current.delete(movie.id);
        });

      pendingSwipes.current.set(movie.id, request);
      void request.catch(() => {});
    },
    [language, t.swipeFailed],
  );

  const undo = useCallback(async () => {
    if (!undoMovie) {
      return;
    }

    try {
      await pendingSwipes.current.get(undoMovie.id);
      const response = await fetch("/api/swipe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: undoMovie.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? t.undoFailed);
      }
    } catch (undoError) {
      setError(
        undoError instanceof Error
          ? undoError.message
          : t.undoFailed,
      );
      return;
    }

    exhaustedRef.current = false;
    setMovies((currentMovies) => [undoMovie, ...currentMovies]);
    setUndoMovie(null);
  }, [t.undoFailed, undoMovie]);

  return (
    <div className="w-full">
      <div className="relative mx-auto h-[min(74vh,720px)] min-h-[540px] w-full max-w-lg">
        <AnimatePresence initial={false}>
          {movies.slice(0, 3).map((movie, index) => (
            <motion.div
              className="absolute inset-0"
              key={movie.id}
              style={{
                zIndex: 3 - index,
                transform:
                  index === 1
                    ? "translateY(30px) scale(.96)"
                    : index === 2
                      ? "translateY(52px) scale(.92)"
                      : undefined,
              }}
              aria-hidden={index !== 0}
              exit={{
                opacity: 0,
                scale: 0.92,
                transition: { duration: 0.2 },
              }}
            >
              <SwipeCard
                movie={movie}
                onSwipe={(action) => handleSwipe(movie, action)}
                isExpanded={index === 0 && isExpanded}
                onExpandedChange={setIsExpanded}
                disabled={index !== 0}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {movies.length === 0 && !isLoadingMore && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[2rem] border border-zinc-800 bg-zinc-900 px-8 text-center text-zinc-100 shadow-xl shadow-black/30">
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-zinc-800 text-emerald-300">
              <Heart size={24} />
            </span>
            <h2 className="text-xl font-semibold">{t.doneTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {t.doneDescription}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center">
        <button
          aria-label={t.undo}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!undoMovie}
          onClick={() => void undo()}
          type="button"
        >
          <RotateCcw size={15} />
          {t.undo}
        </button>
      </div>
      {error && (
        <p
          className="mx-auto mt-4 max-w-sm text-center text-sm text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
      {isLoadingMore && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="animate-spin" size={16} />
          {t.loadingMore}
        </p>
      )}
    </div>
  );
}
