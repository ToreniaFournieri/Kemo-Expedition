import type { Party } from '../types';
import { getDeityDepositMultiplier } from './deity';
import type { ComputedPartyStatus } from './partyComputation';

export type ExpeditionRewardContext = Readonly<{
  autoSellMultiplier: number;
  unlockActorName?: string;
}>;

function getComputedPartyAbilityLevel(
  partyStatus: ComputedPartyStatus,
  abilityId: string,
): number {
  return partyStatus.partyStats.abilities
    .filter((ability) => ability.id === abilityId)
    .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
}

/**
 * Creates the immutable reward authority for one RUN_EXPEDITION transaction.
 * The supplied Party and ComputedPartyStatus must come from the same explicit
 * transaction authority; this helper never infers freshness from identity.
 */
export function deriveExpeditionRewardContext(
  statusParty: Party,
  partyStatus: ComputedPartyStatus,
): ExpeditionRewardContext {
  // SpecRef: 5.1 | Chunk | Party status is calculated once at Chunk start.
  const cunningLevel = getComputedPartyAbilityLevel(partyStatus, 'cunning');
  const abilityMultiplier = cunningLevel >= 2 ? 1.3 : cunningLevel >= 1 ? 1.2 : 1;
  const momentumLevel = getComputedPartyAbilityLevel(partyStatus, 'momentum');
  const deityDepositMultiplier = getDeityDepositMultiplier(
    statusParty.deity.name,
    statusParty.deityGold ?? 0,
  );
  const momentumEmbezzlementRate = momentumLevel > 0 ? 0.1 : 0;
  const prayerDepositMultiplier = Math.max(
    0,
    deityDepositMultiplier - momentumEmbezzlementRate,
  );

  let bestUnlockLevel = 0;
  let unlockActorName: string | undefined;
  for (const character of statusParty.characters) {
    const stats = partyStatus.characterStats.find(
      (characterStatus) => characterStatus.characterId === character.id,
    );
    const unlockAbility = stats?.abilities.find((ability) => ability.id === 'unlock');
    if (unlockAbility && unlockAbility.level > bestUnlockLevel) {
      bestUnlockLevel = unlockAbility.level;
      unlockActorName = character.name;
    }
  }

  return Object.freeze({
    autoSellMultiplier: abilityMultiplier * prayerDepositMultiplier,
    ...(unlockActorName !== undefined ? { unlockActorName } : {}),
  });
}
