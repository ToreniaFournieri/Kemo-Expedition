import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { getDeityDepositMultiplier } from '../../src/game/deity.ts';
import {
  deriveExpeditionRewardContext,
  type ExpeditionRewardContext,
} from '../../src/game/expeditionRewardContext.ts';
import { computePartyStats, type ComputedPartyStatus } from '../../src/game/partyComputation.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState, Party } from '../../src/types/index.ts';

type AbilityFixture = { id: string; level: number };
type CharacterFixture = { id: number; name: string; abilities: AbilityFixture[] };

function makeParty(
  characters: CharacterFixture[],
  deityName = 'None',
  deityGold = 0,
): Party {
  return {
    deity: { name: deityName },
    deityGold,
    characters: characters.map(({ id, name }) => ({ id, name })),
  } as unknown as Party;
}

function makeStatus(
  characters: CharacterFixture[],
  partyAbilities?: AbilityFixture[],
): ComputedPartyStatus {
  const abilities = partyAbilities ?? [...new Map(
    characters.flatMap((character) => character.abilities).map((ability) => [ability.id, ability]),
  ).values()];
  return {
    partyStats: { abilities },
    characterStats: characters.map((character) => ({
      characterId: character.id,
      abilities: character.abilities,
    })),
  } as unknown as ComputedPartyStatus;
}

function derive(
  characters: CharacterFixture[],
  deityName = 'None',
  deityGold = 0,
  partyAbilities?: AbilityFixture[],
): ExpeditionRewardContext {
  return deriveExpeditionRewardContext(
    makeParty(characters, deityName, deityGold),
    makeStatus(characters, partyAbilities),
  );
}

