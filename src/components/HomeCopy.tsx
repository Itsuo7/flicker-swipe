"use client";

import Link from "next/link";
import { usePreferences } from "@/components/PreferencesProvider";

export function HomeCopy({
  variant,
}: {
  variant: "desktop" | "mobile" | "instructions" | "sign-in";
}) {
  const { t } = usePreferences();

  if (variant === "desktop") {
    return (
      <div className="hidden lg:block">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
          {t.homeEyebrow}
        </p>
        <h1 className="max-w-sm text-5xl font-semibold leading-[1.08] tracking-[-0.06em]">
          {t.homeTitle}
        </h1>
        <p className="mt-5 max-w-xs text-base leading-7 text-zinc-600 dark:text-zinc-400">
          {t.homeDescription}
        </p>
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div className="mb-2 shrink-0 text-center lg:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 sm:text-xs">
          {t.homeEyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.05em] sm:text-3xl">
          {t.homeMobileTitle}
        </h1>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-zinc-600 dark:text-zinc-400 sm:text-sm sm:leading-6">
          {t.homeDescription}
        </p>
      </div>
    );
  }

  if (variant === "sign-in") {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold tracking-tight">
          {t.signInToSwipe}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {t.connectAccountToSwipe}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          {t.profile}
        </Link>
      </div>
    );
  }

  return (
    <aside className="hidden justify-self-end lg:block">
      <div className="max-w-[230px] border-l border-zinc-300 pl-5 dark:border-zinc-700">
        <p className="text-sm font-semibold">{t.howItWorks}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {t.howItWorksDescription}
        </p>
      </div>
    </aside>
  );
}
