import type { AbilityId, ClassId, RaceId } from '../types';
import { FLAVOR_CONDITIONS, FLAVOR_ENTRIES, FLAVOR_STATES, type FlavorCondition } from '../data/flavorTextRuntime';

export type FlavorCycleState =
  | 'rest'
  | 'sell'
  | 'feast'
  | 'sound_sleep'
  | 'nap_sleep'
  | 'outfit'
  | 'pray'
  | 'idle'
  | 'move'
  | 'explore'
  | 'return';

interface FlavorContext {
  state: FlavorCycleState;
  hpRatio: number;
  mainClassId?: ClassId;
  raceId?: RaceId;
  partyMainClassIds?: ReadonlyArray<ClassId>;
  partyRaceIds?: ReadonlyArray<RaceId>;
  partyAbilityIds?: ReadonlyArray<AbilityId>;
  partyReligionName?: string;
  leaderName: string;
  seed: number;
  sellingItemName?: string;
  autoSellPrice?: number;
}

const stateIdByName = new Map<string, number>(FLAVOR_STATES.map((state, index) => [state, index]));

function conditionSpecificity(condition: FlavorCondition): number {
  if (condition.k === 'none') return 0;
  if (condition.k === 'raw') return -1;
  return 1;
}

function isConditionMatch(condition: FlavorCondition, context: FlavorContext): boolean {
  const classIds = new Set<ClassId>([
    ...(context.partyMainClassIds ?? []),
    ...(context.mainClassId ? [context.mainClassId] : []),
  ]);
  const raceIds = new Set<RaceId>([
    ...(context.partyRaceIds ?? []),
    ...(context.raceId ? [context.raceId] : []),
  ]);
  const abilityIds = new Set<string>(context.partyAbilityIds ?? []);

  switch (condition.k) {
    case 'none':
      return true;
    case 'hp_gt':
      return context.hpRatio > condition.v;
    case 'hp_lt':
      return context.hpRatio < condition.v;
    case 'class_is':
      return classIds.has(condition.v as ClassId);
    case 'race_is':
      return raceIds.has(condition.v as RaceId);
    case 'raw':
      return isRawConditionMatch(condition.v, {
        partyAbilityIds: abilityIds,
        partyReligionName: context.partyReligionName,
      });
    default:
      return false;
  }
}

function isRawConditionMatch(
  raw: string,
  context: {
    partyAbilityIds: ReadonlySet<string>;
    partyReligionName?: string;
  }
): boolean {
  const abilityMatch = raw.match(/with\s+ability\.\s*`([^`]+)`/i);
  if (abilityMatch) {
    const abilityToken = abilityMatch[1].trim();
    const normalizedAbilityId = abilityToken.startsWith('a.') ? abilityToken.slice(2) : abilityToken;
    return context.partyAbilityIds.has(normalizedAbilityId);
  }

  const religionMatch = raw.match(/with\s+religion\.\s*`([^`]+)`/i);
  if (religionMatch) {
    return context.partyReligionName === religionMatch[1].trim();
  }

  return false;
}

function normalizeFlavorText(text: string, context: FlavorContext): string {
  return text
    .replace(/name は/g, `${context.leaderName}は`)
    .replace(/name/g, context.leaderName)
    .replace(/selling item/g, context.sellingItemName ?? 'アイテム')
    .replace(/auto-sell price/g, context.autoSellPrice !== undefined ? `${context.autoSellPrice}` : '0')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatConditionDebug(condition: FlavorCondition): string {
  if (condition.k === 'none') return 'no condition';
  if (condition.k === 'raw') return `raw: ${condition.v}`;
  return `${condition.k}: ${condition.v}`;
}

export function getRuntimeFlavorText(context: FlavorContext): string | null {
  const stateId = stateIdByName.get(context.state);
  if (stateId === undefined) return null;

  const matched: Array<{ text: string; specificity: number; condition: FlavorCondition }> = [];
  for (const [entryStateId, conditionId, text] of FLAVOR_ENTRIES) {
    if (entryStateId !== stateId) continue;
    const condition = FLAVOR_CONDITIONS[conditionId];
    if (!condition || !isConditionMatch(condition, context)) continue;
    const specificity = conditionSpecificity(condition);
    if (specificity < 0) continue;
    matched.push({ text, specificity, condition });
  }

  if (matched.length === 0) return null;

  const bestSpecificity = matched.reduce((max, entry) => Math.max(max, entry.specificity), 0);
  const candidates = matched.filter((entry) => entry.specificity === bestSpecificity);
  const normalizedSeed = Math.abs(Math.floor(context.seed));
  const picked = candidates[normalizedSeed % candidates.length];
  const normalizedText = normalizeFlavorText(picked.text, context);
  return `${normalizedText} (${formatConditionDebug(picked.condition)})`;
}
