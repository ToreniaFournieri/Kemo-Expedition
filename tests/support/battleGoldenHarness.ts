import { createHash } from 'node:crypto';
import type { EnemyDef, GameBags, Party, TerrainEffectKey } from '../../src/types/index.ts';

export type BattleEnvironment = {
  terrainEffect?: TerrainEffectKey | null;
};

export type BattleGoldenCase = {
  id: string;
  seed: number;
  party: Party;
  enemy: EnemyDef;
  bags: GameBags;
  initialPartyHp?: number;
  environment?: BattleEnvironment;
};

export type BattleGoldenSnapshot = {
  randomDrawCount: number;
  result: unknown;
};

export type BattleGoldenDigest = {
  digest: string;
  randomDrawCount: number;
  outcome: string | null;
  partyHp: number | null;
  enemyHp: number | null;
  logCount: number;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

export function canonicalBattleJson(snapshot: BattleGoldenSnapshot): string {
  return JSON.stringify(canonicalize(snapshot));
}

export function digestBattleGolden(snapshot: BattleGoldenSnapshot): BattleGoldenDigest {
  const result = snapshot.result as {
    outcome?: unknown;
    partyHp?: unknown;
    enemyHp?: unknown;
    log?: unknown;
  };
  return {
    digest: createHash('sha256').update(canonicalBattleJson(snapshot)).digest('hex'),
    randomDrawCount: snapshot.randomDrawCount,
    outcome: typeof result?.outcome === 'string' ? result.outcome : null,
    partyHp: typeof result?.partyHp === 'number' ? result.partyHp : null,
    enemyHp: typeof result?.enemyHp === 'number' ? result.enemyHp : null,
    logCount: Array.isArray(result?.log) ? result.log.length : 0,
  };
}
