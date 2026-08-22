import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const tabSource = readFileSync(new URL('../src/components/home/tabs/ExpeditionTab.tsx', import.meta.url), 'utf8');

test('expedition simulations resolve isolated authoritative runs and yield asynchronously', () => {
  assert.match(hookSource, /export async function simulateExpeditionRuns/);
  assert.match(hookSource, /const baseline = structuredClone\(state\)/);
  assert.match(hookSource, /const runState = structuredClone\(baseline\)/);
  assert.match(hookSource, /gameReducer\(runState, \{[\s\S]*type: 'RUN_EXPEDITION'/);
  assert.match(hookSource, /completed % 5 === 0[\s\S]*await yieldToExpeditionSimulationUi\(\)/);
  assert.doesNotMatch(
    hookSource.match(/export async function simulateExpeditionRuns[\s\S]*?return result;\n\}/)?.[0] ?? '',
    /dispatch\(|saveState\(/,
  );
});

test('expedition simulation UI exposes asynchronous progress and conditional success labels', () => {
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
});
