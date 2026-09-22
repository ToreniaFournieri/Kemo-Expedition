const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

// SpecRef: 9.1.4.17 | UI state ownership | Before migrating a UI area, inventory every control against the ownership map
// A mechanical check for migrated tabs (docs/api-v1-implementation-plan.md, Stage 9): a migrated tab file must not use the
// reducer, the full game state, or game-rule modules beyond an explicit, reviewed list. Adding an import or a prop that
// bypasses the Application API fails here, instead of relying on review of two very large files.

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');

// Game modules a migrated tab may import, with the names it may take from each. Everything here is a pure display helper,
// a master-data lookup, or a type; nothing mutates state or decides a game outcome.
const DISPLAY_IMPORTS = {
  abilityLevelScales: ['abilityLevelValue'],
  attackProfile: ['formatAttackSpeedHelp'],
  deity: ['DEITY_OPTIONS', 'getDeityDisplayName', 'getDeityEffectDescription', 'getDeityKey', 'getDeityRank', 'isNoFaithDeity'],
  equipmentDisplay: ['replaceFlatItemStat'],
  gameState: ['getItemDisplayName'],
  jewel: ['getJewelDisplayName', 'getJewelOwnedCount', 'JEWELS_BY_ITEM_CATEGORY'],
  magic: ['resolveMagicProfile', 'resolveSpecialMagicFromAbilities'],
};

// Reviewed exceptions: each is a known gap that is recorded in the plan, with the reason it cannot be projected yet.
const REVIEWED_EXCEPTIONS = {
  // Default name chosen when the race changes (Spec 8.2.3): an unsaved draft, chosen before any commit exists.
  gameplayRandom: ['gameplayRandom'],
  // Constants and transport-facing UI types; saved-set availability itself is projected by the Application API.
  equipmentSets: ['MAX_SAVED_EQUIPMENT_SETS', 'type EquipmentSetLoadMode'],
};

function importedGameModules(source) {
  const found = {};
  for (const match of source.matchAll(/^import\s*\{([^}]*)\}\s*from\s*'\.\.\/\.\.\/\.\.\/game\/([A-Za-z0-9_]+)';/gm)) {
    found[match[2]] = match[1].split(',').map((name) => name.trim()).filter(Boolean);
  }
  return found;
}

