import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const tabSource = readFileSync(new URL('../src/components/home/tabs/ExpeditionTab.tsx', import.meta.url), 'utf8');
const simulationSource = readFileSync(new URL('../src/game/expeditionSimulation.ts', import.meta.url), 'utf8');

test('expedition simulations resolve isolated authoritative runs and yield asynchronously', () => {
  assert.match(simulationSource, /EXPEDITION_SIMULATION_RUN_COUNT = 1_000/);
  assert.match(hookSource, /count = EXPEDITION_SIMULATION_RUN_COUNT/);
  assert.match(hookSource, /simulateExpeditionRuns\(state, partyIndex, gameMode, EXPEDITION_SIMULATION_RUN_COUNT, onProgress\)/);
  assert.match(hookSource, /export async function simulateExpeditionRuns/);
  assert.match(hookSource, /export function createSimulationSandbox/);
  assert.match(hookSource, /const party = structuredClone\(sourceParty\)/);
  assert.match(hookSource, /const runState = createSimulationRunState\(sandbox\)/);
  assert.match(hookSource, /gameReducer\(runState, \{[\s\S]*type: 'RUN_EXPEDITION'/);
  assert.match(
    hookSource.match(/export async function simulateExpeditionRuns[\s\S]*?return result;\n\}/)?.[0] ?? '',
    /battleOutputMode: 'result-only'/,
  );
  assert.match(hookSource, /resolutionMode: 'forecast'/);
  assert.match(hookSource, /now - sliceStartedAt >= EXPEDITION_SIMULATION_SLICE_BUDGET_MS[\s\S]*await yieldToExpeditionSimulationUi\(\)/);
  assert.doesNotMatch(
    hookSource.match(/export async function simulateExpeditionRuns[\s\S]*?return result;\n\}/)?.[0] ?? '',
    /dispatch\(|saveState\(/,
  );
});

test('expedition simulation UI exposes asynchronous progress and conditional success labels', () => {
  assert.match(tabSource, /total: EXPEDITION_SIMULATION_RUN_COUNT/);
  assert.match(tabSource, /party\.expedition\.simulationRun/);
  assert.match(tabSource, /party\.expedition\.simulationRunning/);
  assert.match(tabSource, /party\.expedition\.simulationResult\.clear/);
  assert.match(tabSource, /party\.expedition\.simulationResult\.return/);
  assert.match(tabSource, /simulation\.result\.Turned_Back === 0/);
  assert.match(tabSource, /activeSimulationResultBubble/);
  assert.match(tabSource, /role="tooltip"/);
  assert.match(tabSource, /color-mix\(in srgb, rgb\(var\(--color-sub\)\) 80%, white\)/);
  assert.match(tabSource, /color-mix\(in srgb, rgb\(var\(--color-sub\)\) 50%, white\)/);
  assert.match(tabSource, /color-mix\(in srgb, rgb\(var\(--color-accent\)\) 50%, white\)/);
  assert.match(tabSource, /color-mix\(in srgb, rgb\(var\(--color-accent\)\) 80%, white\)/);
  assert.match(tabSource, /simulation\.result\.Draw_Retreat \/ simulation\.result\.total/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Draw_Retreat \/ simulation\.result\.total \* 100, 1\)/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Wounded_Retreat \/ simulation\.result\.total \* 100, 1\)/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Defeat \/ simulation\.result\.total \* 100, 1\)/);
});
