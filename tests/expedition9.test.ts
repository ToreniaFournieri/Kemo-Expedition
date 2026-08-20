import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dungeonSource = readFileSync(new URL('../src/data/dungeons.ts', import.meta.url), 'utf8');

test('Expedition 9 uses the specified tier, enemy level, floors, and terrain effects', () => {
  assert.match(dungeonSource, /9: \['Across the trenches', 'Military Road', 'Darden Field', 'Federation Encampment', 'Defensive line', 'Caninian Capital'\]/);
  assert.match(dungeonSource, /9: \['terrain\.duelist-domain', 'terrain\.heavy-wind', 'terrain\.sniper-domain', 'terrain\.enemy-high-ground', 'terrain\.predation', 'terrain\.rejuvenation'\]/);
  assert.match(dungeonSource, /id: 9,\s+tier: 1,\s+expLevel: 44,[\s\S]*?enemyPoolIds: \[9\],\s+bossId: 135,[\s\S]*?floors: createFloors\(9, 135\)/);
});

test('Expedition 9 temporarily reuses enemy IDs 100 through 135 in the specified rooms', () => {
  assert.match(dungeonSource, /const sourcePoolId = poolId === 9 \? 1 : poolId;/);
  assert.match(dungeonSource, /const enemyId = 100 \+ \(sourcePoolId - 1\) \* 36 \+ rowIndex;/);
  assert.match(dungeonSource, /Array\.from\(\{ length: 9 \}/);
});

test('automatic destination progression includes Expedition 9', () => {
  const gameStateSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
  const homeScreenSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
  assert.match(gameStateSource, /selectedDungeonId \+ 1 && dungeon\.id <= 9/);
  assert.match(homeScreenSource, /selectedDungeonId \+ 1 && dungeon\.id <= 9/);
});
