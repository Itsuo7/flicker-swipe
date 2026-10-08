"use client";

import { useEffect, useState } from "react";

export function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setYear(new Date().getFullYear()),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <footer className="shrink-0 border-t border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-1 px-4 py-2 text-center text-xs leading-4 sm:gap-3 sm:px-8 sm:py-6">
        <p>
          Built with <span aria-label="love">❤️</span> by{" "}
          <a
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
            href="https://github.com/Itsuo7"
            rel="noopener noreferrer"
            target="_blank"
          >
            Theo Yoshimura
          </a>
        </p>
        <p className="hidden sm:block">
          © {year ?? ""} FlickerSwipe. All rights reserved.
        </p>
        <p className="hidden sm:block">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </div>
    </footer>
  );
}
