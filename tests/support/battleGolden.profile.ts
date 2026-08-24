import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ENEMIES } from '../../src/data/enemies.ts';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { executeBattle, executeBattleWithSeed } from '../../src/game/battle.ts';
import { getProductionBattleTelemetry } from '../../src/game/battle.ts';
import {
  executeBattleCandidateFromSeed,
  executeBattleCandidateDiagnosticFromSeed,
  executeBattleTapeDiagnostic,
  convertBattleSemanticEvents,
  getBattlePreparationMeasurement,
  prepareBattleExecution,
  projectBattleCombatants,
  projectBattleProtocolInput,
  resetBattlePreparationMeasurementForTesting,
} from '../../src/game/battleCandidate.ts';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement, executeBattleProtocol, getBattleRngDoubleSequence, getBattleRngVersion } from '../../src/game/battleKernel.ts';
import { createBattleReplayMetadata } from '../../src/game/battleReplay.ts';
import { encodeBattleProtocolInput } from '../../src/game/battleProtocol.ts';
import { BATTLE_ENGINE_FLAG_END_CHECKPOINT, BATTLE_ENGINE_FLAG_SEEDED_RNG } from '../../src/game/generated/battleProtocol.generated.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { getEncounterEnemyWithScaling } from '../../src/game/enemyScaling.ts';
import { computeCharacterStats } from '../../src/game/characterComputation.ts';
import { computePartyStats } from '../../src/game/partyComputation.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { EnemyDef, GameState, Party, RoomType, TerrainEffectKey } from '../../src/types/index.ts';
import {
  digestBattleGolden,
  type BattleGoldenCase,
  type BattleGoldenDigest,
} from './battleGoldenHarness.ts';

