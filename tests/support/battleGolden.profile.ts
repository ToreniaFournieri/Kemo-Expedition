import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ENEMIES } from '../../src/data/enemies.ts';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { executeBattle } from '../../src/game/battle.ts';
import { getProductionBattleTelemetry } from '../../src/game/battle.ts';
import {
  executeBattleCandidateFromTape,
  executeBattleRawCandidateFromTape,
} from '../../src/game/battleCandidate.ts';
import { executeBattle as executeTypeScriptBattle } from '../../src/game/battleTypeScriptReference.ts';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement } from '../../src/game/battleKernel.ts';
import { gameplayRandom, withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
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

function createGoldenCases(): BattleGoldenCase[] {
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
    const recording = recordBattleGolden(executeBattle, fixture);
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
    assertBattleRunnerParity(executeTypeScriptBattle, executeBattle, fixture);
  }

  const fixture = fixtures[0]!;
  assert.throws(
    () => assertBattleRunnerParity(
      executeBattle,
      (...args) => {
        Math.random();
        return executeBattle(...args);
      },
      fixture,
    ),
    /unexpected random draw|recorded random draws|candidate battle result differs/,
  );
  assert.throws(
    () => assertBattleRunnerParity(
      executeBattle,
      (...args) => {
        const result = executeBattle(...args);
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

test('production entry point preserves parity, input immutability, the unused suffix, and one Wasm call', () => {
  for (const fixture of createGoldenCases()) {
    const reference = recordBattleGolden(executeTypeScriptBattle, fixture);
    const party = structuredClone(fixture.party);
    const enemy = structuredClone(fixture.enemy);
    const bags = structuredClone(fixture.bags);
    const beforeInputs = structuredClone({ party, enemy, bags });
    const source = createSeededRandom(fixture.seed);
    const expectedSource = createSeededRandom(fixture.seed);
    for (let index = 0; index < reference.randomTape.length; index += 1) expectedSource();
    const expectedNext = expectedSource();
    const beforeDraws = getProductionBattleTelemetry().randomConsumed;
    beginBattleKernelMeasurement();
    const { result, next } = withGameplayRandomSourceForTesting(source, () => ({
      result: executeBattle(party, enemy, bags, fixture.initialPartyHp, fixture.environment),
      next: gameplayRandom(),
    }));
    const measurement = endBattleKernelMeasurement();
    assert.equal(canonicalBattleJson({ randomDrawCount: reference.randomTape.length, result }), canonicalBattleJson(reference.snapshot), `${fixture.id}: production mismatch`);
    assert.equal(getProductionBattleTelemetry().randomConsumed - beforeDraws, reference.randomTape.length);
    assert.equal(next, expectedNext, `${fixture.id}: unused reservoir suffix was not preserved`);
    assert.equal(measurement.calls, 1, `${fixture.id}: production must use one Wasm call`);
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
