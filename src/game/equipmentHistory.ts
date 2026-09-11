import type { SavedEquipmentSet } from '../types';

export const EQUIPMENT_HISTORY_LIMIT = 30;

export interface EquipmentStateHistory {
  undo: SavedEquipmentSet[];
  redo: SavedEquipmentSet[];
}

export const EMPTY_EQUIPMENT_STATE_HISTORY: EquipmentStateHistory = { undo: [], redo: [] };

function retainMostRecent(states: readonly SavedEquipmentSet[]): SavedEquipmentSet[] {
  return states.slice(-EQUIPMENT_HISTORY_LIMIT);
}

/** A new equipment mutation starts a new redo branch. */
export function recordEquipmentState(
  history: EquipmentStateHistory,
  previous: SavedEquipmentSet,
): EquipmentStateHistory {
  return { undo: retainMostRecent([...history.undo, previous]), redo: [] };
}

export function undoEquipmentState(
  history: EquipmentStateHistory,
  current: SavedEquipmentSet,
): { target: SavedEquipmentSet; history: EquipmentStateHistory } | null {
  const target = history.undo.at(-1);
  if (!target) return null;
  return {
    target,
    history: {
      undo: history.undo.slice(0, -1),
      redo: retainMostRecent([...history.redo, current]),
    },
  };
}

export function redoEquipmentState(
  history: EquipmentStateHistory,
  current: SavedEquipmentSet,
): { target: SavedEquipmentSet; history: EquipmentStateHistory } | null {
  const target = history.redo.at(-1);
  if (!target) return null;
  return {
    target,
    history: {
      undo: retainMostRecent([...history.undo, current]),
      redo: history.redo.slice(0, -1),
    },
  };
}