function loadSampleState(): GameState {
  const savePath = resolve(
    process.cwd(),
    'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz',
  );
  const envelope = JSON.parse(readFileSync(savePath, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function recomputeLegacyRewardValues(party: Party): ExpeditionRewardContext {
  const firstStatus = computePartyStats(party);
  const getAbilityLevel = (status: ComputedPartyStatus, abilityId: string) => (
    status.characterStats.reduce((partyMaximum, characterStatus) => Math.max(
      partyMaximum,
      characterStatus.abilities
        .filter((ability) => ability.id === abilityId)
        .reduce((maximum, ability) => Math.max(maximum, ability.level), 0),
    ), 0)
  );
  const cunningLevel = getAbilityLevel(firstStatus, 'cunning');
  const abilityMultiplier = cunningLevel >= 2 ? 1.3 : cunningLevel >= 1 ? 1.2 : 1;
  const momentumLevel = getAbilityLevel(computePartyStats(party), 'momentum');
  const prayerDepositMultiplier = Math.max(
    0,
    getDeityDepositMultiplier(party.deity.name, party.deityGold ?? 0)
      - (momentumLevel > 0 ? 0.1 : 0),
  );
  const unlockStatus = computePartyStats(party);
  let bestLevel = 0;
  let unlockActorName: string | undefined;
  for (const character of party.characters) {
    const stats = unlockStatus.characterStats.find((entry) => entry.characterId === character.id);
    const unlockAbility = stats?.abilities.find((ability) => ability.id === 'unlock');
    if (unlockAbility && unlockAbility.level > bestLevel) {
      bestLevel = unlockAbility.level;
      unlockActorName = character.name;
    }
  }
  return {
    autoSellMultiplier: abilityMultiplier * prayerDepositMultiplier,
    ...(unlockActorName !== undefined ? { unlockActorName } : {}),
  };
}

test('Cunning and Momentum preserve the current prayer-deposit operation order', () => {
  const deityCases = [
    { deity: 'None', gold: 0 },
    { deity: 'Goddess of Restoration', gold: 100_000 },
    { deity: 'God of Cunning', gold: 0 },
    { deity: 'God of Cunning', gold: 999 },
    { deity: 'God of Cunning', gold: 1_000 },
    { deity: 'God of Cunning', gold: 50_000 },
    { deity: 'God of Cunning', gold: 1_000_000 },
  ];
  const abilityCases = [
    { cunning: 0, momentum: 0, cunningMultiplier: 1 },
    { cunning: 1, momentum: 0, cunningMultiplier: 1.2 },
    { cunning: 2, momentum: 0, cunningMultiplier: 1.3 },
    { cunning: 3, momentum: 1, cunningMultiplier: 1.3 },
    { cunning: 1, momentum: 2, cunningMultiplier: 1.2 },
  ];

  for (const deityCase of deityCases) {
    for (const abilityCase of abilityCases) {
      const abilities = [
        ...(abilityCase.cunning > 0 ? [{ id: 'cunning', level: abilityCase.cunning }] : []),
        ...(abilityCase.momentum > 0 ? [{ id: 'momentum', level: abilityCase.momentum }] : []),
      ];
      const expectedPrayerMultiplier = Math.max(
        0,
        getDeityDepositMultiplier(deityCase.deity, deityCase.gold)
          - (abilityCase.momentum > 0 ? 0.1 : 0),
      );
      assert.equal(
        derive([{ id: 1, name: 'A', abilities }], deityCase.deity, deityCase.gold).autoSellMultiplier,
        abilityCase.cunningMultiplier * expectedPrayerMultiplier,
        `${deityCase.deity}/${deityCase.gold}/c${abilityCase.cunning}/m${abilityCase.momentum}`,
      );
    }
  }
});

test('derived contexts match the Build 47 recomputed helpers on every save-backed party', () => {
  for (const party of loadSampleState().parties) {
    assert.deepEqual(
      deriveExpeditionRewardContext(party, computePartyStats(party)),
      recomputeLegacyRewardValues(party),
      `party ${party.id}`,
    );
  }
});

test('Cunning and Momentum use the highest already-aggregated party ability levels', () => {
  const characters = [{ id: 1, name: 'A', abilities: [] }];
  assert.equal(derive(characters, 'None', 0, []).autoSellMultiplier, 1);
  assert.equal(derive(characters, 'None', 0, [{ id: 'cunning', level: 1 }]).autoSellMultiplier, 1.2);
  assert.equal(derive(characters, 'None', 0, [{ id: 'cunning', level: 2 }]).autoSellMultiplier, 1.3);
  assert.equal(derive(characters, 'None', 0, [
    { id: 'cunning', level: 3 },
    { id: 'momentum', level: 1 },
  ]).autoSellMultiplier, 1.3 * 0.9);
});

test('unlock actor selection preserves absence, highest level, ties, order, and names', () => {
  const ordinary = { id: 1, name: 'Ordinary', abilities: [] };
  const mimorian = { id: 2, name: 'Mimorian', abilities: [{ id: 'unlock', level: 2 }] };
  const renamed = { id: 3, name: 'Renamed Hero', abilities: [{ id: 'unlock', level: 3 }] };

  assert.equal(derive([ordinary]).unlockActorName, undefined);
  assert.equal(derive([mimorian]).unlockActorName, 'Mimorian');
  assert.equal(derive([ordinary, mimorian, renamed]).unlockActorName, 'Renamed Hero');
  assert.equal(derive([
    { ...mimorian, name: 'First' },
    { ...renamed, name: 'Second', abilities: [{ id: 'unlock', level: 2 }] },
  ]).unlockActorName, 'First');
  assert.equal(derive([
    { ...renamed, name: 'Second', abilities: [{ id: 'unlock', level: 2 }] },
    { ...mimorian, name: 'First' },
  ]).unlockActorName, 'Second');
});

test('reward contexts are frozen snapshots and fresh derivations observe explicit new authority', () => {
  const beforeCharacters = [{ id: 1, name: 'Before', abilities: [{ id: 'cunning', level: 1 }] }];
  const afterCharacters = [{ id: 1, name: 'After', abilities: [
    { id: 'cunning', level: 2 },
    { id: 'momentum', level: 1 },
    { id: 'unlock', level: 1 },
  ] }];
  const before = derive(beforeCharacters, 'None', 0);
  const after = derive(afterCharacters, 'God of Cunning', 50_000);

  assert.equal(Object.isFrozen(before), true);
  assert.deepEqual(before, { autoSellMultiplier: 1.2 });
  assert.notDeepEqual(after, before);
  assert.equal(after.unlockActorName, 'After');
});

test('RUN_EXPEDITION derives one context and has no nested reward/unlock recomputation', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const runExpedition = source.slice(
    source.indexOf("case 'RUN_EXPEDITION':"),
    source.indexOf("case 'FINALIZE_DIARY_LOG':"),
  );

  assert.equal((runExpedition.match(/deriveExpeditionRewardContext\(/g) ?? []).length, 1);
  assert.equal((runExpedition.match(/computePartyStats\(/g) ?? []).length, 1);
  assert.doesNotMatch(runExpedition, /getCurrentPartyCunningMultiplier\(/);
  assert.doesNotMatch(runExpedition, /getCurrentPartyUnlockActorName\(/);
  assert.match(runExpedition, /const autoSellMultiplier = rewardContext\.autoSellMultiplier/);
  assert.match(runExpedition, /const expeditionAutoSellMultiplier = rewardContext\.autoSellMultiplier/);
});

test('mutation-aware stat consumers remain outside the transaction context', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  assert.match(source, /function processAfkCycleProfit[\s\S]*calculatePrayerProfit\(partyAtPrayer/);
  assert.match(source, /action\.workerOptimization === 'legacy'[\s\S]*computePartyStats\(postCycleParty\)\.partyStats\.hp[\s\S]*computePartyMaxHp\(postCycleParty\)/);
  assert.match(source, /case 'HEAL_PARTY_HP':[\s\S]*computePartyStats\(currentParty\)/);
  assert.match(source, /const computed = computePartyStats\(beforeParty\)/);
  assert.match(source, /const computed = computePartyStats\(beforeParty\)[\s\S]*const maximumHp = computed\.partyStats\.hp/);
});
