import ja from './ja';
import en from './en';
import zh from './zh';

export type Language = 'ja' | 'en' | 'zh';
export type TranslationParams = Record<string, string | number>;
type TranslationDictionary = Record<string, string>;

export const SUPPORTED_LANGUAGES: readonly Language[] = ['ja', 'en', 'zh'];
export const DEFAULT_LANGUAGE: Language = 'ja';
export const LANGUAGE_STORAGE_KEY = 'kemo-expedition-language';

const dictionaries: Record<Language, TranslationDictionary> = { ja, en, zh };
let activeLanguage: Language = DEFAULT_LANGUAGE;

export function normalizeLanguage(value: unknown): Language {
  return value === 'en' || value === 'ja' || value === 'zh' ? value : DEFAULT_LANGUAGE;
}

function getBrowserLanguageSources(): { urlLanguage: Language | null; savedLanguage: Language | null } {
  if (typeof window === 'undefined') {
    return { urlLanguage: null, savedLanguage: null };
  }

  const urlParam = new URLSearchParams(window.location.search).get('lang');
  const urlLanguage = urlParam === 'en' || urlParam === 'ja' || urlParam === 'zh' ? urlParam : null;
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const savedLanguage = saved === 'en' || saved === 'ja' || saved === 'zh' ? saved : null;
  return { urlLanguage, savedLanguage };
}

export function resolveInitialLanguage(): Language {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Mode select (モード切替) Language URL parameter
  const { urlLanguage, savedLanguage } = getBrowserLanguageSources();
  return urlLanguage ?? savedLanguage ?? DEFAULT_LANGUAGE;
}

export function persistLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  // SpecRef: 8.1 | UI_FOUNDATIONS | Mode select (モード切替) Persist language
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
}

export function setLanguage(language: Language): void {
  activeLanguage = normalizeLanguage(language);
}

export function getLanguage(): Language {
  return activeLanguage;
}

export function translate(language: Language, key: string, params?: TranslationParams): string {
  const normalizedLanguage = normalizeLanguage(language);
  const template = dictionaries[normalizedLanguage][key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, paramKey: string) => {
    const value = params[paramKey];
    return value === undefined ? match : String(value);
  });
}

// SpecRef: 8.1 | UI_FOUNDATIONS | Localization lookup
export function t(key: string, params?: TranslationParams): string {
  return translate(activeLanguage, key, params);
}
export function getRandomTranslation(prefix: string, count: number, params?: TranslationParams): string {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount <= 0) return t(prefix, params);
  const index = Math.floor(Math.random() * safeCount) + 1;
  return t(`${prefix}.${index}`, params);
}
