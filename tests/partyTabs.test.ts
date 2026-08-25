import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const partyTabSource = readFileSync(new URL('../src/components/home/tabs/PartyTab.tsx', import.meta.url), 'utf8');
const homeScreenSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const expeditionTabSource = readFileSync(new URL('../src/components/home/tabs/ExpeditionTab.tsx', import.meta.url), 'utf8');

test('Party tabs stay in layout but are hidden and unfocusable until a second party unlocks', () => {
  assert.match(partyTabSource, /parties\.length <= 1 \? 'invisible pointer-events-none' : ''/);
  assert.match(partyTabSource, /aria-hidden=\{parties\.length <= 1\}/);
  assert.match(partyTabSource, /tabIndex=\{parties\.length <= 1 \? -1 : 0\}/);
});

test('live progress ticks inside the active expedition panel while root checkpoints are adaptive', () => {
  assert.match(expeditionTabSource, /setLiveProgressNowMs\(Date\.now\(\)\)/);
  assert.match(homeScreenSource, /getNextPartyCycleCheckpointDelay\(partyCyclesRef\.current, Date\.now\(\)\)/);
  assert.doesNotMatch(homeScreenSource, /setInterval\(\(\) => \{\s*processTimeCheckpoint\(\)/);
});

test('initial and inactive lazy tabs use separate critical and idle preload paths', () => {
  assert.match(homeScreenSource, /export function preloadInitialHomeTab\(\)/);
  assert.match(homeScreenSource, /export function preloadRemainingHomeTabs\(\)/);
  for (const loader of ['loadPartyTab', 'loadExpeditionTab', 'loadBaseTab', 'loadDiaryTab', 'loadSettingTab']) {
    assert.match(homeScreenSource, new RegExp(`${loader}\\(\\)`));
  }
  assert.match(appSource, /void preloadInitialHomeTab\(\)\.catch/);
  assert.match(appSource, /requestIdleCallback\?\.\(preloadRemaining/);
});
