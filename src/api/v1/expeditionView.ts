// SpecRef: 9.1.4.7 | Observation projections | expedition
// The typed read model consumed by the Expedition pane. It intentionally contains only public projection facts;
// retained battle-log narration remains a separate E3 adapter.

export type ExpeditionOutcome = 'Clear' | 'Return' | 'Draw' | 'Retreat' | 'Defeat';

export interface ExpeditionProgressProjection {
  kind: 'none' | 'continuous' | 'stepBased';
  mainPercent: number;
  totalSteps: number | null;
  completedSteps: number | null;
  subProgress: { startedAt: string; endsAt: string } | null;
  nextChangeAt: string | null;
}

export interface ExpeditionGateProjection {
  kind: 'eliteGate' | 'bossGate' | 'entryGate' | 'godGate' | 'godEntry';
  dungeonId: number;
  floor: number | null;
  current: number;
  required: number;
}

export interface ExpeditionSideQuestProjection {
  id: number;
  type: string;
  target: number;
  progress: number;
  percent: number;
  hasDeadline: boolean;
  remainingMs: number;
}

export interface ExpeditionControlProjection {
  available: boolean;
  unavailableReason: 'gods_battle_unavailable' | 'entry_gate_locked' | 'party_exhausted' | 'already_moving_to_gods_battle' | 'charge_insufficient' | null;
}

export interface ExpeditionPartyProjection {
  partyNumber: number;
  name: string;
  state: string;
  stateStartedAt: string | null;
  stateDurationMs: number | null;
  stateExpectedEndAt: string | null;
  progress: ExpeditionProgressProjection | null;
  exploration: {
    revealedRoomCount: number;
    nextRevealAt: string | null;
    rooms: Array<{ room: number; floor: number | null; roomInFloor: number | null; roomType: string | null; enemyId: number | null; outcome: string; remainingPartyHp: number; maximumPartyHp: number }>;
  } | null;
  currentHp: number;
  maximumHp: number;
  disclosedFloor: number | null;
  disclosedOutcome: ExpeditionOutcome | null;
  destination: number | null;
  destinationMode: 'auto' | 'fixed';
  depthLimit: string;
  difficultyOffset: number;
  chargeStock: number;
  chargeDuration: number;
  clearGates: ExpeditionGateProjection[];
  sideQuest: ExpeditionSideQuestProjection | null;
  controls: { sortie: ExpeditionControlProjection; godsBattle: ExpeditionControlProjection };
}

export interface ExpeditionProjection {
  parties: ExpeditionPartyProjection[];
}

export function expeditionStateName(state: string): string {
  return state.startsWith('state.') ? state.slice('state.'.length) : state;
}
