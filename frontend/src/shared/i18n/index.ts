import { create } from 'zustand';

import { en } from './en';
import { es } from './es';
import { ptBR, type TranslationKey } from './pt-BR';

export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'voffice:locale:v1';

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = {
  'pt-BR': ptBR,
  en,
  es,
};

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'pt-BR';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
      return saved as Locale;
    }
  } catch {
    // ignora
  }
  return 'pt-BR';
}

function applyDocumentLang(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>((set) => {
  const initial = readInitialLocale();
  applyDocumentLang(initial);
  return {
    locale: initial,
    setLocale: (locale) => {
      applyDocumentLang(locale);
      try {
        window.localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        // ignora
      }
      set({ locale });
    },
  };
});

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const template = DICTIONARIES[locale]?.[key] ?? ptBR[key] ?? key;
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : '',
  );
}

/** Hook de internacionalização (pt-BR, en, es). */
export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);
  return { locale, setLocale, t };
}

export type { TranslationKey };
