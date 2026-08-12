export type DetectedLanguage = 'ja' | 'en' | 'zh-CN' | 'zh-TW';

export function normalizeSystemLanguage(value: unknown): DetectedLanguage | null {
  if (typeof value !== 'string') return null;
  const tag = value.trim().replace(/_/g, '-').toLowerCase();
  if (tag === 'ja' || tag.startsWith('ja-')) return 'ja';
  if (tag === 'en' || tag.startsWith('en-')) return 'en';
  if (tag !== 'zh' && !tag.startsWith('zh-')) return null;

  const subtags = tag.split('-').slice(1);
  if (subtags.some((subtag) => subtag === 'hant' || subtag === 'tw' || subtag === 'hk' || subtag === 'mo')) {
    return 'zh-TW';
  }
  return 'zh-CN';
}

export function resolveSystemLanguage(languages: readonly unknown[]): DetectedLanguage | null {
  for (const language of languages) {
    const normalized = normalizeSystemLanguage(language);
    if (normalized) return normalized;
  }
  return null;
}

export function selectInitialLanguage(
  urlLanguage: DetectedLanguage | null,
  savedLanguage: DetectedLanguage | null,
  systemLanguage: DetectedLanguage | null,
): DetectedLanguage {
  return urlLanguage ?? savedLanguage ?? systemLanguage ?? 'ja';
}
