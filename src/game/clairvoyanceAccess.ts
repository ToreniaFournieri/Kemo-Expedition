import type { Party } from '../types';
import { getProphecyControlAccess, type ProphecyControlAccess } from './expeditionAbilityPolicies';
import { computePartyStats } from './partyComputation';

// SpecRef: 8.6 | UI_SETTING | Clairvoyance (未来視): shown when a member has `a.prophecy`, reset with `a.prophecy`2,
// both always allowed by the Debug Clairvoyance override. Shared by the Application API and its read of a party.
export function getPartyProphecyLevel(party: Party): number {
  const { characterStats } = computePartyStats(party);
  return characterStats.reduce((maxLevel, stats) => Math.max(maxLevel, stats.abilities
    .filter((ability) => ability.id === 'prophecy')
    .reduce((abilityMax, ability) => Math.max(abilityMax, ability.level), 0)), 0);
}

export function getPartyClairvoyanceAccess(party: Party, debugOverride: boolean): ProphecyControlAccess {
  return getProphecyControlAccess(getPartyProphecyLevel(party), debugOverride);
}
