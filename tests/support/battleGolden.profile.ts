import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ENEMIES } from '../../src/data/enemies.ts';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { executeBattle } from '../../src/game/battle.ts';
import { getEncounterEnemyWithScaling } from '../../src/game/enemyScaling.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { EnemyDef, GameState, Party, RoomType, TerrainEffectKey } from '../../src/types/index.ts';
import {
  assertBattleRunnerParity,
  digestBattleGolden,
  recordBattleGolden,
  type BattleGoldenCase,
  type BattleGoldenDigest,
} from './battleGoldenHarness.ts';

const ROOT = process.cwd();
const SAMPLE_SAVE_PATH = resolve(ROOT, 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz');
const GOLDEN_PATH = resolve(ROOT, 'tests/fixtures/battleGolden.v1.json');

type SaveEnvelope = { saveDataCompressed: string };

function loadSampleState(): GameState {
  const envelope = JSON.parse(readFileSync(SAMPLE_SAVE_PATH, 'utf8')) as SaveEnvelope;
  return hydrateGameState(
    JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState,
  );
}

function requireParty(state: GameState, index: number): Party {
  const party = state.parties[index];
  if (!party) throw new Error(`Missing sample party ${index + 1}`);
  return party;
}

function scaledEnemy(id: number, floorNumber: number, roomType: RoomType): EnemyDef {
  const enemy = ENEMIES.find((entry) => entry.id === id);
  const dungeon = getDungeonById(8);
  if (!enemy || !dungeon) throw new Error(`Missing golden enemy ${id} or Expedition 8`);
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
): BattleGoldenCase {
  const party = requireParty(state, partyIndex);
  return {
    id,
    seed,
    party,
    enemy: scaledEnemy(enemyId, floorNumber, roomType),
    bags: state.bags,
    initialPartyHp: initialPartyHp ?? party.currentHp,
    environment: { terrainEffect: terrainEffect ?? null },
  };
}

function createGoldenCases(): BattleGoldenCase[] {
  setLanguage('ja');
  const state = loadSampleState();
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
  ];
}

const expected = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as Record<string, BattleGoldenDigest>;
const capture = process.env.BATTLE_GOLDEN_CAPTURE === '1';

test('battle golden fixtures lock complete results and random consumption', () => {
  const actual = Object.fromEntries(createGoldenCases().map((fixture) => {
    const recording = recordBattleGolden(executeBattle, fixture);
    return [fixture.id, digestBattleGolden(recording.snapshot)];
  }));

  if (capture) {
    console.info('BATTLE_GOLDEN_CAPTURE', JSON.stringify(actual, null, 2));
    return;
  }
  assert.deepEqual(actual, expected);
});

test('record/replay detects candidate output and random-consumption drift', () => {
  const fixtures = createGoldenCases();
  for (const fixture of fixtures) {
    assertBattleRunnerParity(executeBattle, executeBattle, fixture);
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
    /unexpected random draw|recorded random draws/,
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
