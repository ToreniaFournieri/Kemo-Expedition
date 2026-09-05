import type { Party } from '../types';
import { getDebugSettings } from './debugSettings';
import {
  getBossGateKey,
  getClearGateRequired,
  getClearGateProgress,
  getGodsBattleProgress,
  getEliteGateKey,
  isClearGateUnlocked,
} from './clearGateCore';

export * from './clearGateCore';

type GateRoomType = 'battle_Normal' | 'battle_Elite' | 'battle_Boss';

export type ClearGateCheckResult =
  | { blocked: false }
  | {
      blocked: true;
      required: number;
      current: number;
      labelKey: 'home.gate.bossDefeated' | 'home.gate.consecutiveSuccesses';
    };

export const ENTRY_GATE_REQUIRED = 1;
const GODS_BATTLE_REQUIRED = 3;

// SpecRef: 5.1.3.1 | "Clear-Gate" progression system specification | Gods battle gate
export function getGodsBattleRequired(): number {
  const settings = getDebugSettings();
  return settings.godsBattleCondition === 'simple1' ? 1 : GODS_BATTLE_REQUIRED;
}

export function isGodsBattleAvailable(party: Party, dungeonId: number): boolean {
  return getGodsBattleProgress(party, dungeonId) >= getGodsBattleRequired()
    && hasDefeatedDungeonBoss(party, dungeonId);
}

export function hasDefeatedDungeonBoss(
  party: Pick<Party, 'defeatedBossExpeditions'>,
  dungeonId: number,
): boolean {
  return Boolean(party.defeatedBossExpeditions?.[dungeonId]);
}

export function isDungeonEntryUnlocked(
  party: Pick<Party, 'defeatedBossExpeditions'>,
  dungeonId: number,
): boolean {
  return dungeonId <= 1 || hasDefeatedDungeonBoss(party, dungeonId - 1);
}

function getGateKeyForRoom(dungeonId: number, floorNumber: number, roomType: GateRoomType): number | null {
  if (roomType === 'battle_Elite' && floorNumber >= 1 && floorNumber <= 5) {
    return getEliteGateKey(dungeonId, floorNumber);
  }
  if (roomType === 'battle_Boss' && floorNumber === 6) {
    return getBossGateKey(dungeonId);
  }
  return null;
}

// SpecRef: 5.1.3.1 | "Clear-Gate" progression system specification | Gate check
export function checkClearGateRequirement(params: {
  dungeonId: number;
  floorNumber: number;
  roomInFloor: number;
  roomType: GateRoomType;
  party: Pick<Party, 'clearGateProgress' | 'clearGateStatus' | 'defeatedBossExpeditions'>;
}): ClearGateCheckResult {
  const { dungeonId, floorNumber, roomInFloor, roomType, party } = params;
  if (dungeonId === 99) return { blocked: false };

  if (floorNumber === 1 && roomInFloor === 1 && dungeonId > 1) {
    const current = party.defeatedBossExpeditions?.[dungeonId - 1] ? 1 : 0;
    if (!isDungeonEntryUnlocked(party, dungeonId)) {
      return {
        blocked: true,
        required: ENTRY_GATE_REQUIRED,
        current,
        labelKey: 'home.gate.bossDefeated',
      };
    }
    return { blocked: false };
  }

  if (roomInFloor !== 4) return { blocked: false };
  const gateKey = getGateKeyForRoom(dungeonId, floorNumber, roomType);
  if (gateKey === null || isClearGateUnlocked(party, gateKey)) return { blocked: false };

  return {
    blocked: true,
    required: getClearGateRequired(gateKey),
    current: getClearGateProgress(party, gateKey),
    labelKey: 'home.gate.consecutiveSuccesses',
  };
}
