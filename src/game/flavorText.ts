import type { ClassId, RaceId } from '../types';
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
  mainClassId: ClassId;
  raceId: RaceId;
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
  switch (condition.k) {
    case 'none':
      return true;
    case 'hp_gt':
      return context.hpRatio > condition.v;
    case 'hp_lt':
      return context.hpRatio < condition.v;
    case 'class_is':
      return context.mainClassId === condition.v;
    case 'race_is':
      return context.raceId === condition.v;
    case 'raw':
      return false;
    default:
      return false;
  }
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

export function getRuntimeFlavorText(context: FlavorContext): string | null {
  const stateId = stateIdByName.get(context.state);
  if (stateId === undefined) return null;

  const matched: Array<{ text: string; specificity: number }> = [];
  for (const [entryStateId, conditionId, text] of FLAVOR_ENTRIES) {
    if (entryStateId !== stateId) continue;
    const condition = FLAVOR_CONDITIONS[conditionId];
    if (!condition || !isConditionMatch(condition, context)) continue;
    const specificity = conditionSpecificity(condition);
    if (specificity < 0) continue;
    matched.push({ text, specificity });
  }

  if (matched.length === 0) return null;

  const bestSpecificity = matched.reduce((max, entry) => Math.max(max, entry.specificity), 0);
  const candidates = matched.filter((entry) => entry.specificity === bestSpecificity);
  const normalizedSeed = Math.abs(Math.floor(context.seed));
  const picked = candidates[normalizedSeed % candidates.length];
  return normalizeFlavorText(picked.text, context);
}
