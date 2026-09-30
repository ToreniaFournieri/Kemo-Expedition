// Saved enemy names keep the Gods Battle suffix in the language they were
// recorded in, so detection accepts every locale's suffix rather than only the
// current one. New entries also carry the structured `godsBattle` flag.
export const GODS_BATTLE_SUFFIXES = [
  '(神魔戦)',
  '(Gods Battle)',
  '(God Battle)',
  '(신마전)',
  '（神魔战）',
  '（神魔戰）',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasGodsBattleSuffix(text: string): boolean {
  return GODS_BATTLE_SUFFIXES.some((suffix) => text.includes(suffix));
}

export function stripGodsBattleSuffix(text: string): string {
  return GODS_BATTLE_SUFFIXES.reduce(
    (value, suffix) => value.replace(new RegExp(`\\s*${escapeRegExp(suffix)}\\s*$`, 'u'), '').trim(),
    text,
  );
}
