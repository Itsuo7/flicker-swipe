"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { Bookmark, Heart, Star, X } from "lucide-react";
import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import type { SwipeMovie } from "@/lib/swipe-movies";
import { usePreferences } from "@/components/PreferencesProvider";
import {
  MovieDetailsModal,
  type MovieDetailAction,
} from "@/components/MovieDetailsModal";

export type SwipeDirection = "LIKE" | "DISLIKE" | "WATCHLATER";

interface SwipeCardProps {
  movie: SwipeMovie;
  onSwipe: (direction: SwipeDirection) => void;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  disabled?: boolean;
}

const swipeThreshold = 105;

const portugueseGenreNames: Record<number, string> = {
  12: "Aventura",
  14: "Fantasia",
  16: "Animação",
  18: "Drama",
  27: "Terror",
  28: "Ação",
  35: "Comédia",
  36: "História",
  37: "Faroeste",
  53: "Suspense",
  80: "Crime",
  99: "Documentário",
  878: "Ficção científica",
  9648: "Mistério",
  10402: "Música",
  10749: "Romance",
  10751: "Família",
  10752: "Guerra",
  10770: "Telefilme",
};

const englishGenreNames: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Sci-fi",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV movie",
};

export default function SwipeCard({
  movie,
  onSwipe,
  isExpanded,
  onExpandedChange,
  disabled = false,
}: SwipeCardProps) {
  const { language, t } = usePreferences();
  const closeDetails = useCallback(
    () => onExpandedChange(false),
    [onExpandedChange],
  );
  const controls = useAnimation();
  const isSwiping = useRef(false);
  const isDragging = useRef(false);
  const dragResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const rotation = useTransform(dragX, [-180, 180], [-14, 14]);
  const likeOpacity = useTransform(dragX, [35, swipeThreshold], [0, 1]);
  const passOpacity = useTransform(dragX, [-swipeThreshold, -35], [1, 0]);
  const saveOpacity = useTransform(dragY, [-swipeThreshold, -35], [1, 0]);
  const releaseYear = movie.release_date.match(/^\d{4}/)?.[0];

  useEffect(
    () => () => {
      if (dragResetTimer.current) {
        clearTimeout(dragResetTimer.current);
      }
    },
    [],
  );

  async function swipe(direction: SwipeDirection) {
    if (isSwiping.current || disabled) {
      return;
    }
    isSwiping.current = true;
    const distance = Math.max(window.innerWidth, window.innerHeight) * 1.2;
    const target =
      direction === "WATCHLATER"
        ? { x: 0, y: -distance, rotate: 0 }
        : {
            x: direction === "LIKE" ? distance : -distance,
            y: 0,
            rotate: direction === "LIKE" ? 16 : -16,
          };

    await controls.start({
      ...target,
      opacity: 0,
      transition: { duration: 0.32, ease: "easeIn" },
    });
    onSwipe(direction);
  }

  async function handleDragEnd(
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const moved = Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5;
    if (moved || isDragging.current) {
      isDragging.current = true;
      if (dragResetTimer.current) {
        clearTimeout(dragResetTimer.current);
      }
      dragResetTimer.current = setTimeout(() => {
        isDragging.current = false;
        dragResetTimer.current = null;
      }, 200);
    }

    if (isSwiping.current || disabled) {
      return;
    }

    const { x, y } = info.offset;
    let direction: SwipeDirection | null = null;

    if (y <= -swipeThreshold && Math.abs(y) > Math.abs(x)) {
      direction = "WATCHLATER";
    } else if (x >= swipeThreshold && Math.abs(x) >= Math.abs(y)) {
      direction = "LIKE";
    } else if (x <= -swipeThreshold && Math.abs(x) >= Math.abs(y)) {
      direction = "DISLIKE";
    }

    if (direction) {
      await swipe(direction);
      return;
    }

    await controls.start({
      x: 0,
      y: 0,
      rotate: 0,
      transition: { type: "spring", stiffness: 350, damping: 28 },
    });
  }

  const genres = (movie.genres ??
    movie.genre_ids
      .map((genreId) =>
        (language === "pt-BR"
          ? portugueseGenreNames
          : englishGenreNames)[genreId],
      )
      .filter((genre): genre is string => Boolean(genre))
  ).slice(0, 3);
  const posterPath = movie.poster_path ?? movie.backdrop_path;

  return (
    <>
    <motion.article
      animate={controls}
      aria-label={`${movie.title}. ${t.movieDetails}`}
      className={`relative h-full w-full cursor-pointer touch-pan-y overflow-hidden rounded-[2rem] bg-slate-950 transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
        disabled
          ? "shadow-2xl shadow-black/40 ring-1 ring-white/15"
          : "shadow-[0_0_36px_rgba(52,211,153,0.2),0_24px_60px_rgba(0,0,0,0.5)] ring-2 ring-emerald-400/65"
      }`}
      drag={disabled ? false : true}
      dragConstraints={{ left: -180, right: 180, top: -180, bottom: 90 }}
      dragElastic={0.72}
      onDragStart={() => {
        isDragging.current = true;
        if (dragResetTimer.current) {
          clearTimeout(dragResetTimer.current);
          dragResetTimer.current = null;
        }
      }}
      onDragEnd={handleDragEnd}
      onClick={(event) => {
        if (
          !disabled &&
          !isDragging.current &&
          !(
            event.target instanceof Element &&
            event.target.closest("button")
          )
        ) {
          onExpandedChange(true);
        }
      }}
      onKeyDown={(event) => {
        if (
          !disabled &&
          (event.key === "Enter" || event.key === " ") &&
          !(event.target instanceof Element && event.target.closest("button"))
        ) {
          event.preventDefault();
          onExpandedChange(true);
        }
      }}
      role="group"
      style={{ x: dragX, y: dragY, rotate: rotation }}
      tabIndex={disabled ? -1 : 0}
      whileDrag={{ scale: 1.025 }}
    >
      {posterPath ? (
        <Image
          alt={`${language === "pt-BR" ? "Pôster de" : "Poster for"} ${movie.title}`}
          className="h-full w-full object-cover object-center"
          fill
          priority={!disabled}
          sizes="(max-width: 640px) 92vw, 430px"
          src={`https://image.tmdb.org/t/p/w780${posterPath}`}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#52776b,_#182622_65%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/10 to-slate-950/95" />

      <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
        <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-md">
          {t.discoverToday}
        </span>
        {movie.vote_average > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-white/25 bg-black/30 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            <Star className="text-amber-300" fill="currentColor" size={13} />
            {movie.vote_average.toFixed(1)}
          </span>
        )}
      </div>

      <motion.div
        className="pointer-events-none absolute left-5 top-20 rotate-[-12deg] rounded-lg border-[3px] border-emerald-300 px-3 py-1 text-2xl font-black uppercase tracking-widest text-emerald-300"
        style={{ opacity: likeOpacity }}
      >
        {t.like}
      </motion.div>
      <motion.div
        className="pointer-events-none absolute right-5 top-20 rotate-[12deg] rounded-lg border-[3px] border-rose-300 px-3 py-1 text-2xl font-black uppercase tracking-widest text-rose-300"
        style={{ opacity: passOpacity }}
      >
        {t.discard}
      </motion.div>
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-20 text-center text-2xl font-black uppercase tracking-widest text-amber-200"
        style={{ opacity: saveOpacity }}
      >
        {t.watchLaterShort}
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 px-6 pb-6 pt-36 text-white sm:px-8 sm:pb-8">
        {genres.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {genres.map((genre) => (
              <span
                className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/90 backdrop-blur"
                key={genre}
              >
                {genre}
              </span>
            ))}
          </div>
        )}
        <h2 className="text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-4xl">
          {movie.title}
        </h2>
        <p className="mt-2 text-sm font-medium text-white/65">
          {releaseYear ?? t.fallbackYear}
        </p>
        <div className="mt-4 rounded-2xl border border-white/15 bg-slate-950/40 p-4 shadow-lg shadow-black/10 backdrop-blur-xl">
          <p className="line-clamp-4 text-sm leading-6 tracking-[0.005em] text-white/90">
            {movie.overview || t.fallbackOverview}
          </p>
        </div>
        <div className="mt-5 flex items-center justify-center gap-3 border-t border-white/15 pt-5">
          <CardAction
            label={t.discard}
            className="text-rose-200 hover:border-rose-300/50 hover:bg-rose-500/20"
            disabled={disabled}
            onClick={() => void swipe("DISLIKE")}
          >
            <X size={21} strokeWidth={2.5} />
          </CardAction>
          <CardAction
            label={t.like}
            className="text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-500/20"
            disabled={disabled}
            onClick={() => void swipe("LIKE")}
          >
            <Heart fill="currentColor" size={20} />
          </CardAction>
          <CardAction
            label={t.watchLater}
            className="text-amber-200 hover:border-amber-300/50 hover:bg-amber-500/20"
            disabled={disabled}
            onClick={() => void swipe("WATCHLATER")}
          >
            <Bookmark size={18} />
          </CardAction>
        </div>
      </div>
    </motion.article>
    {isExpanded && (
      <MovieDetailsModal
        movieId={movie.id}
        onClose={closeDetails}
        onAction={(action: MovieDetailAction) => void swipe(action)}
      />
    )}
    </>
  );
}

interface CardActionProps {
  children: React.ReactNode;
  className: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
}

function CardAction({
  children,
  className,
  disabled,
  label,
  onClick,
}: CardActionProps) {
  return (
    <button
      aria-label={label}
      className={`grid size-11 place-items-center rounded-full border border-white/25 bg-white/10 transition hover:scale-105 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      {children}
    </button>
  );
}
