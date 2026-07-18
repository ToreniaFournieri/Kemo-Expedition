import ja from './ja';
import en from './en';

export type Language = 'ja' | 'en';
export type TranslationParams = Record<string, string | number>;
type TranslationDictionary = Record<string, string>;

export const SUPPORTED_LANGUAGES: readonly Language[] = ['ja', 'en'];
export const DEFAULT_LANGUAGE: Language = 'ja';

const dictionaries: Record<Language, TranslationDictionary> = { ja, en };
let activeLanguage: Language = DEFAULT_LANGUAGE;

export function normalizeLanguage(value: unknown): Language {
  return value === 'en' || value === 'ja' ? value : DEFAULT_LANGUAGE;
}

export function setLanguage(language: Language): void {
  activeLanguage = normalizeLanguage(language);
}

export function getLanguage(): Language {
  return activeLanguage;
}

// SpecRef: 8.1 | UI_FOUNDATIONS | Localization lookup
export function t(key: string, params?: TranslationParams): string {
  const template = dictionaries[activeLanguage][key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, paramKey: string) => {
    const value = params[paramKey];
    return value === undefined ? match : String(value);
  });
}
