"use client";

import { usePreferences } from "@/components/PreferencesProvider";

export function DeckSkeleton() {
  const { t } = usePreferences();
  return (
    <div
      aria-label={t.loadingMovies}
      aria-busy="true"
      className="relative isolate flex h-[min(74vh,720px)] min-h-[540px] w-full max-w-lg flex-col justify-end overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 p-7 shadow-2xl"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950" />
      <div className="absolute inset-0 -z-10 animate-[deck-shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="mb-5 h-6 w-28 rounded-full bg-white/[0.08]" />
      <div className="mb-3 h-9 w-4/5 rounded-lg bg-white/[0.1]" />
      <div className="mb-2 h-4 w-2/3 rounded bg-white/[0.07]" />
      <div className="h-4 w-full rounded bg-white/[0.07]" />
      <div className="mt-2 h-4 w-5/6 rounded bg-white/[0.07]" />
      <p className="mt-6 text-sm text-zinc-400">{t.loadingMovies}</p>
    </div>
  );
}
