"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  Heart,
  LoaderCircle,
  Star,
  Trash2,
} from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";

export type WatchlistAction = "LIKE" | "WATCHLATER";

export interface WatchlistMovie {
  id: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  voteAverage: number | null;
  genres: string[];
  action: WatchlistAction;
}

export function WatchlistHeader() {
  const { t } = usePreferences();

  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
          {t.collection}
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          {t.watchlistTitle}
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {t.watchlistDescription}
        </p>
      </div>
      <span className="mb-1 hidden size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 sm:grid">
        <Bookmark size={21} />
      </span>
    </div>
  );
}

export function WatchlistLoading() {
  const { t } = usePreferences();

  return (
    <div className="flex min-h-[300px] items-center justify-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
      <LoaderCircle className="animate-spin text-emerald-700 dark:text-emerald-400" size={20} />
      {t.loadingCollection}
    </div>
  );
}

interface WatchlistGridProps {
  movies: WatchlistMovie[];
}

export function WatchlistGrid({ movies: initialMovies }: WatchlistGridProps) {
  const { t } = usePreferences();
  const [movies, setMovies] = useState(initialMovies);
  const [activeTab, setActiveTab] = useState<WatchlistAction>("LIKE");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const closeDetails = useCallback(() => setSelectedMovieId(null), []);
  const filteredMovies = movies.filter((movie) => movie.action === activeTab);

  async function removeMovie(movieId: number) {
    setRemovingId(movieId);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/swipe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? t.removeFailed);
      }

      setMovies((currentMovies) =>
        currentMovies.filter((movie) => movie.id !== movieId),
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : t.removeFailed,
      );
    } finally {
      setRemovingId(null);
    }
  }

  async function addToWatchlist(movieId: number) {
    setAddingId(movieId);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, action: "WATCHLATER" }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? t.addToWatchlistFailed);
      }

      setMovies((currentMovies) =>
        currentMovies.map((movie) =>
          movie.id === movieId ? { ...movie, action: "WATCHLATER" } : movie,
        ),
      );
      setStatus(t.addedToWatchlist);
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : t.addToWatchlistFailed,
      );
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-6">
          <TabButton
            active={activeTab === "LIKE"}
            count={movies.filter((movie) => movie.action === "LIKE").length}
            icon={<Heart size={16} />}
            label={t.like}
            onClick={() => setActiveTab("LIKE")}
          />
          <TabButton
            active={activeTab === "WATCHLATER"}
            count={
              movies.filter((movie) => movie.action === "WATCHLATER").length
            }
            icon={<Bookmark size={15} />}
            label={t.watchLater}
            onClick={() => setActiveTab("WATCHLATER")}
          />
        </div>
      </div>

      {error && (
        <p
          className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}
      {status && (
        <p
          className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          role="status"
        >
          {status}
        </p>
      )}

      {filteredMovies.length > 0 ? (
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {filteredMovies.map((movie, index) => (
            <article
              aria-label={`${movie.title}. ${t.movieDetails}`}
              className="group min-w-0 cursor-pointer"
              key={movie.id}
              onClick={(event) => {
                if (
                  !(event.target instanceof Element) ||
                  !event.target.closest("button")
                ) {
                  setSelectedMovieId(movie.id);
                }
              }}
              onKeyDown={(event) => {
                if (
                  (event.key === "Enter" || event.key === " ") &&
                  !(event.target instanceof Element &&
                    event.target.closest("button"))
                ) {
                  event.preventDefault();
                  setSelectedMovieId(movie.id);
                }
              }}
              role="group"
              tabIndex={0}
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-200 shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-zinc-950/15 dark:bg-zinc-900 dark:group-hover:shadow-black/40">
                {movie.posterPath ? (
                  <Image
                    alt={`${t.posterFor} ${movie.title}`}
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    fill
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 220px"
                    src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#638176] to-[#203c35] px-5 text-center text-lg font-semibold text-white">
                    {movie.title}
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent p-3 pt-12">
                  <span className="text-xs font-medium text-white/90">
                    {movie.year ?? t.unknownYear}
                  </span>
                  {movie.voteAverage !== null && movie.voteAverage > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      <Star
                        aria-hidden="true"
                        className="text-amber-300"
                        fill="currentColor"
                        size={12}
                      />
                      {movie.voteAverage.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="absolute right-2.5 top-2.5 flex gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  {movie.action === "LIKE" && (
                    <button
                      aria-label={`${t.addToWatchlist}: ${movie.title}`}
                      className="grid size-9 place-items-center rounded-full border border-emerald-200/40 bg-black/60 text-emerald-200 backdrop-blur transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={addingId === movie.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void addToWatchlist(movie.id);
                      }}
                      title={t.addToWatchlist}
                      type="button"
                    >
                      {addingId === movie.id ? (
                        <LoaderCircle className="animate-spin" size={17} />
                      ) : (
                        <BookmarkPlus size={17} />
                      )}
                    </button>
                  )}
                  {movie.action === "WATCHLATER" && (
                    <span
                      aria-label={t.addedToWatchlist}
                      className="grid size-9 place-items-center rounded-full border border-emerald-300/50 bg-emerald-900/80 text-emerald-200"
                      title={t.addedToWatchlist}
                    >
                      <BookmarkCheck size={17} />
                    </span>
                  )}
                  <button
                    aria-label={`${t.remove} ${movie.title} ${activeTab === "LIKE" ? t.removeLiked : t.removeWatchLater}`}
                    className="grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={removingId === movie.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeMovie(movie.id);
                    }}
                    type="button"
                  >
                    {removingId === movie.id ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>

              <h2 className="mt-3 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100 sm:text-base">
                {movie.title}
              </h2>
              <p className="mt-1 min-h-4 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {movie.genres.length > 0
                  ? movie.genres.slice(0, 3).join(" · ")
                  : " "}
              </p>
              {selectedMovieId === movie.id && (
                <MovieDetailsModal
                  movieId={movie.id}
                  onClose={closeDetails}
                />
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {activeTab === "LIKE" ? <Heart size={22} /> : <Bookmark size={21} />}
          </span>
          <h2 className="mt-4 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            {activeTab === "LIKE"
              ? t.emptyLiked
              : t.emptyWatchLater}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {t.emptyWatchlistDescription}
          </p>
        </div>
      )}
    </section>
  );
}

interface TabButtonProps {
  active: boolean;
  count: number;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function TabButton({ active, count, icon, label, onClick }: TabButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition ${
        active
          ? "border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300"
          : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] ${
          active
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
