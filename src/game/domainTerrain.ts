import { applyDomainDamageOverride } from './battleKernel.ts';

type DomainTerrainAbility = { id: string };

type DomainAttackType = 'ranged' | 'magical' | 'melee';

function hasDomainBreaker(abilities: DomainTerrainAbility[]): boolean {
  return abilities.some((ability) => ability.id === 'domain_breaker');
}

function domainTerrainIsIgnored(
  actorAbilities: DomainTerrainAbility[],
  opponentAbilities: DomainTerrainAbility[],
): boolean {
  return hasDomainBreaker(actorAbilities) || hasDomainBreaker(opponentAbilities);
}

// SpecRef: 6.1.4.1 | Function of attack | terrain.floor-domain / terrain.cap-domain
export function applyDomainTerrainDamageOverride(
  perHitDamage: number,
  terrainEffect: string | null | undefined,
  opponentMaxHp: number,
  actorAbilities: DomainTerrainAbility[] = [],
  opponentAbilities: DomainTerrainAbility[] = [],
): number {
  return applyDomainDamageOverride(
    perHitDamage,
    terrainEffect,
    opponentMaxHp,
    domainTerrainIsIgnored(actorAbilities, opponentAbilities),
  );
}

// SpecRef: 6.1.4.2 | Function of targeting | domain terrain hit override
export function isDomainTerrainGuaranteedHit(
  attackType: DomainAttackType,
  terrainEffect: string | null | undefined,
  actorHasDomainBreaker: boolean = false,
  opponentHasDomainBreaker: boolean = false,
): boolean {
  if (actorHasDomainBreaker || opponentHasDomainBreaker) return false;

  return (attackType === 'ranged' && terrainEffect === 'terrain.sniper-domain')
    || (attackType === 'magical' && terrainEffect === 'terrain.spell-domain')
    || (attackType === 'melee' && terrainEffect === 'terrain.duelist-domain');
}
