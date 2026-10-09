"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bookmark,
  ChevronDown,
  Clapperboard,
  Film,
  Moon,
  Sun,
  Upload,
  UserRound,
} from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const { language, setLanguage, theme, toggleTheme, t } = usePreferences();
  const links = [
    { href: "/", label: t.discover, icon: Clapperboard },
    { href: "/watchlist", label: t.watchlist, icon: Bookmark },
    { href: "/upload", label: t.importImdb, icon: Upload },
  ];
  const profileActive = pathname.startsWith("/profile");

  return (
    <nav
      aria-label={t.navLabel}
      className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-2 sm:h-[68px] sm:gap-4 sm:px-8">
        <Link
          aria-label="FlickerSwipe home"
          className="flex shrink-0 items-center gap-2.5"
          href="/"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-950/80">
            <Film
              aria-hidden="true"
              className="text-emerald-400"
              size={22}
              strokeWidth={2}
            />
          </span>
          <span className="hidden text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 min-[820px]:inline">
            FlickerSwipe
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:justify-start sm:gap-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex size-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition lg:w-auto lg:px-4 ${
                  active
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />
                <span className="hidden lg:inline">{label}</span>
                <span className="sr-only lg:hidden">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {status === "unauthenticated" && (
            <Link
              className="hidden h-8 items-center rounded-full bg-emerald-500 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 sm:inline-flex sm:text-sm"
              href="/login"
            >
              {language === "pt-BR" ? "Entrar" : "Sign in"}
            </Link>
          )}          <div className="relative">
            <label className="sr-only" htmlFor="language-switcher">
              {t.languageLabel}
            </label>
            <select
              className="h-8 cursor-pointer appearance-none rounded-full border border-zinc-200 bg-zinc-50 pl-2.5 pr-6 text-xs font-medium text-zinc-800 outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:text-sm"
              id="language-switcher"
              onChange={(event) => {
                const nextLanguage =
                  event.target.value === "en-US" ? "en-US" : "pt-BR";
                setLanguage(nextLanguage);
                if (pathname.startsWith("/watchlist")) {
                  router.refresh();
                }
              }}
              value={language}
            >
              <option value="pt-BR">PT</option>
              <option value="en-US">EN</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
            />
          </div>
          <button
            aria-label={theme === "dark" ? t.themeToLight : t.themeToDark}
            className="grid size-11 place-items-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
            onClick={toggleTheme}
            title={theme === "dark" ? t.themeToLight : t.themeToDark}
            type="button"
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" className="size-6" />
            ) : (
              <Moon aria-hidden="true" className="size-6" />
            )}
          </button>
          <Link
            aria-current={profileActive ? "page" : undefined}
            aria-label={t.profile}
            className={`grid size-11 place-items-center rounded-xl transition ${
              profileActive
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            }`}
            href="/profile"
          >
            <UserRound aria-hidden="true" className="size-6" strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
