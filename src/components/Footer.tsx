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
    <footer className="border-t border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-5 py-6 text-center text-xs sm:px-8">
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
        <p>
          © {year ?? ""} FlickerSwipe. All rights reserved.
        </p>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </div>
    </footer>
  );
}
