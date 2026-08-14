import type { ColosseumEnemySettings } from './colosseum';
import type { GameState } from '../types';
import type { Language } from '../i18n';

export type AfkWorkerGameMode = 'm.kemo' | 'm.luna' | 'm.laika';

export interface AfkWorkerChunkRequest {
  schemaVersion: 1;
  requestId: number;
  state: GameState;
  language: Language;
  gameMode: AfkWorkerGameMode;
  elapsedMs: number;
  simulatedEndAt: number;
  cycleDurationScale: number;
  cycleDurationByParty: number[];
  operationStart: number;
  operationCount: number;
  totalOperationCount: number;
  randomSeed: number;
  colosseumSettings: ColosseumEnemySettings;
}

export interface AfkWorkerChunkSuccess {
  schemaVersion: 1;
  requestId: number;
  ok: true;
  state: GameState;
  operationStart: number;
  operationCount: number;
  totalOperationCount: number;
  randomSeed: number;
  durationMs: number;
}

export interface AfkWorkerChunkFailure {
  schemaVersion: 1;
  requestId: number;
  ok: false;
  error: string;
}

export type AfkWorkerChunkResponse = AfkWorkerChunkSuccess | AfkWorkerChunkFailure;

export function isMatchingAfkWorkerSuccess(
  value: unknown,
  request: AfkWorkerChunkRequest,
): value is AfkWorkerChunkSuccess {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<AfkWorkerChunkSuccess>;
  if (response.schemaVersion !== 1 || response.ok !== true || response.requestId !== request.requestId) return false;
  if (response.operationStart !== request.operationStart || response.operationCount !== request.operationCount) return false;
  if (response.totalOperationCount !== request.totalOperationCount || response.randomSeed !== request.randomSeed) return false;
  const state = response.state;
  return !!state
    && typeof state === 'object'
    && state.scene === 'home'
    && !!state.global
    && typeof state.global === 'object'
    && !!state.bags
    && typeof state.bags === 'object'
    && Array.isArray(state.parties)
    && state.parties.length === request.state.parties.length
    && state.parties.every((party, index) => (
      !!party
      && typeof party === 'object'
      && party.id === request.state.parties[index]?.id
      && Array.isArray(party.characters)
    ))
    && Number.isInteger(state.selectedPartyIndex)
    && state.selectedPartyIndex >= 0
    && state.selectedPartyIndex < Math.max(1, state.parties.length)
    && typeof state.buildNumber === 'number'
    && state.buildNumber === request.state.buildNumber;
}
