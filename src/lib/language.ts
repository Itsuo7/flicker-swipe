import { defaultLanguage, type Language } from "@/lib/i18n";

export function normalizeLanguage(value: unknown): Language {
  if (typeof value !== "string") {
    return defaultLanguage;
  }

  return value.trim().toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";
}

export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") {
    return defaultLanguage;
  }
  return normalizeLanguage(navigator.language);
}

function preferredAcceptLanguage(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const preferred = value
    .split(",")
    .map((entry) => {
      const [locale, quality] = entry.trim().split(";q=");
      return {
        locale,
        quality: quality === undefined ? 1 : Number(quality),
      };
    })
    .filter(({ locale, quality }) => locale.length > 0 && quality > 0)
    .sort((first, second) => second.quality - first.quality)[0];

  return preferred?.locale ?? null;
}

function cookieLanguage(cookieHeader: string | null): string | null {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("flick-language="));

  if (!cookie) {
    return null;
  }

  try {
    return decodeURIComponent(cookie.slice("flick-language=".length));
  } catch {
    return null;
  }
}

export function detectRequestLanguage(
  headers: Headers,
  explicitLanguage?: unknown,
): Language {
  if (typeof explicitLanguage === "string" && explicitLanguage.trim()) {
    return normalizeLanguage(explicitLanguage);
  }

  const savedLanguage = cookieLanguage(headers.get("cookie"));
  if (savedLanguage) {
    return normalizeLanguage(savedLanguage);
  }

  return normalizeLanguage(preferredAcceptLanguage(headers.get("accept-language")));
}
