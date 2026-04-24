import type { AbilityId, ClassId, RaceId } from '../types';
import { FLAVOR_CONDITIONS, FLAVOR_ENTRIES, FLAVOR_STATES, type FlavorCondition } from '../data/flavorTextRuntime';

export type FlavorCycleState =
  | 'rest'
  | 'sell'
  | 'feast'
  | 'slump'
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
  returnOutcome?: 'Defeat' | 'Wounded_Retreat' | 'Draw_Retreat' | 'Turned_Back' | 'Clear';
  sortieSourceState?: 'rest' | 'feast' | 'sleep' | 'return';
  embezzlementGold?: number;
  expeditionId?: number;
  floor?: number;
  mainClassId?: ClassId;
  raceId?: RaceId;
  partyMainClassIds?: ReadonlyArray<ClassId>;
  partyRaceIds?: ReadonlyArray<RaceId>;
  partyAbilityIds?: ReadonlyArray<AbilityId>;
  partyReligionName?: string;
  partyMembers?: ReadonlyArray<{
    name: string;
    mainClassId: ClassId;
    raceId: RaceId;
    abilityIds: ReadonlyArray<AbilityId>;
  }>;
  leaderName: string;
  seed: number;
  sellingItemName?: string;
  autoSellPrice?: number;
  debug?: {
    displayCondition?: boolean;
  };
}

const stateIdByName = new Map<string, number>(FLAVOR_STATES.map((state, index) => [state, index]));

function isSortieConditionRaw(raw: string): boolean {
  return /sortie\s+while\s+(sleep|feast|rest|return)\s+state\s+with\s+embezzlement\s*>\s*0\s*G/i.test(raw)
    || /sortie\s+with\s+embezzlement\s*=\s*0\s*G/i.test(raw);
}

