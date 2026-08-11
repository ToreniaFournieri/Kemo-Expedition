const BATTLE_LOG_NAME_BOUNDARY_PARTICLES = new Set([
  'が', 'を', 'に', 'は', 'へ', 'と', 'も', 'の', 'で', 'や', 'か',
  '的', '向', '对', '對', '被', '给', '給', '与', '與', '由', '让', '讓', '跟', '和', '及',
]);

function isBattleLogNameBoundary(character: string | undefined): boolean {
  if (character === undefined) return true;
  return BATTLE_LOG_NAME_BOUNDARY_PARTICLES.has(character) || !/[\p{L}\p{N}_]/u.test(character);
}

/** Prevent short character names from matching inside attack, spell, or effect names. */
export function isStandaloneBattleLogName(
  text: string,
  matchIndex: number,
  name: string,
): boolean {
  const before = matchIndex > 0 ? text[matchIndex - 1] : undefined;
  const afterIndex = matchIndex + name.length;
  const after = afterIndex < text.length ? text[afterIndex] : undefined;
  return isBattleLogNameBoundary(before) && isBattleLogNameBoundary(after);
}
