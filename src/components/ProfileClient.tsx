"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Film } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import type { Language } from "@/lib/i18n";
import { SignInOptions } from "@/components/SignInOptions";

interface ProfileData {
  profile: {
    username: string;
    email: string;
    createdAt: string | null;
  };
  stats: {
    ratings: number;
    liked: number;
    watchLater: number;
    watchlist: number;
    swipes: number;
  };
  topGenres: { id: number; name: string; count: number }[];
}

export function ProfileClient() {
  const { language, t } = usePreferences();
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadProfile = useCallback(async (selectedLanguage: Language) => {
    try {
      const response = await fetch(`/api/profile?language=${selectedLanguage}`);
      const result = (await response.json()) as ProfileData & {
        error?: string;
      };
      if (!response.ok || result.error) {
        throw new Error(result.error ?? t.profileLoadFailed);
      }
      setData(result);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t.profileLoadFailed,
      );
    }
  }, [t.profileLoadFailed]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile(language);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [language, loadProfile]);

  async function clearRatings() {
    if (!window.confirm(t.clearBaseConfirm)) {
      return;
    }

    setIsClearing(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/profile", { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? t.clearFailed);
      }
      setMessage(t.clearSuccess);
      setSelectedGenre(null);
      await loadProfile(language);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : t.clearFailed);
    } finally {
      setIsClearing(false);
    }
  }

  async function resetActivity() {
    if (!window.confirm(t.resetActivityConfirm)) {
      return;
    }

    setIsResetting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/user/reset", { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? t.resetActivityFailed);
      }

      setData((current) =>
        current
          ? {
              ...current,
              stats: {
                ratings: 0,
                liked: 0,
                watchLater: 0,
                watchlist: 0,
                swipes: 0,
              },
              topGenres: [],
            }
          : current,
      );
      setSelectedGenre(null);
      setMessage(t.resetActivitySuccess);
      router.refresh();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : t.resetActivityFailed,
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="flex-1 bg-[#f5f2ed] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-5 py-10 sm:px-8 sm:py-14">
        {!session && (
          <div
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
            role="status"
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-emerald-500" />
            {language === "pt-BR" ? "Modo Convidado" : "Guest Mode"}
          </div>
        )}
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800 dark:text-emerald-300">
            {t.profile}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {session?.user.image ? (
                <Image
                  alt=""
                  className="size-14 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
                  height={56}
                  src={session.user.image}
                  sizes="56px"
                  unoptimized
                  width={56}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="grid size-14 place-items-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                >
                  {(session?.user.name ?? session?.user.email ?? "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {session?.user.name ?? data?.profile.username ?? t.profileTitle}
                </h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {session?.user.email ?? data?.profile.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {data?.profile.createdAt && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t.member}{" "}
                  {new Intl.DateTimeFormat(language, {
                    year: "numeric",
                    month: "long",
                  }).format(new Date(data.profile.createdAt))}
                </p>
              )}
              {session && (
                <button
                  className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => void signOut({ redirectTo: "/" })}
                  type="button"
                >
                  {language === "pt-BR" ? "Sair" : "Sign out"}
                </button>
              )}
            </div>
          </div>
        </header>

        {!session && (
          <section className="mx-auto w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-lg shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-emerald-950/80">
              <Film aria-hidden="true" className="text-emerald-400" size={24} />
            </span>
            <h2 className="text-xl font-semibold">
              {language === "pt-BR" ? "Conecte suas contas" : "Connect your accounts"}
            </h2>
            <p className="mb-6 mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {language === "pt-BR"
                ? "O Modo Convidado tem acesso completo. Conecte uma conta para associar suas listas ao seu perfil."
                : "Guest Mode has full access. Connect an account to associate your lists with your profile."}
            </p>
            <SignInOptions language={language} />
          </section>
        )}

        {error && (
          <p
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
            role="status"
          >
            {message}
          </p>
        )}

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{t.tasteTitle}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t.tasteDescription}
              </p>
            </div>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {data?.stats.ratings ?? "—"} {t.activeRatings}
            </span>
          </div>
          {data?.topGenres.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {data.topGenres.map((genre) => (
                <button
                  aria-pressed={selectedGenre === genre.id}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selectedGenre === genre.id
                      ? "border-emerald-700 bg-emerald-800 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-zinc-950"
                      : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                  key={genre.id}
                  onClick={() =>
                    setSelectedGenre((current) =>
                      current === genre.id ? null : genre.id,
                    )
                  }
                  type="button"
                >
                  {genre.name}
                  <span className="ml-2 text-xs opacity-70">{genre.count}</span>
                </button>
              ))}
            </div>
          ) : data ? (
            <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
              {t.noTaste}
            </p>
          ) : (
            <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
              {t.statusLoading}
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <h2 className="text-xl font-semibold">{t.activeBase}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                <strong className="text-2xl text-zinc-900 dark:text-zinc-100">
                  {data?.stats.ratings ?? "—"}
                </strong>{" "}
                {t.ratingCount.toLowerCase()}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                href="/upload"
              >
                {t.reimportCsv}
              </Link>
              <button
                className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                disabled={isClearing || !data?.stats.ratings}
                onClick={() => void clearRatings()}
                type="button"
              >
                {isClearing ? t.importing : t.clearBase}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <h2 className="text-xl font-semibold">{t.accountSettings}</h2>
          <button
            className="mt-5 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
            disabled={isResetting || (!data?.stats.swipes && !data?.stats.ratings)}
            onClick={() => void resetActivity()}
            type="button"
          >
            {isResetting ? t.resettingActivity : t.resetActivity}
          </button>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">{t.activity}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t.likedCount} value={data?.stats.liked} />
            <StatCard label={t.collection} value={data?.stats.watchlist} />
            <StatCard label={t.totalSwipes} value={data?.stats.swipes} />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value ?? "—"}</p>
    </div>
  );
}
