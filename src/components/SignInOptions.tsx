"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";

interface SignInOptionsProps {
  language: "pt-BR" | "en-US";
}

interface ProviderAvailability {
  google: boolean;
  github: boolean;
  secretConfigured: boolean;
}

export function SignInOptions({ language }: SignInOptionsProps) {
  const portuguese = language === "pt-BR";
  const [providers, setProviders] = useState<ProviderAvailability | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch("/api/auth/providers", { signal: controller.signal })
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

    void signIn(provider);
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!providers?.secretConfigured || !providers?.google}
            onClick={() => beginSignIn("google")}
            type="button"
          >
            <GoogleIcon />
            {portuguese ? "Conectar Google" : "Connect Google"}
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
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            disabled={!providers?.secretConfigured || !providers?.github}
            onClick={() => beginSignIn("github")}
            type="button"
          >
            <LogIn aria-hidden="true" size={17} />
            {portuguese ? "Conectar GitHub" : "Connect GitHub"}
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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-[17px]" viewBox="0 0 48 48">
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
