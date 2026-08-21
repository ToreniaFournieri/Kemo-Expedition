import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const partyTabSource = readFileSync(new URL('../src/components/home/tabs/PartyTab.tsx', import.meta.url), 'utf8');
const homeScreenSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('Party tabs stay in layout but are hidden and unfocusable until a second party unlocks', () => {
  assert.match(partyTabSource, /parties\.length <= 1 \? 'invisible pointer-events-none' : ''/);
  assert.match(partyTabSource, /aria-hidden=\{parties\.length <= 1\}/);
  assert.match(partyTabSource, /tabIndex=\{parties\.length <= 1 \? -1 : 0\}/);
});

test('All lazy home tabs are preloaded behind the startup screen', () => {
  assert.match(homeScreenSource, /export function preloadHomeTabs\(\)/);
  for (const loader of ['loadPartyTab', 'loadExpeditionTab', 'loadBaseTab', 'loadDiaryTab', 'loadSettingTab']) {
    assert.match(homeScreenSource, new RegExp(`${loader}\\(\\)`));
  }
  assert.match(appSource, /void preloadHomeTabs\(\)\.catch/);
});