const ROOT = process.cwd();
const SAMPLE_SAVE_PATH = resolve(ROOT, 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz');
const MULTI_EXPEDITION_SAVE_PATH = resolve(
  ROOT,
  'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz',
);
const GOLDEN_V1_PATH = resolve(ROOT, 'tests/fixtures/battleGolden.v1.json');
const REFERENCE_CONTRACT_V1_PATH = resolve(ROOT, 'tests/fixtures/battleReferenceContract.v1.json');
const GOLDEN_V2_PATH = resolve(ROOT, 'tests/fixtures/battleGolden.v2.json');
const REFERENCE_CONTRACT_V2_PATH = resolve(ROOT, 'tests/fixtures/battleReferenceContract.v2.json');

type BattleReferenceContract = {
  contractVersion: number;
  randomnessMode: string;
  referenceRunner: string;
  referenceSha256: string;
  goldenFixture: string;
  goldenSha256: string;
  goldenCaseIds: string[];
  requiredOutcomes: string[];
  canonicalResultFields: string[];
};

type SaveEnvelope = { saveDataCompressed: string };

function loadSampleState(path: string): GameState {
  const envelope = JSON.parse(readFileSync(path, 'utf8')) as SaveEnvelope;
  return hydrateGameState(
    JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState,
  );
}

function requireParty(state: GameState, index: number): Party {
  const party = state.parties[index];
  if (!party) throw new Error(`Missing sample party ${index + 1}`);
  return party;
}

function scaledEnemy(
  id: number,
  dungeonId: number,
  floorNumber: number,
  roomType: RoomType,
): EnemyDef {
  const enemy = ENEMIES.find((entry) => entry.id === id);
  const dungeon = getDungeonById(dungeonId);
  if (!enemy || !dungeon) throw new Error(`Missing golden enemy ${id} or Expedition ${dungeonId}`);
  return getEncounterEnemyWithScaling(enemy, dungeon, floorNumber, roomType);
}

function battleCase(
  state: GameState,
  id: string,
  seed: number,
  partyIndex: number,
  enemyId: number,
  floorNumber: number,
  roomType: RoomType,
  terrainEffect?: TerrainEffectKey,
  initialPartyHp?: number,
  dungeonId = 8,
): BattleGoldenCase {
  const party = requireParty(state, partyIndex);
  return {
    id,
    seed,
    party,
    enemy: scaledEnemy(enemyId, dungeonId, floorNumber, roomType),
    bags: state.bags,
    initialPartyHp: initialPartyHp ?? party.currentHp,
    environment: { terrainEffect: terrainEffect ?? null },
  };
}

function savedPartyBossCase(state: GameState, partyIndex: number, seed: number): BattleGoldenCase {
  const party = requireParty(state, partyIndex);
  const dungeon = getDungeonById(party.selectedDungeonId);
  if (!dungeon) throw new Error(`Party ${party.id} selects missing Expedition ${party.selectedDungeonId}`);
  const bossFloor = dungeon.floors.at(-1);
  const bossRoom = bossFloor?.rooms.find((room) => room.type === 'battle_Boss');
  const bossId = bossRoom?.bossId ?? dungeon.bossId;
  if (!bossFloor || !bossId) throw new Error(`Expedition ${dungeon.id} is missing its boss encounter`);
  return battleCase(
    state,
    `saved-party-${party.id}-expedition-${dungeon.id}-boss`,
    seed,
    partyIndex,
    bossId,
    bossFloor.floorNumber,
    'battle_Boss',
    bossFloor.terrainEffect,
    party.currentHp,
    dungeon.id,
  );
}

export function createGoldenCases(): BattleGoldenCase[] {
  setLanguage('ja');
  const state = loadSampleState(SAMPLE_SAVE_PATH);
  const multiExpeditionState = loadSampleState(MULTI_EXPEDITION_SAVE_PATH);
  assert.deepEqual(
    multiExpeditionState.parties.map((party) => party.selectedDungeonId),
    [8, 7, 6, 5, 4, 3],
    'The multi-expedition regression save must retain its Expedition 8-to-3 party assignment',
  );
  const firstStrikeDefeat = battleCase(
    state,
    'first-strike-defeat',
    0x55aa7711,
    3,
    303,
    6,
    'battle_Elite',
    'terrain.enemy-high-ground',
    1,
  );
  firstStrikeDefeat.enemy = {
    ...firstStrikeDefeat.enemy,
    hp: 1_000_000_000_000,
    rangedAttack: 1_000_000_000,
    rangedNoA: Math.max(6, firstStrikeDefeat.enemy.rangedNoA),
    magicalAttack: 1_000_000_000,
    magicalNoA: Math.max(6, firstStrikeDefeat.enemy.magicalNoA),
    meleeAttack: 1_000_000_000,
    meleeNoA: Math.max(6, firstStrikeDefeat.enemy.meleeNoA),
  };
  return [
    battleCase(state, 'normal-domain-breaker-counter', 0x13579bdf, 0, 301, 1, 'battle_Normal'),
    battleCase(state, 'elite-counter-recounter', 0x2468ace1, 1, 325, 4, 'battle_Elite', 'terrain.echo-domain'),
    battleCase(state, 'oblivion-and-reanimate', 0x10203040, 2, 334, 6, 'battle_Normal', 'terrain.deletion'),
    battleCase(state, 'mimic-and-resonance', 0x89abcdef, 4, 270, 6, 'battle_Normal', 'terrain.transcendence'),
    firstStrikeDefeat,
    ...multiExpeditionState.parties.map((_, partyIndex) => savedPartyBossCase(
      multiExpeditionState,
      partyIndex,
      0x8e710001 + partyIndex,
    )),
  ];
}

const PINNED_HASHES = {
  reference: 'de13ff1bec298ac9f076229497d9716ea789358856bd7391ceb81fea5b9ba322',
  goldenV1: 'e71f11bf791f52315ea20febabfc31cf881e7a72a4154ee95fa5806aa6df8bf0',
  contractV1: 'a784c5b763dbbd62b1fef9529d21bcf76c0afe83bebf26556b595f7c5e8b7867',
  goldenV2: 'a06aa4eef0c53521b1d39a82fba1dc9b0c6aead444d306d4ac44b2a058afbfad',
  contractV2: 'b3f1159d91bc19061e555b45606f265d4fbe462e9572de2ef8e1c625e025668d',
} as const;

type BattleReferenceContractV2 = {
  contractVersion: number;
  locales: Array<'ja' | 'en' | 'zh-CN' | 'zh-TW'>;
  caseIds: string[];
  seeds: Record<string, string>;
  referenceRunner: string;
  referenceSha256: string;
  predecessorContractSha256: string;
  predecessorGoldenSha256: string;
  goldenFixture: string;
  goldenSha256: string;
};

const contractV1 = JSON.parse(readFileSync(REFERENCE_CONTRACT_V1_PATH, 'utf8')) as BattleReferenceContract;
const contractV2 = JSON.parse(readFileSync(REFERENCE_CONTRACT_V2_PATH, 'utf8')) as BattleReferenceContractV2;
const expectedV2 = JSON.parse(readFileSync(GOLDEN_V2_PATH, 'utf8')) as Record<
  string,
  Record<string, BattleGoldenDigest & { replayMetadata: ReturnType<typeof createBattleReplayMetadata> }>
>;

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function naturalFixtureSeed(fixture: BattleGoldenCase): bigint {
  return BigInt(fixture.seed >>> 0);
}

function executeNativePair(fixture: BattleGoldenCase, seed: bigint) {
  const seeded = executeBattleCandidateDiagnosticFromSeed(
    structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
    seed, getBattleRngVersion(), fixture.initialPartyHp,
    fixture.environment ? structuredClone(fixture.environment) : undefined,
  );
  const tape = getBattleRngDoubleSequence(seed, seeded.randomConsumed);
  const taped = executeBattleTapeDiagnostic(
    structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
    tape, fixture.initialPartyHp,
    fixture.environment ? structuredClone(fixture.environment) : undefined,
  );
  assert.equal(taped.randomConsumed, tape.length);
  assert.equal(taped.diagnosticDrawCount, tape.length);
  assert.equal(taped.protocolError, 0);
  return { seeded, taped, tape };
}

function assertNativeParity(identity: string, pair: ReturnType<typeof executeNativePair>): void {
  const { seeded, taped } = pair;
  assert.deepEqual(seeded.result, taped.result, `${identity}: localized result/property presence drift`);
  assert.deepEqual(seeded.protocolOutput.events, taped.protocolOutput.events, `${identity}: semantic event drift`);
  assert.deepEqual(seeded.protocolOutput.physicalThreatBag, taped.protocolOutput.physicalThreatBag, `${identity}: physical bag drift`);
  assert.deepEqual(seeded.protocolOutput.magicalThreatBag, taped.protocolOutput.magicalThreatBag, `${identity}: magical bag drift`);
  assert.equal(seeded.protocolOutput.outcome, taped.protocolOutput.outcome, `${identity}: outcome drift`);
  assert.equal(seeded.protocolOutput.partyHp, taped.protocolOutput.partyHp, `${identity}: party HP drift`);
  assert.equal(seeded.protocolOutput.enemyHp, taped.protocolOutput.enemyHp, `${identity}: enemy HP drift`);
  assert.equal(seeded.randomConsumed, taped.randomConsumed, `${identity}: cursor drift`);
  assert.equal(seeded.diagnosticDrawCount, taped.diagnosticDrawCount, `${identity}: diagnostic cursor drift`);
}

test('historical battle fixtures and contracts remain byte-identical after reference removal', () => {
  assert.equal(sha256(GOLDEN_V1_PATH), PINNED_HASHES.goldenV1);
  assert.equal(sha256(REFERENCE_CONTRACT_V1_PATH), PINNED_HASHES.contractV1);
  assert.equal(sha256(GOLDEN_V2_PATH), PINNED_HASHES.goldenV2);
  assert.equal(sha256(REFERENCE_CONTRACT_V2_PATH), PINNED_HASHES.contractV2);
  assert.equal(contractV1.referenceSha256, PINNED_HASHES.reference);
  assert.equal(contractV2.referenceSha256, PINNED_HASHES.reference);
  assert.equal(contractV2.predecessorContractSha256, PINNED_HASHES.contractV1);
  assert.equal(contractV2.predecessorGoldenSha256, PINNED_HASHES.goldenV1);
  assert.equal(contractV2.goldenSha256, PINNED_HASHES.goldenV2);
  assert.equal(contractV2.referenceRunner, 'src/game/battleTypeScriptReference.ts');
});

test('v2 contract case inventory and natural seeds remain exact', () => {
  const fixtures = createGoldenCases();
  assert.deepEqual(fixtures.map((fixture) => fixture.id), contractV2.caseIds);
  assert.deepEqual(
    Object.fromEntries(fixtures.map((fixture) => [fixture.id, naturalFixtureSeed(fixture).toString(16).padStart(16, '0')])),
    contractV2.seeds,
  );
});

test('corrected v2 oracle matches independent native seeded and tape execution in all locales', () => {
  const fixtures = createGoldenCases();
  for (const language of contractV2.locales) {
    for (const fixture of fixtures) {
      setLanguage(language);
      const seedHex = contractV2.seeds[fixture.id];
      assert.match(seedHex ?? '', /^[0-9a-f]{16}$/);
      const seed = BigInt(`0x${seedHex}`);
      const pair = executeNativePair(fixture, seed);
      const identity = `${fixture.id}:${language}`;
      assertNativeParity(identity, pair);
      const replayMetadata = createBattleReplayMetadata(seed, pair.seeded.rngVersion, pair.seeded.randomConsumed);
      assert.deepEqual(
        { ...digestBattleGolden({ randomDrawCount: pair.seeded.randomConsumed, result: { ...pair.seeded.result, replayMetadata } }), replayMetadata },
        expectedV2[language]![fixture.id],
        `${identity}: corrected v2 oracle drift`,
      );
    }
  }
  setLanguage('ja');
});

test('Expedition 6 natural seed retains 107 draws and grouped Resonance +12% in every locale', () => {
  const fixture = createGoldenCases().find((entry) => entry.id === 'saved-party-3-expedition-6-boss');
  assert.ok(fixture);
  const seed = 0x8e710003n;
  assert.equal(naturalFixtureSeed(fixture), seed);
  for (const language of contractV2.locales) {
    setLanguage(language);
    const pair = executeNativePair(fixture, seed);
    assertNativeParity(`${fixture.id}:${language}`, pair);
    assert.equal(pair.seeded.randomConsumed, 107);
    const groupedHeader = pair.seeded.result.log.find((entry) => (
      entry.actor === 'enemy' && entry.attackType === 'magical'
      && entry.hits === 3 && entry.isEnemyTargetHit !== true
    ));
    assert.ok(groupedHeader, `${language}: grouped three-hit magical header is missing`);
    assert.match(groupedHeader.action, /12%/);
  }
  setLanguage('ja');
});

test('Expedition 6 seed sweep retains native seeded/tape parity', () => {
  const fixture = createGoldenCases().find((entry) => entry.id === 'saved-party-3-expedition-6-boss');
  assert.ok(fixture);
  for (let offset = 0n; offset <= 0x3fn; offset += 1n) {
    const seed = 0x8e710000n + offset;
    assertNativeParity(`${fixture.id}:${seed.toString(16)}`, executeNativePair(fixture, seed));
  }
});

test('seed boundaries, repeated calls, and tape output ownership remain deterministic', () => {
  const fixture = createGoldenCases()[0]!;
  for (const seed of [0n, 1n, 0xffff_ffff_ffff_ffffn, 0x8000_0000_0000_1234n]) {
    const first = executeNativePair(fixture, seed);
    const ownedEvents = structuredClone(first.taped.protocolOutput.events);
    const second = executeNativePair(fixture, seed);
    assertNativeParity(`boundary:${seed}`, first);
    assert.deepEqual(second.seeded.protocolOutput, first.seeded.protocolOutput);
    assert.deepEqual(second.taped.protocolOutput, first.taped.protocolOutput);
    assert.deepEqual(first.taped.protocolOutput.events, ownedEvents, 'later arena reuse mutated prior output');
  }
});

test('projection and production entry point use one direct-arena native seeded call without mutating inputs', () => {
  const productionSource = readFileSync(resolve(ROOT, 'src/game/battle.ts'), 'utf8');
  assert.equal(productionSource.includes('TapeDiagnostic'), false);
  for (const fixture of createGoldenCases()) {
    const party = structuredClone(fixture.party);
    const enemy = structuredClone(fixture.enemy);
    const bags = structuredClone(fixture.bags);
    const beforeInputs = structuredClone({ party, enemy, bags });
    const seed = naturalFixtureSeed(fixture);
    projectBattleCombatants(party, enemy, fixture.initialPartyHp ?? party.currentHp, fixture.environment);
    assert.deepEqual({ party, enemy, bags }, beforeInputs, 'projection must leave Party, Enemy, and bags JSON-identical');
    const expected = executeBattleCandidateFromSeed(
      structuredClone(party), structuredClone(enemy), structuredClone(bags), seed,
      getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
    );
    const beforeDraws = getProductionBattleTelemetry().randomConsumed;
    resetBattlePreparationMeasurementForTesting();
    beginBattleKernelMeasurement();
    let acquisitions = 0;
    const result = withBattleSeedSourceForTesting(() => {
      acquisitions += 1;
      return seed;
    }, () => executeBattle(party, enemy, bags, fixture.initialPartyHp, fixture.environment));
    const measurement = endBattleKernelMeasurement();
    assert.deepEqual({ ...result, replayMetadata: undefined }, { ...expected.result, replayMetadata: undefined });
    assert.equal(result.replayMetadata.seedHex, seed.toString(16).padStart(16, '0'));
    assert.equal(result.replayMetadata.randomDrawCount, expected.randomConsumed);
    assert.equal(getProductionBattleTelemetry().randomConsumed - beforeDraws, expected.randomConsumed);
    assert.equal(acquisitions, 1);
    assert.equal(measurement.calls, 1);
    assert.equal(measurement.encodedInputAllocations, 0);
    assert.equal(measurement.inputArenaCopies, 0);
    assert.equal(measurement.outputBufferCopies, 0);
    assert.equal(measurement.decodedEventObjectAllocations, 0);
    assert.equal(measurement.decodedBagEntryObjectAllocations, 0);
    assert.deepEqual(getBattlePreparationMeasurement(), {
      combatantProjections: 1,
      projectionPartyStatusFallbacks: 0,
      productionPreparations: 1,
      productionPartyStatusComputations: 1,
      productionNarrations: 1,
      productionResultOnlyResolutions: 0,
      diagnosticNarrationPreparations: 0,
    });
    assert.deepEqual({ party, enemy, bags }, beforeInputs, 'production execution must leave Party, Enemy, and bags JSON-identical');
  }
});

test('prepared protocol and narration share one projection without retaining mutable projection objects', () => {
  const fixture = createGoldenCases()[0]!;
  const partyStatus = computePartyStats(fixture.party);
  const statusBefore = structuredClone(partyStatus);
  resetBattlePreparationMeasurementForTesting();
  const prepared = prepareBattleExecution(
    fixture.party, fixture.enemy, fixture.bags, [], fixture.initialPartyHp,
    { ...fixture.environment, partyStatus },
    BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
  );
  for (const projected of prepared.input.combatants) {
    const narrated = prepared.narration.combatants.get(projected.id)!;
    assert.equal(narrated.kind, projected.kind);
    assert.equal(narrated.elementalOffense, projected.elementalOffense);
    assert.equal(narrated.elementalOffenseValue, projected.elementalOffenseValue);
    assert.equal(narrated.physicalDefense, projected.physicalDefense);
    assert.deepEqual([...narrated.abilities], projected.abilities.map(({ id, level }) => [id, level]));
  }
  const first = prepared.input.combatants[0]!;
  const narrated = prepared.narration.combatants.get(first.id)!;
  const ability = first.abilities[0];
  if (ability) narrated.abilities.set(ability.id, ability.level + 100);
  assert.deepEqual(partyStatus, statusBefore, 'narration mutation must not mutate authoritative computed status');
  if (ability) assert.equal(first.abilities[0]!.level, ability.level, 'narration mutation must not mutate protocol projection');
  assert.deepEqual(getBattlePreparationMeasurement(), {
    combatantProjections: 1,
    projectionPartyStatusFallbacks: 0,
    productionPreparations: 1,
    productionPartyStatusComputations: 0,
    productionNarrations: 0,
    productionResultOnlyResolutions: 0,
    diagnosticNarrationPreparations: 0,
  });
});

test('Gehenna base Resonance is projected once and copied exactly into narration', () => {
  const fixture = createGoldenCases()[0]!;
  const party = { ...fixture.party, deity: { ...fixture.party.deity, name: 'God of Resonance' } };
  const partyStatus = computePartyStats(party);
  resetBattlePreparationMeasurementForTesting();
  const prepared = prepareBattleExecution(
    party, fixture.enemy, fixture.bags, [], fixture.initialPartyHp,
    { terrainEffect: 'terrain.gehenna', partyStatus },
  );
  for (const [index, character] of party.characters.entries()) {
    const projected = prepared.input.combatants.find(({ id }) => id === character.id)!;
    const expected = computeCharacterStats(character, party.level, index + 1).abilities
      .find(({ id }) => id === 'resonance')?.level;
    const projectedLevel = projected.abilities.find(({ id }) => id === 'resonance')?.level;
    assert.equal(projectedLevel, expected);
    assert.equal(prepared.narration.combatants.get(character.id)!.abilities.get('resonance'), expected);
  }
  assert.equal(getBattlePreparationMeasurement().combatantProjections, 1);
});

test('direct structured and encoded seeded protocol boundaries remain identical', () => {
  const fixture = createGoldenCases()[0]!;
  const seed = naturalFixtureSeed(fixture);
  const seeded = executeBattleCandidateDiagnosticFromSeed(
    structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
    seed, getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
  );
  const input = projectBattleProtocolInput(
    structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags), [],
    fixture.initialPartyHp, fixture.environment,
    BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
  );
  input.seed = seed;
  input.rngVersion = getBattleRngVersion();
  const encoded = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.deepEqual(encoded, seeded.protocolOutput);
  resetBattlePreparationMeasurementForTesting();
  const converted = convertBattleSemanticEvents(
    encoded, fixture.party, fixture.enemy, fixture.initialPartyHp, fixture.environment,
  );
  assert.deepEqual(converted, seeded.result);
  assert.deepEqual(getBattlePreparationMeasurement(), {
    combatantProjections: 1,
    projectionPartyStatusFallbacks: 1,
    productionPreparations: 0,
    productionPartyStatusComputations: 0,
    productionNarrations: 0,
    productionResultOnlyResolutions: 0,
    diagnosticNarrationPreparations: 1,
  });
});

test('result-only production execution preserves authoritative seeded results without narration', () => {
  const fixture = createGoldenCases()[0]!;
  const seed = naturalFixtureSeed(fixture);
  resetBattlePreparationMeasurementForTesting();
  beginBattleKernelMeasurement();
  const full = executeBattleWithSeed(
    structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
    seed, getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
  );
  const resultOnly = executeBattleWithSeed(
    structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
    seed, getBattleRngVersion(), fixture.initialPartyHp, fixture.environment, { outputMode: 'result-only' },
  );
  const measurement = endBattleKernelMeasurement();
  const { log: _log, ...expectedResolution } = full;
  assert.deepEqual(resultOnly, expectedResolution);
  assert.equal('log' in resultOnly, false);
  assert.equal(measurement.calls, 2);
  assert.equal(measurement.encodedInputAllocations + measurement.inputArenaCopies + measurement.outputBufferCopies, 0);
  assert.deepEqual(getBattlePreparationMeasurement(), {
    combatantProjections: 2,
    projectionPartyStatusFallbacks: 0,
    productionPreparations: 2,
    productionPartyStatusComputations: 2,
    productionNarrations: 1,
    productionResultOnlyResolutions: 1,
    diagnosticNarrationPreparations: 0,
  });
});