function conditionSpecificity(condition: FlavorCondition, context: FlavorContext): number {
  if (condition.k === 'none') return 0;
  if (condition.k === 'and') return 3;
  if (condition.k === 'return_outcome_is') return 2;
  if (condition.k === 'raw' && isSortieConditionRaw(condition.v) && (context.sortieSourceState !== undefined || context.embezzlementGold !== undefined)) {
    return 2;
  }
  if (condition.k === 'exp_floor_is') return 2;
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
    case 'hp_eq':
      return context.hpRatio === condition.v;
    case 'return_outcome_is':
      return context.returnOutcome === condition.v;
    case 'and':
      return condition.v.every((sub) => isConditionMatch(sub as FlavorCondition, context));
    case 'class_is':
      return classIds.has(condition.v as ClassId);
    case 'race_is':
      return raceIds.has(condition.v as RaceId);
    case 'exp_floor_is':
      return context.expeditionId === condition.v.expId && context.floor === condition.v.floor;
    case 'raw':
      return isRawConditionMatch(condition.v, {
        partyAbilityIds: abilityIds,
        partyReligionName: context.partyReligionName,
        sortieSourceState: context.sortieSourceState,
        embezzlementGold: context.embezzlementGold,
        debug: context.debug,
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
    sortieSourceState?: 'rest' | 'feast' | 'sleep' | 'return';
    embezzlementGold?: number;
    debug?: {
      displayCondition?: boolean;
    };
  }
): boolean {
  const isSortieActive = context.sortieSourceState !== undefined || context.embezzlementGold !== undefined;
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

  const sortieWhileStateWithEmbezzlementMatch = raw.match(/sortie\s+while\s+(sleep|feast|rest|return)\s+state\s+with\s+embezzlement\s*>\s*0\s*G/i);
  if (sortieWhileStateWithEmbezzlementMatch) {
    const sourceState = sortieWhileStateWithEmbezzlementMatch[1].toLowerCase() as 'sleep' | 'feast' | 'rest' | 'return';
    return isSortieActive && context.sortieSourceState === sourceState && (context.embezzlementGold ?? 0) > 0;
  }

  if (/sortie\s+with\s+embezzlement\s*=\s*0\s*G/i.test(raw)) {
    return isSortieActive && (context.embezzlementGold ?? 0) === 0;
  }

  return false;
}

function normalizeFlavorText(text: string, context: FlavorContext): string {
  const speakerName = pickFlavorSpeakerName(context);
  return text
    .replace(/name は/g, `${speakerName}は`)
    .replace(/name/g, speakerName)
    .replace(/selling item/g, context.sellingItemName ?? 'アイテム')
    .replace(/auto-sell price/g, context.autoSellPrice !== undefined ? `${context.autoSellPrice}` : '0')
    .replace(/d\.embezzlement/g, `${Math.max(0, context.embezzlementGold ?? 0)}`)
    .replace(/\s+/g, ' ')
    .trim();
}

function pickFlavorSpeakerName(context: FlavorContext): string {
  if (!context.partyMembers || context.partyMembers.length === 0) return context.leaderName;

  const stateId = stateIdByName.get(context.state);
  if (stateId === undefined) return context.leaderName;

  const matched: Array<{ memberName: string; specificity: number }> = [];
  for (const [entryStateId, conditionId] of FLAVOR_ENTRIES) {
    if (entryStateId !== stateId) continue;
    const condition = FLAVOR_CONDITIONS[conditionId];
    if (!condition || !isConditionMatch(condition, context)) continue;
    const specificity = conditionSpecificity(condition, context);
    if (specificity < 0) continue;
    const memberName = pickMatchingMemberName(condition, context);
    if (!memberName) continue;
    matched.push({ memberName, specificity });
  }

  if (matched.length === 0) return context.leaderName;
  const bestSpecificity = matched.reduce((max, entry) => Math.max(max, entry.specificity), 0);
  const candidates = matched.filter((entry) => entry.specificity === bestSpecificity);
  const normalizedSeed = Math.abs(Math.floor(context.seed));
  return candidates[normalizedSeed % candidates.length].memberName;
}

function pickSeededMemberName(
  members: ReadonlyArray<{ name: string }>,
  seed: number,
  fallbackName: string,
): string {
  if (members.length === 0) return fallbackName;
  const normalizedSeed = Math.abs(Math.floor(seed));
  return members[normalizedSeed % members.length]?.name ?? fallbackName;
}

function pickMatchingMemberName(condition: FlavorCondition, context: FlavorContext): string | null {
  const members = context.partyMembers;
  if (!members || members.length === 0) return context.leaderName;

  if (condition.k === 'none') {
    return pickSeededMemberName(members, context.seed, context.leaderName);
  }

  if (condition.k === 'class_is') {
    const matchedMembers = members.filter((member) => member.mainClassId === (condition.v as ClassId));
    return matchedMembers.length > 0
      ? pickSeededMemberName(matchedMembers, context.seed, context.leaderName)
      : null;
  }

  if (condition.k === 'race_is') {
    const matchedMembers = members.filter((member) => member.raceId === (condition.v as RaceId));
    return matchedMembers.length > 0
      ? pickSeededMemberName(matchedMembers, context.seed, context.leaderName)
      : null;
  }

  if (condition.k === 'raw') {
    const abilityMatch = condition.v.match(/with\s+ability\.\s*`([^`]+)`/i);
    if (abilityMatch) {
      const abilityToken = abilityMatch[1].trim();
      const normalizedAbilityId = (abilityToken.startsWith('a.') ? abilityToken.slice(2) : abilityToken) as AbilityId;
      const matchedMembers = members.filter((member) => member.abilityIds.includes(normalizedAbilityId));
      return matchedMembers.length > 0
        ? pickSeededMemberName(matchedMembers, context.seed, context.leaderName)
        : null;
    }
  }

  return pickSeededMemberName(members, context.seed, context.leaderName);
}

// SpecRef: 8.3 | UI_EXPEDITION | Flavor text
function formatConditionDebug(condition: FlavorCondition): string {
  if (condition.k === 'none') return 'no condition';
  if (condition.k === 'raw') return `raw: ${condition.v}`;
  if (condition.k === 'and') return `and: ${condition.v.map((part) => `${part.k}:${part.v}`).join('&')}`;
  if (condition.k === 'exp_floor_is') return `exp_floor_is: exp=${condition.v.expId}, floor=${condition.v.floor}`;
  return `${condition.k}: ${condition.v}`;
}

// SpecRef: 5.2 | PROGRESS_FLAVOR_TEXT | Priority logic
// SpecRef: 8.3 | UI_EXPEDITION | Flavor text
export function getRuntimeFlavorText(context: FlavorContext): string | null {
  const stateId = stateIdByName.get(context.state);
  if (stateId === undefined) return null;

  const matched: Array<{ text: string; specificity: number; condition: FlavorCondition }> = [];
  for (const [entryStateId, conditionId, text] of FLAVOR_ENTRIES) {
    if (entryStateId !== stateId) continue;
    const condition = FLAVOR_CONDITIONS[conditionId];
    if (!condition || !isConditionMatch(condition, context)) continue;
    const specificity = conditionSpecificity(condition, context);
    if (specificity < 0) continue;
    matched.push({ text, specificity, condition });
  }

  if (matched.length === 0) return null;

  const bestSpecificity = matched.reduce((max, entry) => Math.max(max, entry.specificity), 0);
  const candidates = matched.filter((entry) => entry.specificity === bestSpecificity);
  const normalizedSeed = Math.abs(Math.floor(context.seed));
  const picked = candidates[normalizedSeed % candidates.length];
  const normalizedText = normalizeFlavorText(picked.text, context);
  if (context.debug?.displayCondition) {
    return `${normalizedText} (${formatConditionDebug(picked.condition)})`;
  }
  return normalizedText;
}