test('the Party tab imports only reviewed game modules and never the reducer or full game state', () => {
  const source = read('src/components/home/tabs/PartyTab.tsx');
  const imports = importedGameModules(source);
  const allowed = { ...DISPLAY_IMPORTS, ...REVIEWED_EXCEPTIONS };
  for (const [module, names] of Object.entries(imports)) {
    assert.ok(allowed[module], `PartyTab imports game/${module}, which is not on the reviewed list`);
    for (const name of names) assert.ok(allowed[module].includes(name), `PartyTab imports ${name} from game/${module}, which is not on the reviewed list`);
  }
  // The exceptions must still be needed: removing one must remove it from this list too, so the list only ever shrinks.
  for (const [module, names] of Object.entries(REVIEWED_EXCEPTIONS)) {
    assert.deepEqual(imports[module], names, `game/${module} is a reviewed exception and must match its entry exactly`);
  }
  for (const banned of [/hooks\/useGameState/, /\bGameState\b/, /\bactions\./, /\bdispatch\(/, /\buseGameState\b/, /game\/(partyComputation|partyLevel|inventoryMutation|gameplayState)/]) {
    assert.doesNotMatch(source, banned, `PartyTab must not reference ${banned}`);
  }
});

test('HomeScreen gives the Party tab projections and commits, not raw game state or reducer actions', () => {
  const home = read('src/components/HomeScreen.tsx');
  const start = home.indexOf('<PartyTab');
  assert.ok(start >= 0);
  const end = home.indexOf('\n        />', start);
  const jsx = home.slice(start, end);
  // A prop whose value is a direct read of the save (`prop={state.…}`) bypasses the projections.
  const rawReads = [...jsx.matchAll(/^\s+([A-Za-z]+)=\{state\./gm)].map((match) => match[1]);
  assert.deepEqual(rawReads, [], `Party tab props read the game state directly: ${rawReads.join(', ')}`);
  // Reducer actions passed to the tab: only a local toast and the shared party selection remain (the selected party stays in the game state).
  const actions = [...jsx.matchAll(/actions\.([A-Za-z]+)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(actions)].sort(), ['addStatNotifications', 'selectParty'], 'only the reviewed reducer actions may be passed to the Party tab');
});

test('the Party tab takes no character-stat, inventory, or party game objects other than projected views', () => {
  const source = read('src/components/home/tabs/PartyTab.tsx');
  assert.doesNotMatch(source, /ComputedCharacterStats|computePartyStats|characterStats:/);
  assert.match(source, /party: PartyView;/);
  assert.match(source, /parties: PartySummary\[\];/);
  assert.match(source, /characterStatus: CalculatedStatus\[\];/);
  assert.match(source, /party\.experienceToNext/, 'experience to the next level is a projected fact');
  assert.match(source, /stats\.hpBaseIncrease/, 'the HP breakdown is a projected fact');
  assert.match(source, /stats\.raceUnlockActive/, 'the race unlock state is a projected fact');
});

test('Expedition controls are Application API commits, not reducer actions (migration in progress)', () => {
  const home = read('src/components/HomeScreen.tsx');
  const start = home.indexOf('<ExpeditionTab');
  const jsx = home.slice(start, home.indexOf('\n        />', start));
  const actions = [...jsx.matchAll(/actions\.([A-Za-z]+)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(actions)].sort(), [], 'no reducer action may be passed to the Expedition tab');
  for (const command of ['changeExpedition', 'resetStatistics']) assert.match(home, new RegExp(`commit/expedition/\\{p\\}/${command}`));
  // The forecast is the API's `simulationRun`, not a direct call into the game engine.
  assert.match(home, /adapter\.read\('read\/expedition\/\{p\}\/simulationRun'/);
  assert.doesNotMatch(read('src/components/home/tabs/ExpeditionTab.tsx'), /onProgress/);
  // The button's expedition is the API sortie: `triggerSortie` keeps only its popups and no longer runs the reducer sequence.
  const trigger = home.slice(home.indexOf('const triggerSortie = ('), home.indexOf('const triggerSortieRef'));
  assert.match(trigger, /commit\/expedition\/\{p\}\/godsBattle/);
  assert.doesNotMatch(trigger, /actions\.(resolveInstantExpedition|consumeInstantExpeditionStock|healPartyHp|rollPartySleepiness|finalizeDiaryLog|clearPendingProfit|cancelSideQuest)/);
});

test('Expedition pane rows use the observation projection and never receive live party cycles', () => {
  const home = read('src/components/HomeScreen.tsx');
  const tab = read('src/components/home/tabs/ExpeditionTab.tsx');
  const start = home.indexOf('<ExpeditionTab');
  const jsx = home.slice(start, home.indexOf('\n        />', start));
  assert.match(home, /useApiRead<\{ expeditionInfo: ExpeditionProjection \}>\([\s\S]*?'read\/observation\/expedition'/);
  assert.match(home, /party\.progress\?\.nextChangeAt/);
  assert.match(jsx, /expeditionProjection=\{expeditionProjection\}/);
  assert.doesNotMatch(jsx, /partyCycles=/);
  assert.match(tab, /expeditionProjection: ExpeditionProjection \| null;/);
  assert.doesNotMatch(tab, /partyCycles|PartyCycleRuntime|getExplorationVisibleRoomCount|getInstantExpeditionChargeState/);
  for (const projectedFact of ['projectedParty.state', 'projectedParty.progress', 'projectedParty.currentHp', 'projectedParty.maximumHp', 'projectedParty.chargeStock', 'projectedParty.chargeDuration', 'projectedParty.disclosedFloor', 'projectedParty.disclosedOutcome', 'projectedParty.clearGates', 'projectedParty.sideQuest', 'projectedParty.controls.sortie', 'projectedParty.controls.godsBattle']) {
    assert.match(tab, new RegExp(projectedFact.replaceAll('.', '\\.')));
  }
});

test('Expedition logs use the latestBattleLog projection and keep retained narration inside the adapter', () => {
  const home = read('src/components/HomeScreen.tsx');
  const tab = read('src/components/home/tabs/ExpeditionTab.tsx');
  const start = home.indexOf('<ExpeditionTab');
  const jsx = home.slice(start, home.indexOf('\n        />', start));
  assert.match(home, /useApiReadMany<LatestBattleLogProjection>\([\s\S]*?'read\/expedition\/\{p\}\/latestBattleLog'/);
  // An exploring party's rooms come from the Expedition projection's `exploration` (server-gated), never from the disclosed log,
  // and the view is built from API responses alone: the game state's retained log is not an input.
  assert.match(home, /buildPartyExpeditionLogView\(\{[\s\S]*?exploration,[\s\S]*?latestBattleLog: latestBattleLogProjections/);
  const viewSection = home.slice(home.indexOf('const expeditionLogViews = useMemo'), home.indexOf('// SpecRef: 9.1.4.17 | UI state ownership | Retained selections'));
  assert.doesNotMatch(viewSection, /lastExpeditionLog|retained/);
  assert.match(jsx, /expeditionLogViews=\{expeditionLogViews\}/);
  assert.doesNotMatch(tab, /party\.lastExpeditionLog/);
  assert.doesNotMatch(tab, /renderExpeditionMetadata/);
});

test('the Diary tab renders API views and owns no saved Party or Diary log objects', () => {
  const tab = read('src/components/home/tabs/DiaryTab.tsx');
  assert.match(tab, /diary: DiaryTabView \| null;/);
  assert.match(tab, /DiaryPartyView/);
  assert.doesNotMatch(tab, /import\s*\{[^}]*\b(?:Party|DiaryLog)\b[^}]*\}\s*from\s*'\.\.\/\.\.\/\.\.\/types/, 'DiaryTab must not import saved Party or DiaryLog types');
  for (const banned of [
    /renderDiaryMetadata/,
    /renderExpeditionMetadata/,
    /localStorage/,
    /hooks\/useGameState/,
    /\bactions\./,
  ]) assert.doesNotMatch(tab, banned, `DiaryTab must not reference ${banned}`);
});

test('HomeScreen gives the Diary tab projections and commits, with only shared Party selection using the reducer', () => {
  const home = read('src/components/HomeScreen.tsx');
  const start = home.indexOf('<DiaryTab');
  assert.ok(start >= 0);
  const jsx = home.slice(start, home.indexOf('\n        />', start));
  assert.match(home, /useApiRead<\{ diaryInfo: DiaryProjection \}>\([\s\S]*?'read\/observation\/diary'/);
  assert.match(home, /useApiReadMany<LatestBattleLogProjection>\([\s\S]*?'read\/expedition\/\{p\}\/latestBattleLog'/);
  assert.match(home, /buildDiaryTabView\(diaryProjection, diaryBattleLogProjections\)/);
  assert.match(home, /commit\/diary\/diaryEntry\/markAsRead/);
  assert.match(home, /commit\/diary\/\$\{partyNumber\}\/diarySetting/);
  assert.match(jsx, /diary=\{diaryView\}/);
  assert.doesNotMatch(jsx, /state\.parties|actions\./);
  const selection = home.slice(home.indexOf('const selectDiaryParty ='), home.indexOf('const prevDiaryTabVisibleRef'));
  assert.match(selection, /actions\.selectParty\(partyIndex\)/, 'the persisted shared Party selection is the one reviewed reducer exception');
  assert.doesNotMatch(selection, /actions\.(markDiaryLogSeen|markPartyDiaryLogsSeen|updateDiarySettings)/);
});

test('a disabled multi-read keeps its last result, so a hidden tab never returns empty', () => {
  const hook = read('src/components/home/useApiRead.ts');
  const many = hook.slice(hook.indexOf('export function useApiReadMany'));
  assert.match(many, /if \(!adapter \|\| !inputs\) return;/);
  assert.doesNotMatch(many, /if \(!adapter \|\| !inputs[^)]*\) \{ setData\(null\)/);
});

test('the Shop pane draws the Base projection and buys and refreshes through the Application API (migration in progress)', () => {
  const home = read('src/components/HomeScreen.tsx');
  const tab = read('src/components/home/tabs/BaseTab.tsx');
  const start = home.indexOf('<BaseTab');
  const jsx = home.slice(start, home.indexOf('\n        />', start));
  // The shop's state is no longer handed to the pane, and its rules are not imported into it.
  for (const banned of ['shopPurchases', 'shopRefreshCounts', 'shopIntimacy']) assert.doesNotMatch(jsx, new RegExp(banned), `${banned} is not a BaseTab prop`);
  assert.match(jsx, /shop=\{baseProjection\?\.shop \?\? null\}/);
  assert.doesNotMatch(tab, /game\/shop['"]/);
  assert.doesNotMatch(tab, /buildShopLineup|getShopRefreshPrice|countElapsedShopRefreshes/);
  assert.match(home, /commit\/base\/purchaseShopItems/);
  assert.match(home, /commit\/base\/paidShopRefresh/);
  assert.doesNotMatch(jsx, /actions\.(buyShopItem|refreshShopLineup)/);
});

test('the Altar pane draws the Base projection and the enemy-form read and unlocks through the Application API', () => {
  const home = read('src/components/HomeScreen.tsx');
  const tab = read('src/components/home/tabs/BaseTab.tsx');
  const start = home.indexOf('<BaseTab');
  const jsx = home.slice(start, home.indexOf('\n        />', start));
  for (const banned of ['altarVictoriesByEnemyType', 'unlockedMimorianEnemyIds', 'prana=']) assert.doesNotMatch(jsx, new RegExp(banned), `${banned} is not a BaseTab prop`);
  assert.match(jsx, /altar=\{baseProjection\?\.altar \?\? null\}/);
  assert.match(home, /'read\/base\/enemyFormList'/);
  assert.match(home, /commit\/base\/unlockForm/);
  // The pane's Alter levels, costs, and unlock rules come from the API, not from the game's own functions.
  assert.doesNotMatch(tab, /getAltarLevel|getEnemyFormPranaCost|getEnemyRequiredAltarLevel|getRequiredAltarVictories|getAltarVictoriesForEnemyType/);
  assert.doesNotMatch(jsx, /actions\.unlockMimorianEnemy/);
});

test('the Inventory pane draws the Base projection and sells, unlocks, acknowledges, and sets Jewel priority through the Application API', () => {
  const home = read('src/components/HomeScreen.tsx');
  const tab = read('src/components/home/tabs/BaseTab.tsx');
  const start = home.indexOf('<BaseTab');
  const jsx = home.slice(start, home.indexOf('\n        />', start));
  assert.match(jsx, /inventory=\{inventoryView\}/);
  assert.match(jsx, /jewelPriorityPartyNumbers=\{jewelPriorityPartyNumbers\}/);
  assert.doesNotMatch(jsx, /inventory=\{state\.global\.inventory\}|jewels=\{state\.global\.jewels\}|jewelAutoEquipPriorityPartyId=\{state\.global/);
  assert.match(home, /commit\/base\/sellInventoryItems/);
  assert.match(home, /commit\/base\/unlockSoldItems/);
  assert.match(home, /commit\/base\/markItemsAsSeen/);
  assert.match(home, /commit\/base\/changeJewelPriorityParty/);
  assert.doesNotMatch(jsx, /actions\.(sellStack|sellAllOwned|setVariantStatus|markItemsSeen|setJewelAutoEquipPriorityParty)/);
  // The pane rebuilds items from the projected Item Format and master data; it holds no sell-price or Prana rule.
  assert.doesNotMatch(tab, /calculateItemSellPrice|getSuperRareItemPrana/);
});

test('the header renders only from the overview projection, importing no game module', () => {
  const source = read('src/components/home/HeaderBar.tsx');
  assert.doesNotMatch(source, /from\s+'\.\.\/\.\.\/game\//, 'HeaderBar must not import any game/ module');
  for (const banned of [/hooks\/useGameState/, /\bGameState\b/, /\bactions\./, /\bdispatch\(/, /\buseGameState\b/]) {
    assert.doesNotMatch(source, banned, `HeaderBar must not reference ${banned}`);
  }
  assert.match(source, /header: HeaderProjection \| null;/);
});

test('HomeScreen gives the header the overview projection, not raw game state or reducer actions', () => {
  const home = read('src/components/HomeScreen.tsx');
  const start = home.indexOf('<HeaderBar');
  assert.ok(start >= 0);
  const end = home.indexOf('\n        />', start);
  const jsx = home.slice(start, end);
  const rawReads = [...jsx.matchAll(/^\s+([A-Za-z]+)=\{state\./gm)].map((match) => match[1]);
  assert.deepEqual(rawReads, [], `header props read the game state directly: ${rawReads.join(', ')}`);
  const actions = [...jsx.matchAll(/actions\.([A-Za-z]+)/g)].map((match) => match[1]);
  assert.deepEqual(actions, [], 'no reducer action may be passed directly to the header');
  assert.match(home, /useApiRead<\{ headerInfo: HeaderProjection \}>\([\s\S]*?'read\/observation\/overview'/);
  // Report Progress and auto-repeat are reviewed local exceptions (docs/api-v1-implementation-plan.md, Stage 4):
  // the reducer call lives in a named handler outside the guarded JSX slice, not inline in a prop.
  const handler = home.slice(home.indexOf('const handleReportProgress = '), home.indexOf('const planAutoEquipment = '));
  assert.match(handler, /actions\.addNotification/);
});
