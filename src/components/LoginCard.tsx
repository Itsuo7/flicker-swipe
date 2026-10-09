"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { SignInOptions } from "@/components/SignInOptions";

interface LoginCardProps {
  callbackUrl: string;
  hasError: boolean;
}

export function LoginCard({ callbackUrl, hasError }: LoginCardProps) {
  const { language } = usePreferences();
  const portuguese = language === "pt-BR";
  const [isStarting, setIsStarting] = useState(false);
  const [guestError, setGuestError] = useState(false);

  async function continueAsGuest() {
    setIsStarting(true);
    setGuestError(false);
    try {
      const response = await fetch("/api/guest", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Guest request failed (${response.status}).`);
      }
      localStorage.setItem("isGuest", "true");
      // Full navigation so server components re-read the new guest cookie.
      window.location.assign(callbackUrl);
    } catch (error) {
      console.error("Could not start guest mode.", error);
      setGuestError(true);
      setIsStarting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[#f5f2ed] px-4 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-lg shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-emerald-950/80">
          <Film aria-hidden="true" className="text-emerald-400" size={24} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {portuguese ? "Bem-vindo ao FlickerSwipe" : "Welcome to FlickerSwipe"}
        </h1>
        <p className="mb-6 mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {portuguese
            ? "Entre para associar suas listas ao seu perfil."
            : "Sign in to associate your lists with your profile."}
        </p>
        {hasError && (
          <p
            className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
            role="alert"
          >
            {portuguese
              ? "Não foi possível entrar. Tente novamente."
              : "Could not sign you in. Please try again."}
          </p>
        )}
        <SignInOptions callbackUrl={callbackUrl} language={language} />
        {guestError && (
          <p
            className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
            role="alert"
          >
            {portuguese
              ? "Não foi possível iniciar o modo convidado."
              : "Could not start guest mode."}
          </p>
        )}
        <button
          className="mt-6 inline-block text-sm text-zinc-500 underline-offset-4 transition hover:text-zinc-900 hover:underline disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          disabled={isStarting}
          onClick={() => void continueAsGuest()}
          type="button"
        >
          {portuguese ? "Continuar como convidado" : "Continue as guest"}
        </button>
      </section>
    </main>
  );
}
