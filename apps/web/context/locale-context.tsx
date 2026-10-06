"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Locale = "pt-BR" | "en-US" | "es-ES" | "fr-FR" | "de-DE";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "rootline-locale";
const DEFAULT_LOCALE: Locale = "pt-BR";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored) {
      setLocaleState(stored);
    } else {
      // Detect browser locale
      const browserLocale = navigator.language as Locale;
      const supportedLocales: Locale[] = [
        "pt-BR",
        "en-US",
        "es-ES",
        "fr-FR",
        "de-DE",
      ];
      if (supportedLocales.includes(browserLocale)) {
        setLocaleState(browserLocale);
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
