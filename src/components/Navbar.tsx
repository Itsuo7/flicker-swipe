"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  Clapperboard,
  Languages,
  Moon,
  Sun,
  Upload,
  UserRound,
} from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, theme, toggleTheme, t } = usePreferences();
  const links = [
    { href: "/", label: t.discover, icon: Clapperboard },
    { href: "/watchlist", label: t.watchlist, icon: Bookmark },
    { href: "/profile", label: t.profile, icon: UserRound },
    { href: "/upload", label: t.importImdb, icon: Upload },
  ];

  return (
    <nav
      aria-label={t.navLabel}
      className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between px-3 sm:px-8">
        <Link
          aria-label="FlickerSwipe home"
          className="flex items-center gap-2.5"
          href="/"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-950/80">
            <Clapperboard
              aria-hidden="true"
              className="text-emerald-400"
              size={19}
              strokeWidth={2}
            />
          </span>
          <span className="hidden text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 min-[820px]:inline">
            FlickerSwipe
          </span>
        </Link>

        <div className="flex h-full items-center gap-1 sm:gap-2">
          <div className="flex h-full items-center gap-1 sm:gap-2">
            {links.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center gap-2 rounded-xl px-1 text-xs font-medium transition lg:px-4 lg:text-sm ${
                    active
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  href={href}
                  key={href}
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                  <span className="hidden lg:inline">{label}</span>
                  <span className="sr-only lg:hidden">{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="ml-1 flex items-center gap-1 border-l border-zinc-200 pl-2 dark:border-zinc-800 sm:ml-2 sm:gap-2 sm:pl-3">
            <label className="sr-only" htmlFor="language-switcher">
              {t.languageLabel}
            </label>
            <Languages
              aria-hidden="true"
              className="hidden text-zinc-500 dark:text-zinc-400 sm:block"
              size={16}
            />
            <select
              className="h-9 max-w-[76px] rounded-lg border border-zinc-300 bg-white px-1 text-xs font-medium text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:max-w-none sm:px-2"
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
              <option value="pt-BR">PT-BR</option>
              <option value="en-US">EN</option>
            </select>
            <button
              aria-label={theme === "dark" ? t.themeToLight : t.themeToDark}
              className="grid size-9 place-items-center rounded-lg text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              onClick={toggleTheme}
              title={theme === "dark" ? t.themeToLight : t.themeToDark}
              type="button"
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" size={18} />
              ) : (
                <Moon aria-hidden="true" size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
