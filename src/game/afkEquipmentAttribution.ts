import type { AutoEquipmentAttributionPhase } from './autoEquipmentAttribution';

const PHASES: readonly (AutoEquipmentAttributionPhase | 'unclassifiedMs')[] = [
  'inventoryClone', 'inventoryIndexBuild', 'inventoryScan', 'nativeRanking',
  'statComputation', 'jewelPlanning', 'notificationPlanning', 'actionDispatch',
  'reducerApplication', 'unclassifiedMs',
];

/** Fixed-size profile totals; never retain planner actions, items, or transaction state. */
// SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Debug-only runtime trace
export class AfkEquipmentPlanningTotals {
  private totals: Record<string, number> = {};

  record(phases: Readonly<Record<string, number>>): void {
    for (const phase of PHASES) {
      const value = phases[phase];
      if (Number.isFinite(value) && value >= 0) {
        this.totals[phase] = (this.totals[phase] ?? 0) + value;
      }
    }
  }

  snapshot(): Readonly<Record<string, number>> {
    return { ...this.totals };
  }

  reset(): void {
    this.totals = {};
  }
}
