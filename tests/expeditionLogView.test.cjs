const assert = require('node:assert/strict');
const { build } = require('esbuild');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

test('Expedition log projection adapter preserves public facts and supplies narration fallback', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-expedition-log-view-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const entry = path.join(directory, 'profile.mjs');
  const source = path.join(directory, 'profile.ts');
  fs.writeFileSync(source, `
    import assert from 'node:assert/strict';
    import { buildExpeditionLogView } from ${JSON.stringify(path.resolve('src/api/v1/expeditionLogView.ts'))};
    const projection = { battleLog: {
      logId: 'latest', partyNumber: 1, dungeonId: 1, difficultyOffset: 4, finalOutcome: 'Return',
      totalExperience: 123, completedRooms: 1, totalRooms: 2, remainingPartyHp: 80, maximumPartyHp: 100,
      rewards: [], autoSell: { count: 2, gold: 17 }, rooms: [{
        room: 1, floor: 1, roomInFloor: 1, roomType: 'battle_Normal', enemyId: 1, enemyMaximumHp: 200,
        outcome: 'victory', damageDealt: 100, damageTaken: 20, startingPartyHp: 100,
        remainingPartyHp: 80, maximumPartyHp: 100, healAmount: 0, attritionAmount: 0, endEvents: [],
        eventFormat: 'compact-v1', actors: [
          { id: 1, kind: 'character', characterId: 1, name: 'Current Name' },
          { id: 0x80000001, kind: 'enemy', enemyId: 1 },
        ], modifiers: [], events: [[2, 12, 1, 9, 0x80000001, 'fire', 2, 2, 100, { attackType: 'melee', phase: 2 }]],
      }],
    }};
    const view = buildExpeditionLogView(projection);
    assert.ok(view);
    assert.deepEqual({ completedRooms: view.completedRooms, autoSellProfit: view.autoSellProfit, roomHp: view.entries[0].remainingPartyHP }, { completedRooms: 1, autoSellProfit: 17, roomHp: 80 });
    assert.equal(view.entries[0].details[0].actor, 'character');
    assert.equal(view.entries[0].details[0].characterId, 1);
    assert.equal(view.entries[0].details[0].hits, 2);
    assert.equal(view.entries[0].details[0].totalAttempts, 2);
    assert.equal(view.entries[0].details[0].damage, 100);
    assert.match(view.entries[0].details[0].action, /Current Name/);
    const retained = { dungeonId: 1, dungeonName: 'old dungeon name', difficultyOffset: 0, totalExperience: 0, totalRooms: 99, completedRooms: 99, finalOutcome: 'Clear', rewards: [], autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 1, maxPartyHP: 1, entries: [{ room: 1, floor: 1, roomInFloor: 1, roomType: 'battle_Normal', enemyId: 1, enemyName: 'old enemy name', enemyHP: 1, enemyAttackValues: '0/0/0', outcome: 'victory', damageDealt: 1, damageTaken: 1, remainingPartyHP: 1, maxPartyHP: 1, details: [{ phase: 'combat', actor: 'effect', action: 'retained narration' }] }] };
    const merged = buildExpeditionLogView(projection, retained);
    assert.equal(merged.completedRooms, 1);
    assert.equal(merged.totalRooms, 2);
    assert.equal(merged.entries[0].remainingPartyHP, 80);
    assert.equal(merged.entries[0].details[0].action, 'retained narration');
  `);
  await build({ entryPoints: [source], outfile: entry, bundle: true, platform: 'node', format: 'esm' });
  const result = spawnSync(process.execPath, [entry], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
