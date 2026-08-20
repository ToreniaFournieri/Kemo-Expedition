import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDomainTerrainDamageOverride,
  isDomainTerrainGuaranteedHit,
} from '../src/game/domainTerrain.ts';

const domainBreaker = [{ id: 'domain_breaker' }];

test('floor-domain and cap-domain are ignored when either combatant has domain-breaker', () => {
  assert.equal(applyDomainTerrainDamageOverride(2, 'terrain.floor-domain', 1_000), 10);
  assert.equal(applyDomainTerrainDamageOverride(2, 'terrain.floor-domain', 1_000, domainBreaker), 2);
  assert.equal(applyDomainTerrainDamageOverride(2, 'terrain.floor-domain', 1_000, [], domainBreaker), 2);

  assert.equal(applyDomainTerrainDamageOverride(100, 'terrain.cap-domain', 1_000), 50);
  assert.equal(applyDomainTerrainDamageOverride(100, 'terrain.cap-domain', 1_000, domainBreaker), 100);
  assert.equal(applyDomainTerrainDamageOverride(100, 'terrain.cap-domain', 1_000, [], domainBreaker), 100);
});

test('matching domain terrain guarantees hits only when neither combatant has domain-breaker', () => {
  const cases = [
    ['ranged', 'terrain.sniper-domain'],
    ['magical', 'terrain.spell-domain'],
    ['melee', 'terrain.duelist-domain'],
  ] as const;

  for (const [attackType, terrainEffect] of cases) {
    assert.equal(isDomainTerrainGuaranteedHit(attackType, terrainEffect), true);
    assert.equal(isDomainTerrainGuaranteedHit(attackType, terrainEffect, true), false);
    assert.equal(isDomainTerrainGuaranteedHit(attackType, terrainEffect, false, true), false);
  }

  assert.equal(isDomainTerrainGuaranteedHit('melee', 'terrain.sniper-domain'), false);
});
