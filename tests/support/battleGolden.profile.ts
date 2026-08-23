import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ENEMIES } from '../../src/data/enemies.ts';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { executeBattle } from '../../src/game/battle.ts';
import { getProductionBattleTelemetry } from '../../src/game/battle.ts';
import {
  executeBattleCandidateFromTape,
  executeBattleCandidateFromSeed,
  executeBattleCandidateFromWindow,
  executeBattleRawCandidateFromTape,
  convertBattleSemanticEvents,
  projectBattleProtocolInput,
} from '../../src/game/battleCandidate.ts';
import { executeBattle as executeTypeScriptBattle } from '../../src/game/battleTypeScriptReference.ts';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement, executeBattleProtocol, getBattleRngDoubleSequence, getBattleRngVersion } from '../../src/game/battleKernel.ts';
import { getBattleKernelAbiVersion } from '../../src/game/battleKernel.ts';
import { createBattleReplayMetadata } from '../../src/game/battleReplay.ts';
import { encodeBattleProtocolInput } from '../../src/game/battleProtocol.ts';
import { BATTLE_ENGINE_FLAG_END_CHECKPOINT, BATTLE_ENGINE_FLAG_SEEDED_RNG, BATTLE_PROTOCOL_VERSION } from '../../src/game/generated/battleProtocol.generated.ts';
import { gameplayRandom, withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { getEncounterEnemyWithScaling } from '../../src/game/enemyScaling.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { EnemyDef, GameState, Party, RoomType, TerrainEffectKey } from '../../src/types/index.ts';
import {
  assertBattleRunnerParity,
  canonicalBattleJson,
  digestBattleGolden,
  recordBattleGolden,
  replayBattleGolden,
  type BattleGoldenCase,
  type BattleGoldenDigest,
} from './battleGoldenHarness.ts';

const ROOT = process.cwd();
const SAMPLE_SAVE_PATH = resolve(ROOT, 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz');
const MULTI_EXPEDITION_SAVE_PATH = resolve(
  ROOT,
  'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz',
);
const GOLDEN_PATH = resolve(ROOT, 'tests/fixtures/battleGolden.v1.json');
const REFERENCE_CONTRACT_PATH = resolve(ROOT, 'tests/fixtures/battleReferenceContract.v1.json');
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

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

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

const expected = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as Record<string, BattleGoldenDigest>;
const referenceContract = JSON.parse(
  readFileSync(REFERENCE_CONTRACT_PATH, 'utf8'),
) as BattleReferenceContract;
const capture = process.env.BATTLE_GOLDEN_CAPTURE === '1';

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function naturalFixtureSeed(fixture: BattleGoldenCase): bigint {
  return BigInt(fixture.seed >>> 0);
}

function assertNaturalV2Seeds(fixtures: readonly BattleGoldenCase[]): void {
  const actual = Object.fromEntries(fixtures.map((fixture) => [
    fixture.id,
    naturalFixtureSeed(fixture).toString(16).padStart(16, '0'),
  ]));
  assert.deepEqual(actual, {
    'normal-domain-breaker-counter': '0000000013579bdf',
    'elite-counter-recounter': '000000002468ace1',
    'oblivion-and-reanimate': '0000000010203040',
    'mimic-and-resonance': '0000000089abcdef',
    'first-strike-defeat': '0000000055aa7711',
    'saved-party-1-expedition-8-boss': '000000008e710001',
    'saved-party-2-expedition-7-boss': '000000008e710002',
    'saved-party-3-expedition-6-boss': '000000008e710003',
    'saved-party-4-expedition-5-boss': '000000008e710004',
    'saved-party-5-expedition-4-boss': '000000008e710005',
    'saved-party-6-expedition-3-boss': '000000008e710006',
  });
  assert.deepEqual(
    fixtures.filter((fixture) => fixture.id.startsWith('saved-party-')).map(naturalFixtureSeed),
    [0x8e710001n, 0x8e710002n, 0x8e710003n, 0x8e710004n, 0x8e710005n, 0x8e710006n],
  );
}

function executeFrozenReferenceFromTape(fixture: BattleGoldenCase, tape: readonly number[]) {
  let cursor = 0;
  const source = () => {
    if (cursor >= tape.length) throw new Error(`${fixture.id}: frozen reference exceeded seeded tape`);
    return tape[cursor++]!;
  };
  const previousRandom = Math.random;
  Math.random = source;
  try {
    const result = withGameplayRandomSourceForTesting(source, () => executeTypeScriptBattle(
      structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
      fixture.initialPartyHp, fixture.environment ? structuredClone(fixture.environment) : undefined,
    ));
    assert.equal(cursor, tape.length, `${fixture.id}: frozen reference did not consume the complete seeded tape`);
    return result;
  } finally {
    Math.random = previousRandom;
  }
}

test('guarded v2 seeded contract generation performs triple differential parity', () => {
  if (process.env.BATTLE_GOLDEN_V2_CAPTURE !== 'native-seeded-v2-reviewed') return;
  const locales = ['ja', 'en', 'zh-CN', 'zh-TW'] as const;
  const fixtureDocument: Record<string, Record<string, BattleGoldenDigest & { replayMetadata: ReturnType<typeof createBattleReplayMetadata> }>> = {};
  const seeds: Record<string, string> = {};
  const fixtures = createGoldenCases();
  assertNaturalV2Seeds(fixtures);
  for (const language of locales) {
    setLanguage(language);
    fixtureDocument[language] = {};
    for (const fixture of fixtures) {
      setLanguage(language);
      const seed = naturalFixtureSeed(fixture);
      const seeded = executeBattleCandidateFromSeed(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        seed, getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
      );
      const tape = getBattleRngDoubleSequence(seed, seeded.randomConsumed);
      const reference = executeFrozenReferenceFromTape(fixture, tape);
      const taped = executeBattleCandidateFromWindow(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        tape, fixture.initialPartyHp, fixture.environment,
      );
      assert.equal(canonicalBattleJson({ randomDrawCount: tape.length, result: taped.result }), canonicalBattleJson({ randomDrawCount: tape.length, result: reference }), `${fixture.id}:${language}: frozen/native-tape canonical mismatch`);
      assert.equal(canonicalBattleJson({ randomDrawCount: tape.length, result: seeded.result }), canonicalBattleJson({ randomDrawCount: tape.length, result: reference }), `${fixture.id}:${language}: frozen/native-seeded canonical mismatch`);
      assert.deepEqual(seeded.result, taped.result, `${fixture.id}:${language}: native optional-property presence mismatch`);
      assert.equal(taped.randomConsumed, tape.length);
      assert.equal(seeded.randomConsumed, tape.length);
      assert.equal(seeded.diagnosticDrawCount, tape.length);
      const replayMetadata = createBattleReplayMetadata(seed, seeded.rngVersion, seeded.randomConsumed);
      seeds[fixture.id] = replayMetadata.seedHex;
      const snapshot = { randomDrawCount: seeded.randomConsumed, result: { ...seeded.result, replayMetadata } };
      fixtureDocument[language]![fixture.id] = { ...digestBattleGolden(snapshot), replayMetadata };
    }
  }
  setLanguage('ja');
  assert.deepEqual(
    seeds,
    Object.fromEntries(fixtures.map((fixture) => [
      fixture.id,
      naturalFixtureSeed(fixture).toString(16).padStart(16, '0'),
    ])),
    'The v2 contract must use every fixture\'s declared natural seed',
  );
  writeFileSync(GOLDEN_V2_PATH, `${JSON.stringify(fixtureDocument, null, 2)}\n`);
  const contract = {
    contractVersion: 2,
    randomnessMode: 'native-seeded-xoshiro256starstar',
    migrationReason: 'intentional native RNG ownership cutover',
    rngVersion: getBattleRngVersion(),
    seedEncoding: '16 lowercase hexadecimal characters encoding unsigned u64; values[0] low, values[1] high',
    protocolVersion: BATTLE_PROTOCOL_VERSION,
    abiVersion: getBattleKernelAbiVersion(),
    locales,
    caseIds: fixtures.map((fixture) => fixture.id),
    seeds,
    canonicalResultFields: [...referenceContract.canonicalResultFields, 'replayMetadata'],
    referenceRunner: referenceContract.referenceRunner,
    referenceSha256: sha256(resolve(ROOT, referenceContract.referenceRunner)),
    predecessorContract: 'tests/fixtures/battleReferenceContract.v1.json',
    predecessorContractSha256: sha256(REFERENCE_CONTRACT_PATH),
    predecessorGoldenFixture: referenceContract.goldenFixture,
    predecessorGoldenSha256: sha256(GOLDEN_PATH),
    goldenFixture: 'tests/fixtures/battleGolden.v2.json',
    goldenSha256: sha256(GOLDEN_V2_PATH),
  };
  writeFileSync(REFERENCE_CONTRACT_V2_PATH, `${JSON.stringify(contract, null, 2)}\n`);
  console.info('BATTLE_GOLDEN_V2_CAPTURE', JSON.stringify({ goldenSha256: contract.goldenSha256, contractSha256: sha256(REFERENCE_CONTRACT_V2_PATH) }));
});

test('v2 seeded fixture and contract remain pinned when present', () => {
  if (!existsSync(GOLDEN_V2_PATH) || !existsSync(REFERENCE_CONTRACT_V2_PATH)) return;
  const contract = JSON.parse(readFileSync(REFERENCE_CONTRACT_V2_PATH, 'utf8')) as { contractVersion: number; goldenFixture: string; goldenSha256: string; referenceSha256: string; predecessorGoldenSha256: string };
  assert.equal(contract.contractVersion, 2);
  assert.equal(sha256(resolve(ROOT, contract.goldenFixture)), contract.goldenSha256);
  assert.equal(contract.referenceSha256, referenceContract.referenceSha256);
  assert.equal(contract.predecessorGoldenSha256, referenceContract.goldenSha256);
});

test('v2 contract seeds equal the natural fixture seeds', () => {
  const fixtures = createGoldenCases();
  assertNaturalV2Seeds(fixtures);
  const contract = JSON.parse(readFileSync(REFERENCE_CONTRACT_V2_PATH, 'utf8')) as {
    seeds: Record<string, string>;
  };
  assert.deepEqual(
    contract.seeds,
    Object.fromEntries(fixtures.map((fixture) => [
      fixture.id,
      naturalFixtureSeed(fixture).toString(16).padStart(16, '0'),
    ])),
  );
});

test('Expedition 6 natural seed retains complete grouped Resonance parity in every locale', () => {
  const fixture = createGoldenCases().find((entry) => entry.id === 'saved-party-3-expedition-6-boss');
  assert.ok(fixture);
  const seed = 0x8e710003n;
  assert.equal(naturalFixtureSeed(fixture), seed);
  for (const language of ['ja', 'en', 'zh-CN', 'zh-TW'] as const) {
    setLanguage(language);
    const seeded = executeBattleCandidateFromSeed(
      structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
      seed, getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
    );
    assert.equal(seeded.randomConsumed, 107, `${language}: natural-seed draw count drifted`);
    assert.equal(seeded.diagnosticDrawCount, 107, `${language}: diagnostic draw count drifted`);
    const tape = getBattleRngDoubleSequence(seed, seeded.randomConsumed);
    const reference = executeFrozenReferenceFromTape(fixture, tape);
    const taped = executeBattleCandidateFromWindow(
      structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
      tape, fixture.initialPartyHp, fixture.environment,
    );
    const referenceJson = canonicalBattleJson({ randomDrawCount: 107, result: reference });
    assert.equal(canonicalBattleJson({ randomDrawCount: 107, result: taped.result }), referenceJson);
    assert.equal(canonicalBattleJson({ randomDrawCount: 107, result: seeded.result }), referenceJson);
    assert.deepEqual(seeded.result, taped.result, `${language}: optional-property presence drifted`);
    assert.deepEqual(
      seeded.protocolOutput.events,
      taped.protocolOutput.events,
      `${language}: ordered native semantic facts drifted`,
    );
    const groupedHeader = seeded.result.log.find((entry) => (
      entry.actor === 'enemy'
      && entry.attackType === 'magical'
      && entry.hits === 3
      && entry.isEnemyTargetHit !== true
    ));
    assert.ok(groupedHeader, `${language}: grouped three-hit magical header is missing`);
    assert.match(groupedHeader.action, /12%/, `${language}: grouped Resonance must render +12%`);
  }
  setLanguage('ja');
});

test('Expedition 6 presentation-rich deterministic seed sweep retains triple parity', () => {
  const fixture = createGoldenCases().find((entry) => entry.id === 'saved-party-3-expedition-6-boss');
  assert.ok(fixture);
  for (const language of ['ja', 'en', 'zh-CN', 'zh-TW'] as const) {
    setLanguage(language);
    for (let offset = 0n; offset <= 0x3fn; offset += 1n) {
      const seed = 0x8e710000n + offset;
      const seeded = executeBattleCandidateFromSeed(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        seed, getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
      );
      const tape = getBattleRngDoubleSequence(seed, seeded.randomConsumed);
      const reference = executeFrozenReferenceFromTape(fixture, tape);
      const taped = executeBattleCandidateFromWindow(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        tape, fixture.initialPartyHp, fixture.environment,
      );
      const expectedJson = canonicalBattleJson({ randomDrawCount: tape.length, result: reference });
      const identity = `${fixture.id}:${language}:${seed.toString(16).padStart(16, '0')}`;
      assert.equal(canonicalBattleJson({ randomDrawCount: tape.length, result: taped.result }), expectedJson, `${identity}: tape mismatch`);
      assert.equal(canonicalBattleJson({ randomDrawCount: tape.length, result: seeded.result }), expectedJson, `${identity}: seeded mismatch`);
      assert.deepEqual(seeded.protocolOutput.events, taped.protocolOutput.events, `${identity}: semantic fact mismatch`);
      assert.equal(taped.randomConsumed, tape.length, `${identity}: tape cursor mismatch`);
      assert.equal(seeded.diagnosticDrawCount, tape.length, `${identity}: seeded cursor mismatch`);
    }
  }
  setLanguage('ja');
});

test('v2 authoritative fixture retains all-locale triple differential parity', () => {
  const contract = JSON.parse(readFileSync(REFERENCE_CONTRACT_V2_PATH, 'utf8')) as {
    locales: Array<'ja' | 'en' | 'zh-CN' | 'zh-TW'>;
    seeds: Record<string, string>;
  };
  const expectedV2 = JSON.parse(readFileSync(GOLDEN_V2_PATH, 'utf8')) as Record<string, Record<string, BattleGoldenDigest & { replayMetadata: ReturnType<typeof createBattleReplayMetadata> }>>;
  for (const language of contract.locales) {
    for (const fixture of createGoldenCases()) {
      setLanguage(language);
      const seedHex = contract.seeds[fixture.id];
      assert.match(seedHex ?? '', /^[0-9a-f]{16}$/);
      const seed = BigInt(`0x${seedHex}`);
      const seeded = executeBattleCandidateFromSeed(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        seed, getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
      );
      const tape = getBattleRngDoubleSequence(seed, seeded.randomConsumed);
      const reference = executeFrozenReferenceFromTape(fixture, tape);
      const taped = executeBattleCandidateFromWindow(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        tape, fixture.initialPartyHp, fixture.environment,
      );
      const referenceJson = canonicalBattleJson({ randomDrawCount: tape.length, result: reference });
      assert.equal(canonicalBattleJson({ randomDrawCount: tape.length, result: taped.result }), referenceJson);
      assert.equal(canonicalBattleJson({ randomDrawCount: tape.length, result: seeded.result }), referenceJson);
      assert.deepEqual(seeded.result, taped.result);
      const replayMetadata = createBattleReplayMetadata(seed, seeded.rngVersion, seeded.randomConsumed);
      assert.deepEqual(
        { ...digestBattleGolden({ randomDrawCount: seeded.randomConsumed, result: { ...seeded.result, replayMetadata } }), replayMetadata },
        expectedV2[language]![fixture.id],
        `${fixture.id}:${language}: v2 authoritative digest drift`,
      );
    }
  }
  setLanguage('ja');
});

test('battle reference source and golden fixture match the frozen contract', () => {
  assert.equal(referenceContract.contractVersion, 1);
  assert.equal(referenceContract.randomnessMode, 'typescript-ordered-tape');
  assert.equal(
    sha256(resolve(ROOT, referenceContract.referenceRunner)),
    referenceContract.referenceSha256,
    'The TypeScript battle reference changed without an explicit contract revision',
  );
  assert.equal(
    sha256(resolve(ROOT, referenceContract.goldenFixture)),
    referenceContract.goldenSha256,
    'The battle golden fixture changed during deterministic migration',
  );
  assert.deepEqual(Object.keys(expected), referenceContract.goldenCaseIds);
});

test('battle golden fixtures lock complete results and random consumption', () => {
  const fixtures = createGoldenCases();
  assert.deepEqual(fixtures.map((fixture) => fixture.id), referenceContract.goldenCaseIds);
  const recordings = fixtures.map((fixture) => {
    const recording = recordBattleGolden(executeTypeScriptBattle, fixture);
    const result = recording.snapshot.result as Record<string, unknown>;
    assert.deepEqual(Object.keys(result), referenceContract.canonicalResultFields, `${fixture.id}: result shape drifted`);
    return [fixture.id, digestBattleGolden(recording.snapshot)] as const;
  });
  const actual = Object.fromEntries(recordings);
  assert.deepEqual(
    [...new Set(recordings.map(([, digest]) => digest.outcome))].sort(),
    [...referenceContract.requiredOutcomes].sort(),
    'The frozen golden inventory must retain victory, draw, and defeat coverage',
  );

  if (capture) {
    console.info('BATTLE_GOLDEN_CAPTURE', JSON.stringify(actual, null, 2));
    return;
  }
  assert.deepEqual(actual, expected);
});

test('record/replay detects candidate output and random-consumption drift', () => {
  const fixtures = createGoldenCases();
  for (const fixture of fixtures) {
    const reference = recordBattleGolden(executeTypeScriptBattle, fixture);
    const candidate = executeBattleCandidateFromTape(
      structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
      reference.randomTape, fixture.initialPartyHp, fixture.environment,
    );
    assert.equal(canonicalBattleJson({ randomDrawCount: reference.randomTape.length, result: candidate }), canonicalBattleJson(reference.snapshot));
  }

  const fixture = fixtures[0]!;
  assert.throws(
    () => assertBattleRunnerParity(
      executeTypeScriptBattle,
      (...args) => {
        Math.random();
        return executeTypeScriptBattle(...args);
      },
      fixture,
    ),
    /unexpected random draw|recorded random draws|candidate battle result differs/,
  );
  assert.throws(
    () => assertBattleRunnerParity(
      executeTypeScriptBattle,
      (...args) => {
        const result = executeTypeScriptBattle(...args);
        return { ...result, partyHp: result.partyHp + 1 };
      },
      fixture,
    ),
    /candidate battle result differs/,
  );
});

test('Part 1.9B independently reconstructs the complete frozen result through one measured execution call', () => {
  for (const fixture of createGoldenCases()) {
    const reference = recordBattleGolden(executeTypeScriptBattle, fixture);
    beginBattleKernelMeasurement();
    const result = executeBattleCandidateFromTape(
      structuredClone(fixture.party),
      structuredClone(fixture.enemy),
      structuredClone(fixture.bags),
      reference.randomTape,
      fixture.initialPartyHp,
      fixture.environment ? structuredClone(fixture.environment) : undefined,
    );
    const measurement = endBattleKernelMeasurement();
    const candidate = { randomDrawCount: reference.randomTape.length, result };
    assert.equal(canonicalBattleJson(candidate), canonicalBattleJson(reference.snapshot), `${fixture.id}: complete candidate mismatch`);
    assert.equal(measurement.calls, 1, `${fixture.id}: shadow candidate must use one measured Wasm call`);
    assert.ok(measurement.inputBytes > 0, `${fixture.id}: shadow candidate input was not measured`);
    assert.ok(measurement.outputBytes > 0, `${fixture.id}: shadow candidate output was not measured`);
  }
});

test('production entry point uses one native seeded Wasm call and preserves input immutability', () => {
  const productionSource = readFileSync(resolve(ROOT, 'src/game/battle.ts'), 'utf8');
  assert.equal(productionSource.includes('reserveGameplayRandomTape'), false);
  assert.equal(productionSource.includes('executeBattleCandidateFromWindow'), false);
  for (const fixture of createGoldenCases()) {
    const party = structuredClone(fixture.party);
    const enemy = structuredClone(fixture.enemy);
    const bags = structuredClone(fixture.bags);
    const beforeInputs = structuredClone({ party, enemy, bags });
    const seed = BigInt(fixture.seed >>> 0);
    const expected = executeBattleCandidateFromSeed(
      structuredClone(party), structuredClone(enemy), structuredClone(bags), seed,
      getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
    );
    const beforeDraws = getProductionBattleTelemetry().randomConsumed;
    beginBattleKernelMeasurement();
    let acquisitions = 0;
    const result = withBattleSeedSourceForTesting(() => { acquisitions += 1; return seed; }, () => (
      executeBattle(party, enemy, bags, fixture.initialPartyHp, fixture.environment)
    ));
    const measurement = endBattleKernelMeasurement();
    assert.deepEqual({ ...result, replayMetadata: undefined }, { ...expected.result, replayMetadata: undefined }, `${fixture.id}: production mismatch`);
    assert.equal(result.replayMetadata.seedHex, seed.toString(16).padStart(16, '0'));
    assert.equal(result.replayMetadata.randomDrawCount, expected.randomConsumed);
    assert.equal(getProductionBattleTelemetry().randomConsumed - beforeDraws, expected.randomConsumed);
    assert.equal(acquisitions, 1);
    assert.equal(measurement.calls, 1, `${fixture.id}: production must use one Wasm call`);
    assert.equal(measurement.encodedInputAllocations, 0, `${fixture.id}: production must not allocate an encoded input buffer`);
    assert.equal(measurement.inputArenaCopies, 0, `${fixture.id}: production must write directly into the input arena`);
    assert.equal(measurement.outputBufferCopies, 0, `${fixture.id}: production must decode directly from the output arena`);
    assert.deepEqual({ party, enemy, bags }, beforeInputs, `${fixture.id}: production mutated its inputs`);
  }
});

test('all four locales retain exact complete reference/candidate narration parity', () => {
  const fixtures = createGoldenCases();
  for (const language of ['ja', 'en', 'zh-CN', 'zh-TW'] as const) {
    setLanguage(language);
    for (const fixture of fixtures) {
      const reference = recordBattleGolden(executeTypeScriptBattle, fixture);
      const result = executeBattleCandidateFromTape(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        reference.randomTape, fixture.initialPartyHp, fixture.environment,
      );
      assert.equal(
        canonicalBattleJson({ randomDrawCount: reference.randomTape.length, result }),
        canonicalBattleJson(reference.snapshot),
        `${fixture.id}:${language}: localized candidate mismatch`,
      );
    }
  }
  setLanguage('ja');
});

test('Part 2A battle-local seeded RNG exactly matches equivalent xoshiro tape across golden cases and locales', () => {
  const fixtures = createGoldenCases();
  const extraSeeds = [0n, 1n, 0xffff_ffff_ffff_ffffn, 0x8000_0000_0000_1234n];
  const cases = fixtures.map((fixture) => ({ fixture, seed: BigInt(fixture.seed >>> 0) }));
  for (const seed of extraSeeds) cases.push({ fixture: fixtures[0]!, seed });

  for (const language of ['ja', 'en', 'zh-CN', 'zh-TW'] as const) {
    setLanguage(language);
    for (const { fixture, seed } of cases) {
      beginBattleKernelMeasurement();
      const seeded = executeBattleCandidateFromSeed(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        seed, getBattleRngVersion(), fixture.initialPartyHp,
        fixture.environment ? structuredClone(fixture.environment) : undefined,
      );
      const measurement = endBattleKernelMeasurement();
      assert.equal(measurement.calls, 1, `${fixture.id}:${language}:${seed}: seeded execution must use one Wasm call`);
      assert.equal(measurement.encodedInputAllocations, 0, `${fixture.id}:${language}:${seed}: direct input allocated a full encoded buffer`);
      assert.equal(measurement.inputArenaCopies, 0, `${fixture.id}:${language}:${seed}: direct input copied a full encoded buffer`);
      assert.equal(measurement.outputBufferCopies, 0, `${fixture.id}:${language}:${seed}: direct output copied a full arena buffer`);
      assert.equal(seeded.inputCapacity, 0, `${fixture.id}:${language}:${seed}: seeded input encoded a tape`);
      assert.equal(seeded.seed, BigInt.asUintN(64, seed));
      assert.equal(seeded.randomConsumed, seeded.diagnosticDrawCount);

      const encodedInput = projectBattleProtocolInput(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags), [],
        fixture.initialPartyHp, fixture.environment ? structuredClone(fixture.environment) : undefined,
        BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
      );
      encodedInput.seed = seed;
      encodedInput.rngVersion = getBattleRngVersion();
      const encodedOutput = executeBattleProtocol(encodeBattleProtocolInput(encodedInput));
      assert.deepEqual(encodedOutput, seeded.protocolOutput, `${fixture.id}:${language}:${seed}: direct/encoded protocol output mismatch`);
      assert.deepEqual(
        convertBattleSemanticEvents(encodedOutput, fixture.party, fixture.enemy, fixture.initialPartyHp, fixture.environment),
        seeded.result,
        `${fixture.id}:${language}:${seed}: direct/encoded localized result mismatch`,
      );

      const tape = getBattleRngDoubleSequence(seed, seeded.randomConsumed);
      const taped = executeBattleCandidateFromWindow(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        tape, fixture.initialPartyHp,
        fixture.environment ? structuredClone(fixture.environment) : undefined,
      );
      assert.equal(taped.randomConsumed, tape.length);
      assert.deepEqual(seeded.result, taped.result, `${fixture.id}:${language}:${seed}: canonical result mismatch`);
      assert.deepEqual(
        {
          outcome: seeded.protocolOutput.outcome,
          partyHp: seeded.protocolOutput.partyHp,
          enemyHp: seeded.protocolOutput.enemyHp,
          enemyHitsReceived: seeded.protocolOutput.enemyHitsReceived,
          physicalThreatBag: seeded.protocolOutput.physicalThreatBag,
          magicalThreatBag: seeded.protocolOutput.magicalThreatBag,
          events: seeded.protocolOutput.events,
          randomConsumed: seeded.protocolOutput.randomConsumed,
          diagnosticDrawCount: seeded.protocolOutput.diagnosticDrawCount,
        },
        {
          outcome: taped.protocolOutput.outcome,
          partyHp: taped.protocolOutput.partyHp,
          enemyHp: taped.protocolOutput.enemyHp,
          enemyHitsReceived: taped.protocolOutput.enemyHitsReceived,
          physicalThreatBag: taped.protocolOutput.physicalThreatBag,
          magicalThreatBag: taped.protocolOutput.magicalThreatBag,
          events: taped.protocolOutput.events,
          randomConsumed: taped.protocolOutput.randomConsumed,
          diagnosticDrawCount: taped.protocolOutput.diagnosticDrawCount,
        },
        `${fixture.id}:${language}:${seed}: decoded native output mismatch`,
      );

      const repeated = executeBattleCandidateFromSeed(
        structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(fixture.bags),
        seed, getBattleRngVersion(), fixture.initialPartyHp, fixture.environment,
      );
      assert.deepEqual(repeated.protocolOutput, seeded.protocolOutput, `${fixture.id}:${language}:${seed}: repeat drift`);
      assert.deepEqual(repeated.result, seeded.result, `${fixture.id}:${language}:${seed}: repeated canonical drift`);
    }
  }
  setLanguage('ja');
});

test('Part 1.9A raw native result matches the frozen reference through one measured call', () => {
  const failures: string[] = [];
  for (const fixture of createGoldenCases()) {
    const reference = recordBattleGolden(executeTypeScriptBattle, fixture);
    const expectedResult = reference.snapshot.result as ReturnType<typeof executeTypeScriptBattle>;
    beginBattleKernelMeasurement();
    let native: ReturnType<typeof executeBattleRawCandidateFromTape>;
    try {
      native = executeBattleRawCandidateFromTape(
        structuredClone(fixture.party),
        structuredClone(fixture.enemy),
        structuredClone(fixture.bags),
        reference.randomTape,
        fixture.initialPartyHp,
        fixture.environment ? structuredClone(fixture.environment) : undefined,
      );
    } catch (error) {
      const measurement = endBattleKernelMeasurement();
      failures.push(`${fixture.id}: protocol failure ${String(error)}; referenceCursor=${reference.randomTape.length}; WasmCalls=${measurement.calls}`);
      continue;
    }
    const measurement = endBattleKernelMeasurement();
    const fields = [
      ['outcome', expectedResult.outcome, native.outcome],
      ['partyHp', expectedResult.partyHp, native.partyHp],
      ['enemyHp', expectedResult.enemyHp, native.enemyHp],
      ['enemyHitsReceived', expectedResult.enemyHitsReceived, native.enemyHitsReceived],
      ['physicalThreatBag', expectedResult.updatedBags.physicalThreatBag.entries, native.physicalThreatBag],
      ['magicalThreatBag', expectedResult.updatedBags.magicalThreatBag.entries, native.magicalThreatBag],
      ['randomConsumed', reference.randomTape.length, native.randomConsumed],
      ['diagnosticDrawCount', reference.randomTape.length, native.diagnosticDrawCount],
    ] as const;
    const unequal = fields.find(([, expectedValue, actualValue]) => {
      try { assert.deepEqual(actualValue, expectedValue); return false; } catch { return true; }
    });
    if (unequal) {
      const [field, expectedValue, actualValue] = unequal;
      failures.push(`${fixture.id}: first unequal raw field ${field}; reference=${JSON.stringify(expectedValue)} native=${JSON.stringify(actualValue)}; referenceCursor=${reference.randomTape.length} nativeCursor=${native.randomConsumed}; physical=${JSON.stringify(native.physicalThreatBag)} magical=${JSON.stringify(native.magicalThreatBag)}`);
    }
    assert.equal(measurement.calls, 1, `${fixture.id}: raw candidate must use one measured Wasm call`);
  }
  assert.deepEqual(failures, [], failures.join('\n'));
});
