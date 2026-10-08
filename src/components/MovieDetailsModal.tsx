"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Heart, LoaderCircle, Star, X } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import type { TMDBExpandedMovieDetails } from "@/lib/tmdb";

export type MovieDetailAction = "DISLIKE" | "LIKE" | "WATCHLATER";

interface MovieDetailsModalProps {
  movieId: number;
  onClose: () => void;
  onAction?: (action: MovieDetailAction) => void;
}

const emptySubscribe = () => () => {};
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;

export function MovieDetailsModal({
  movieId,
  onClose,
  onAction,
}: MovieDetailsModalProps) {
  const { language, t } = usePreferences();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getMountedSnapshot,
    getServerSnapshot,
  );
  const [detailsResult, setDetailsResult] = useState<{
    language: string;
    details: TMDBExpandedMovieDetails;
  } | null>(null);
  const [errorResult, setErrorResult] = useState<{
    language: string;
    message: string;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showTrailer, setShowTrailer] = useState(!onAction);
  const pendingAction = useRef<MovieDetailAction | null>(null);
  const close = useCallback(() => setIsVisible(false), []);
  const requestAction = useCallback(
    (action: MovieDetailAction) => {
      if (!onAction || pendingAction.current) {
        return;
      }
      pendingAction.current = action;
      setIsVisible(false);
    },
    [onAction],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadDetails() {
      try {
        const response = await fetch(
          `/api/movies/${movieId}?language=${language}`,
          { signal: controller.signal },
        );
        const result = (await response.json()) as {
          error?: string;
          id?: number;
        } & Partial<TMDBExpandedMovieDetails>;
        if (!response.ok || typeof result.id !== "number") {
          throw new Error(result.error ?? t.detailsFailed);
        }
        setDetailsResult({
          language,
          details: result as TMDBExpandedMovieDetails,
        });
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        setErrorResult({
          language,
          message:
            loadError instanceof Error ? loadError.message : t.detailsFailed,
        });
      }
    }

    void loadDetails();
    return () => controller.abort();
  }, [language, movieId, t.detailsFailed]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (
        onAction &&
        (event.key === "ArrowLeft" ||
          event.key === "ArrowRight")
      ) {
        event.preventDefault();
        requestAction(event.key === "ArrowLeft" ? "DISLIKE" : "LIKE");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setShowTrailer((current) => !current);
      } else if (
        event.key === " " &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest("button, a, input, textarea, select")
        )
      ) {
        event.preventDefault();
        setShowTrailer((current) => !current);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, onAction, requestAction]);

  if (!mounted) {
    return null;
  }
  const details =
    detailsResult?.language === language ? detailsResult.details : null;
  const error =
    errorResult?.language === language ? errorResult.message : null;

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        const action = pendingAction.current;
        if (action) {
          pendingAction.current = null;
          onAction?.(action);
          return;
        }
        onClose();
      }}
    >
      {isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <motion.section
            animate={{ y: 0, opacity: 1 }}
            aria-labelledby="movie-details-title"
            aria-modal="true"
            className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-2xl sm:rounded-3xl"
            exit={{ y: 30, opacity: 0 }}
            initial={{ y: 30, opacity: 0 }}
            role="dialog"
            transition={{ duration: 0.2 }}
          >
            <button
              aria-label={t.close}
              autoFocus
              className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/80"
              onClick={close}
              type="button"
            >
              <X size={19} />
            </button>

            {details ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <MovieDetailContent
                  details={details}
                  onHeaderSwipe={onAction ? requestAction : undefined}
                  showTrailer={showTrailer}
                />
              </div>
            ) : error ? (
              <div className="flex min-h-80 items-center justify-center p-8 text-center text-red-300">
                {error}
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-zinc-300">
                <LoaderCircle className="animate-spin text-emerald-400" size={20} />
                {t.loadingDetails}
              </div>
            )}
            {details && (
              <>
                {details.trailerKey && (
                  <button
                    className="absolute bottom-[76px] right-4 z-20 rounded-full border border-white/20 bg-black/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-black"
                    onClick={() => setShowTrailer((current) => !current)}
                    type="button"
                  >
                    {showTrailer ? t.showDetails : t.showTrailer}
                  </button>
                )}
                {onAction && (
                  <div className="sticky bottom-0 z-10 flex shrink-0 justify-center gap-5 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
                    <ModalActionButton
                      label={t.discard}
                      onClick={() => requestAction("DISLIKE")}
                      tone="rose"
                    >
                      <X size={22} strokeWidth={2.5} />
                    </ModalActionButton>
                    <ModalActionButton
                      label={t.watchLater}
                      onClick={() => requestAction("WATCHLATER")}
                      tone="amber"
                    >
                      <Bookmark size={20} />
                    </ModalActionButton>
                    <ModalActionButton
                      label={t.like}
                      onClick={() => requestAction("LIKE")}
                      tone="emerald"
                    >
                      <Heart fill="currentColor" size={21} />
                    </ModalActionButton>
                  </div>
                )}
              </>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function MovieDetailContent({
  details,
  onHeaderSwipe,
  showTrailer,
}: {
  details: TMDBExpandedMovieDetails;
  onHeaderSwipe?: (action: MovieDetailAction) => void;
  showTrailer: boolean;
}) {
  const { t } = usePreferences();
  const releaseYear = details.release_date.match(/^\d{4}/)?.[0];

  return (
    <>
      <motion.div
        className="relative h-52 touch-pan-y bg-zinc-900 sm:h-72"
        drag={onHeaderSwipe ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.65}
        onDragEnd={(_, info) => {
          if (info.offset.x <= -90) {
            onHeaderSwipe?.("DISLIKE");
          } else if (info.offset.x >= 90) {
            onHeaderSwipe?.("LIKE");
          } else if (info.offset.y <= -90) {
            onHeaderSwipe?.("WATCHLATER");
          }
        }}
      >
        {details.backdrop_path && (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            src={`https://image.tmdb.org/t/p/w1280${details.backdrop_path}`}
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-black/10" />
      </motion.div>

      <div className="relative -mt-24 grid gap-6 px-5 pb-7 sm:-mt-32 sm:grid-cols-[190px_minmax(0,1fr)] sm:px-8 sm:pb-9">
        <div className="relative aspect-[2/3] w-32 overflow-hidden rounded-xl bg-zinc-800 shadow-xl sm:w-full">
          {details.poster_path ? (
            <Image
              alt={`${t.posterFor} ${details.title}`}
              className="object-cover"
              fill
              sizes="(max-width: 640px) 128px, 190px"
              src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
              unoptimized
            />
          ) : (
            <div className="grid h-full place-items-center p-3 text-center text-sm">
              {details.title}
            </div>
          )}
        </div>

        <div className="min-w-0 pt-2 sm:pt-20">
          <h2
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            id="movie-details-title"
          >
            {details.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
            {releaseYear && <span>{releaseYear}</span>}
            {details.runtime !== null && details.runtime > 0 && (
              <span>
                {t.runtime}: {details.runtime} {t.minutes}
              </span>
            )}
            {details.vote_average > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star
                  className="text-amber-300"
                  fill="currentColor"
                  size={15}
                />
                {details.vote_average.toFixed(1)}
              </span>
            )}
          </div>
          {details.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {details.genres.map((genre) => (
                <span
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                  key={genre.id}
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-5 max-h-[60vh] overflow-y-auto whitespace-pre-line text-sm leading-7 text-zinc-300">
            {details.overview || t.fallbackOverview}
          </p>
        </div>

        <div className="space-y-6 sm:col-span-2">
          <section>
            <h3 className="text-sm font-semibold text-zinc-100">{t.cast}</h3>
            {details.cast.length ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {details.cast.map((person) => (
                  <div className="w-24 shrink-0" key={person.id}>
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800">
                      {person.profile_path && (
                        <Image
                          alt={person.name}
                          className="object-cover"
                          fill
                          sizes="96px"
                          src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                          unoptimized
                        />
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs font-medium">
                      {person.name}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {person.character}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">{t.noCast}</p>
            )}
          </section>

          {details.trailerKey && showTrailer ? (
            <section>
              <h3 className="mb-3 text-sm font-semibold">{t.trailer}</h3>
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(details.trailerKey)}`}
                  title={`${details.title} — ${t.trailer}`}
                />
              </div>
            </section>
          ) : !details.trailerKey ? (
            <p className="text-sm text-zinc-400">{t.noTrailer}</p>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold">{t.whereToWatch}</h3>
            {details.providers.length ? (
              <div className="mt-3 space-y-3">
                {details.providers.map(({ type, results }) => (
                  <div
                    className="flex flex-wrap items-center gap-3"
                    key={type}
                  >
                    <span className="w-24 text-xs capitalize text-zinc-400">
                      {type === "flatrate"
                        ? t.streaming
                        : type === "free"
                          ? t.free
                          : type === "ads"
                            ? t.ads
                            : type === "rent"
                              ? t.rent
                              : t.buy}
                    </span>
                    {results.map((provider) => (
                      <div
                        className="flex items-center gap-2 text-xs"
                        key={provider.provider_id}
                      >
                        {provider.logo_path && (
                          <Image
                            alt=""
                            className="rounded-md"
                            height={26}
                            src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                            sizes="26px"
                            unoptimized
                            width={26}
                          />
                        )}
                        {provider.provider_name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">{t.noProviders}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function ModalActionButton({
  children,
  label,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: "rose" | "amber" | "emerald";
}) {
  const toneClass = {
    rose: "border-rose-300/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/25",
    amber: "border-amber-300/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/25",
    emerald:
      "border-emerald-300/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30",
  }[tone];

  return (
    <button
      aria-label={label}
      className={`grid size-12 place-items-center rounded-full border transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${toneClass}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
