import ja from './ja';
import { createEnvironmentStorageKey } from '../game/environment';
import { resolveSystemLanguage, selectInitialLanguage } from './languageDetection';
import { gameplayRandom } from '../game/gameplayRandom';

export type Language = 'ja' | 'en' | 'zh-CN' | 'zh-TW' | 'ko';
export type TranslationParams = Record<string, string | number>;
type TranslationDictionary = Record<string, string>;

// Every key the Japanese dictionary defines; the other languages must match it exactly (tests enforce this).
export type TranslationKey = keyof typeof ja;
// A literal key (or a union of literals, e.g. from a template over a union type) must be a TranslationKey,
// so typos fail to compile. Keys built from plain `string` values are checked by tests instead.
export type CheckedTranslationKey<K extends string> = K & (string extends K ? unknown : TranslationKey);

export const SUPPORTED_LANGUAGES: readonly Language[] = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko'];
export const DEFAULT_LANGUAGE: Language = 'ja';
// SpecRef: 9 | Environment | Save Data Isolation
export const LANGUAGE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-language');

const fallbackDictionary: TranslationDictionary = ja;
const dictionaries: Partial<Record<Language, TranslationDictionary>> = { ja: fallbackDictionary };
const dictionaryLoads = new Map<Language, Promise<void>>();
let activeDictionary: TranslationDictionary = fallbackDictionary;
let activeLanguage: Language = DEFAULT_LANGUAGE;

export function ensureLanguageLoaded(language: Language): Promise<void> {
  const normalizedLanguage = normalizeLanguage(language);
  if (dictionaries[normalizedLanguage]) return Promise.resolve();
  const pending = dictionaryLoads.get(normalizedLanguage);
  if (pending) return pending;
  const load = (async () => {
    const dictionary = normalizedLanguage === 'en'
      ? (await import('./en')).default
      : normalizedLanguage === 'zh-CN'
        ? (await import('./zh-CN')).default
        : normalizedLanguage === 'zh-TW'
          ? (await import('./zh-TW')).default
          : normalizedLanguage === 'ko'
            ? (await import('./ko')).default
            : ja;
    dictionaries[normalizedLanguage] = dictionary;
  })();
  dictionaryLoads.set(normalizedLanguage, load);
  return load.finally(() => dictionaryLoads.delete(normalizedLanguage));
}

export function normalizeLanguage(value: unknown): Language {
  if (value === 'zh') return 'zh-CN';
  return value === 'en' || value === 'ja' || value === 'zh-CN' || value === 'zh-TW' || value === 'ko' ? value : DEFAULT_LANGUAGE;
}

function getBrowserLanguageSources(): { urlLanguage: Language | null; savedLanguage: Language | null } {
  if (typeof window === 'undefined') {
    return { urlLanguage: null, savedLanguage: null };
  }

  const urlParam = new URLSearchParams(window.location.search).get('lang');
  const urlLanguage = urlParam === 'zh' ? 'zh-CN' : normalizeOptionalLanguage(urlParam);
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const savedLanguage = saved === 'zh' ? 'zh-CN' : normalizeOptionalLanguage(saved);
  return { urlLanguage, savedLanguage };
}

function getSystemLanguage(): Language | null {
  if (typeof navigator === 'undefined') return null;
  const languages = Array.isArray(navigator.languages) ? [...navigator.languages] : [];
  if (navigator.language && !languages.includes(navigator.language)) languages.push(navigator.language);
  return resolveSystemLanguage(languages);
}

export { normalizeSystemLanguage, resolveSystemLanguage } from './languageDetection';

function normalizeOptionalLanguage(value: unknown): Language | null {
  return value === 'en' || value === 'ja' || value === 'zh-CN' || value === 'zh-TW' || value === 'ko' ? value : null;
}

export function resolveInitialLanguage(): Language {
  // SpecRef: 8.6 | UI_SETTING | Mode select (モード切替) initial language priority
  const { urlLanguage, savedLanguage } = getBrowserLanguageSources();
  return selectInitialLanguage(urlLanguage, savedLanguage, getSystemLanguage());
}

export function persistLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  const normalizedLanguage = normalizeLanguage(language);
  // SpecRef: 8.6 | UI_SETTING | Mode select (モード切替) Language (言語)
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);

  const url = new URL(window.location.href);
  url.searchParams.set('lang', normalizedLanguage);
  window.history.replaceState(window.history.state, '', url);
}

export function setLanguage(language: Language): void {
  const normalizedLanguage = normalizeLanguage(language);
  const dictionary = dictionaries[normalizedLanguage];
  if (!dictionary) throw new Error(`Language dictionary is not loaded: ${normalizedLanguage}`);
  activeDictionary = dictionary;
  activeLanguage = normalizedLanguage;
}

export function translate<K extends string>(language: Language, key: CheckedTranslationKey<K>, params?: TranslationParams): string {
  const normalizedLanguage = normalizeLanguage(language);
  const template = dictionaries[normalizedLanguage]?.[key] ?? dictionaries[DEFAULT_LANGUAGE]?.[key] ?? key;
  return interpolate(normalizedLanguage, template, params);
}

// SpecRef: 8.1 | UI_FOUNDATIONS | Localization lookup
export function t<K extends string>(key: CheckedTranslationKey<K>, params?: TranslationParams): string {
  const template = activeDictionary[key] ?? fallbackDictionary[key] ?? key;
  return interpolate(activeLanguage, template, params);
}

const pluralRulesByLanguage = new Map<Language, Intl.PluralRules>();

// `{name}` inserts a parameter. `{name|one|other}` picks a plural form for the
// parameter's number (Intl.PluralRules), so "{count} {count|time|times}" reads
// "1 time" / "2 times". Languages without plural forms simply never use it.
function interpolate(language: Language, template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template
    .replace(/\{(\w+)\|([^|{}]*)\|([^{}]*)\}/g, (match, paramKey: string, one: string, other: string) => {
      const value = params[paramKey];
      if (value === undefined) return match;
      const count = Number(String(value).replace(/,/g, ''));
      let rules = pluralRulesByLanguage.get(language);
      if (!rules) {
        rules = new Intl.PluralRules(language);
        pluralRulesByLanguage.set(language, rules);
      }
      return Number.isFinite(count) && rules.select(count) === 'one' ? one : other;
    })
    .replace(/\{(\w+)\}/g, (match, paramKey: string) => {
      const value = params[paramKey];
      return value === undefined ? match : String(value);
    });
}
export function getRandomTranslation(prefix: string, count: number, params?: TranslationParams): string {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount <= 0) return t(prefix, params);
  const index = Math.floor(gameplayRandom() * safeCount) + 1;
  return t(`${prefix}.${index}`, params);
}
