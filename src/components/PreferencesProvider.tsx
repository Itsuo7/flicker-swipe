"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  defaultLanguage,
  isLanguage,
  messages,
  type Language,
  type Theme,
} from "@/lib/i18n";
import { detectBrowserLanguage } from "@/lib/language";

interface PreferencesContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (typeof messages)[Language];
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);
const preferencesChangedEvent = "flick:preferences-changed";

function subscribeToPreferences(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(preferencesChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(preferencesChangedEvent, onChange);
  };
}

function getLanguageSnapshot(): Language {
  const savedLanguage = window.localStorage.getItem("flick-language");
  return isLanguage(savedLanguage)
    ? savedLanguage
    : detectBrowserLanguage();
}

function getServerLanguageSnapshot(): Language {
  return defaultLanguage;
}

function getThemeSnapshot(): Theme {
  return window.localStorage.getItem("flick-theme") === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): Theme {
  return "dark";
}

function notifyPreferencesChanged() {
  window.dispatchEvent(new Event(preferencesChangedEvent));
}

function storeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const language = useSyncExternalStore(
    subscribeToPreferences,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );
  const theme = useSyncExternalStore(
    subscribeToPreferences,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    const savedCookieLanguage = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("flick-language="))
      ?.split("=")[1];
    const serverLanguage =
      savedCookieLanguage === undefined
        ? defaultLanguage
        : decodeURIComponent(savedCookieLanguage);
    document.documentElement.lang = language;
    document.documentElement.classList.toggle("dark", theme === "dark");
    storeCookie("flick-language", language);
    storeCookie("flick-theme", theme);
    if (serverLanguage !== language) {
      router.refresh();
    }
  }, [language, router, theme]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    window.localStorage.setItem("flick-language", nextLanguage);
    storeCookie("flick-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
    notifyPreferencesChanged();
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = getThemeSnapshot() === "dark" ? "light" : "dark";
    window.localStorage.setItem("flick-theme", nextTheme);
    storeCookie("flick-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    notifyPreferencesChanged();
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        toggleTheme,
        t: messages[language],
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const preferences = useContext(PreferencesContext);
  if (!preferences) {
    throw new Error(
      "usePreferences must be used within a PreferencesProvider.",
    );
  }
  return preferences;
}
