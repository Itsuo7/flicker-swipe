"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

interface SignInOptionsProps {
  language: "pt-BR" | "en-US";
  callbackUrl?: string;
}

interface ProviderAvailability {
  google: boolean;
  github: boolean;
  secretConfigured: boolean;
}

export function SignInOptions({
  language,
  callbackUrl = "/profile",
}: SignInOptionsProps) {
  const portuguese = language === "pt-BR";
  const [providers, setProviders] = useState<ProviderAvailability | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch("/api/auth-status", { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Provider configuration request failed (${response.status}).`);
          }
          const result = (await response.json()) as {
            providers?: ProviderAvailability;
            secretConfigured?: boolean;
          };
          if (
            typeof result.providers?.google !== "boolean" ||
            typeof result.providers.github !== "boolean" ||
            typeof result.secretConfigured !== "boolean"
          ) {
            throw new Error("Provider configuration response was invalid.");
          }
          setProviders({
            ...result.providers,
            secretConfigured: result.secretConfigured,
          });
          setConfigurationError(null);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          console.error("Could not load OAuth provider configuration.", error);
          setConfigurationError(
            portuguese
              ? "Não foi possível verificar a configuração de login."
              : "Could not check sign-in configuration.",
          );
        });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [portuguese]);

  function beginSignIn(provider: "google" | "github") {
    if (!providers?.secretConfigured || !providers[provider]) {
      return;
    }

    void signIn(provider, { callbackUrl });
  }

  return (
    <div className="space-y-4">
      {configurationError ? (
        <p
          className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
          role="alert"
        >
          {configurationError}
        </p>
      ) : null}

      <div className="grid gap-3">
        <div>
          <button
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-sm font-medium text-zinc-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            disabled={!providers?.secretConfigured || !providers?.google}
            onClick={() => beginSignIn("google")}
            type="button"
          >
            <GoogleIcon />
            {portuguese ? "Continuar com Google" : "Continue with Google"}
          </button>
          {providers && (!providers.secretConfigured || !providers.google) && (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              {portuguese
                ? "Requer chaves OAuth no .env.local"
                : "Requires OAuth keys in .env.local"}
            </p>
          )}
        </div>
        <div>
          <button
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-900 bg-zinc-900 px-4 py-3.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            disabled={!providers?.secretConfigured || !providers?.github}
            onClick={() => beginSignIn("github")}
            type="button"
          >
            <GithubIcon />
            {portuguese ? "Continuar com GitHub" : "Continue with GitHub"}
          </button>
          {providers && (!providers.secretConfigured || !providers.github) && (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              {portuguese
                ? "Requer chaves OAuth no .env.local"
                : "Requires OAuth keys in .env.local"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 48 48">
      <path
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
        fill="#4285F4"
      />
      <path
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
        fill="#34A853"
      />
      <path
        d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"
        fill="#FBBC05"
      />
      <path
        d="M24 12c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"
        fill="#EA4335"
      />
    </svg>
  );
}
