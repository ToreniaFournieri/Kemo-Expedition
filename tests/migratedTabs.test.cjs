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
  enemyDisplay: ['getEnemyTypeShortName'],
  equipmentDisplay: ['replaceFlatItemStat'],
  gameState: ['getItemDisplayName'],
  jewel: ['getJewelDisplayName', 'getJewelOwnedCount', 'JEWELS_BY_ITEM_CATEGORY'],
  magic: ['getMagicStyleLabel', 'resolveMagicProfile', 'resolveSpecialMagicFromAbilities'],
};

// Reviewed exceptions: each is a known gap that is recorded in the plan, with the reason it cannot be projected yet.
const REVIEWED_EXCEPTIONS = {
  // Default name chosen when the race changes (Spec 8.2.3): an unsaved draft, chosen before any commit exists.
  gameplayRandom: ['gameplayRandom'],
  // Constants and transport-facing UI types; saved-set availability itself is projected by the Application API.
  // `createDefaultEquipmentSetName` is the display-only default set name (Spec 8.2.4), shared with `saveEquipmentSet`.
  equipmentSets: ['createDefaultEquipmentSetName', 'MAX_SAVED_EQUIPMENT_SETS', 'type EquipmentSetLoadMode'],
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
  // Reducer actions passed to the tab: only local toasts (stat changes, a rejected character edit) and the shared party
  // selection remain (the selected party stays in the game state).
  const actions = [...jsx.matchAll(/actions\.([A-Za-z]+)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(actions)].sort(), ['addNotification', 'addStatNotifications', 'selectParty'], 'only the reviewed reducer actions may be passed to the Party tab');
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

test('Expedition controls are Application API commits, not reducer actions', () => {
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
  assert.match(selection, /if \(apiControlActiveRef\.current\) \{[\s\S]*?actions\.selectParty\(partyIndex\);[\s\S]*?return;[\s\S]*?diaryCommandQueueRef\.current/, 'API-controlled navigation must not wait for a blocked acknowledgement');
  const diaryRead = home.slice(home.indexOf('const diaryObservation ='), home.indexOf('const diaryProjection ='));
  assert.match(diaryRead, /parameters: \{ partyNumber: currentParty\.id \}/, 'Diary uses renderer view context instead of the API account default');
  const publication = read('src/hooks/useGameState.ts').split('publishApiState:')[1].split('commitApiState:')[0];
  assert.match(publication, /preservePartySelection: true/, 'API runtime publications keep the renderer selection');
  assert.doesNotMatch(selection, /actions\.(markDiaryLogSeen|markPartyDiaryLogsSeen|updateDiarySettings)/);
});

test('a disabled multi-read keeps its last result, so a hidden tab never returns empty', () => {
  const hook = read('src/components/home/useApiRead.ts');
  const many = hook.slice(hook.indexOf('export function useApiReadMany'));
  assert.match(many, /if \(!adapter \|\| !inputs\) return;/);
  assert.doesNotMatch(many, /if \(!adapter \|\| !inputs[^)]*\) \{ setData\(null\)/);
});

test('the Shop pane draws the Base projection and buys and refreshes through the Application API', () => {
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

// SpecRef: 9.1.4.17 | UI state ownership | Settings UI migration (Stage 8's last item)
// The Setting tab remains partially migrated only for Debug and Send Feedback. The five large read-only reference
// panels now take their disclosure/content facts from the Application API while keeping local presentation state.
test('the Setting tab reads migrated settings and reference panels from the Application API', () => {
  const tab = read('src/components/home/tabs/SettingTab.tsx');
  for (const banned of [/DEVELOPER_NEWS_ITEMS/, /getDeveloperNewsContent/, /\bdeityDonations\b/, /donationByDeity/, /onResetCommonBags/, /onResetUniqueBags/, /onResetSideQuestBag/]) {
    assert.doesNotMatch(tab, banned, `SettingTab must not reference ${banned}`);
  }
  assert.match(tab, /developerNewsEntries: Array<\{ version: string; date: string; content: string; isRead: boolean \}>;/);
  assert.match(tab, /donationRows: Array<\{ deityName: string; donationGold: number; rank: number; nextRankDonationRequirement: number \| null \}>;/);
  assert.match(tab, /clairvoyanceProjections: ApiV1ClairvoyanceResource\[\] \| null;/);
  assert.match(tab, /onClairvoyanceReset: \(partyIndex: number, changes:/);
  assert.match(tab, /enemyEditValidOptions\?\.enemyType/, 'Enemy Edit\'s type dropdown reads its option keys from the API, not only the hand-maintained label map');
  for (const projection of ['glossaryEntries', 'itemCompendiumEntries', 'characterRosterEntries', 'bestiaryEntries', 'superRareEntries']) {
    assert.match(tab, new RegExp(`${projection}:`), `SettingTab must receive ${projection}`);
  }
  assert.doesNotMatch(tab, /gameState\.global\.(revealedGlossaryAbilityIds|revealedGlossaryTerrainKeys|revealedItemCompendiumItemIds|enemyBattleStats)/);
});

test('HomeScreen wires the Setting tab\'s migrated panels through the Application API, not raw reducer actions', () => {
  const home = read('src/components/HomeScreen.tsx');
  for (const operation of [
    'resources/developerNewsNotification', 'resources/donationBox', "resources/clairvoyance/{p}'", "read/setting/enemyEditPane'",
    "resources/glossary'", "resources/itemCompendium'", "resources/characterRoster'", "resources/bestiary'", "resources/superRareList'",
    'commit/setting/markNewsAsRead', 'commit/setting/clairvoyanceReset', 'commit/setting/modeSelect',
    'commit/setting/backup/export', 'commit/setting/backup/import', 'commit/setting/backup/reset',
  ]) assert.ok(home.includes(operation), `HomeScreen must call ${operation}`);
  const start = home.indexOf('<SettingTab');
  assert.ok(start >= 0);
  const jsx = home.slice(start, home.indexOf('\n      />', start));
  assert.doesNotMatch(
    jsx,
    /actions\.(setLanguage|markDeveloperNewsRead|resetCommonBags|resetUniqueBags|resetSideQuestBag|resetGame|importGameState|getCompressedSavePayload)\b/,
    'a migrated Setting panel must not be wired to a raw reducer action',
  );
  // Mode Select display settings commit through `modeSelect`, never straight to the runtime state setters; auto-repeat
  // stays local by Spec 9.1.3, 3-6-2.
  assert.match(jsx, /onSetGameMode=\{\(mode\) => commitDisplaySetting\(/);
  assert.match(jsx, /onSetDarkModeSetting=\{\(setting\) => commitDisplaySetting\(/);
  assert.match(jsx, /onSetExpeditionStatsDisplayEnabled=\{\(enabled\) => commitDisplaySetting\(/);
  assert.doesNotMatch(jsx, /=\{(setGameMode|setDarkModeSetting|setIsExpeditionStatsDisplayEnabled)\}/);
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

// SpecRef: 9.1.4.17 | UI state ownership (Stage 9.5 audit; docs/api-v1-ui-ownership.md)
// Every reducer action HomeScreen still calls is classified. A new call fails here until it is either routed through
// the Application API or added to this map with its category and reason.
const HOMESCREEN_REDUCER_ACTIONS = {
  // The live runtime engine (party cycle, AFK recovery, side quests, save flushing). Stage 4 kept it in HomeScreen and
  // the reducer by decision; none of these is wired to a player control.
  runtimeEngine: [
    'advanceSideQuest', 'applyAutoEquipmentActions', 'autoSelectDungeon', 'cancelSideQuest', 'commitAfkPartyChunk',
    'commitAfkPartyTransaction', 'commitAfkPartyTransactionAuthoritatively', 'finalizeDiaryLog', 'flushSave',
    'getAuthoritativeState', 'healPartyHp', 'processPendingProfit', 'publishAuthoritativeState', 'rollPartySleepiness',
    'rollSideQuest', 'runExpedition', 'setSideQuestProgress', 'spendPendingProfit',
  ],
  // Local toasts: no game state, no save.
  localNotification: ['addNotification', 'addStatNotifications'],
  // The selected party stays in the shared game state (decided, Stage 5 4e).
  sharedSelection: ['selectParty'],
  // Debug pane only (dev/beta): the Vault has no API by Spec 8.4.3; the Party-unlock button has no API operation.
  debugOnly: ['buyDebugStoreItem', 'unlockPartySlot'],
  // Send Feedback stays a reviewed local exception by user decision.
  sendFeedback: ['grantFeedbackReward'],
};

test('HomeScreen calls only classified reducer actions', () => {
  const home = read('src/components/HomeScreen.tsx');
  const used = new Set([...home.matchAll(/\bactions\.([A-Za-z]+)\b/g)].map((match) => match[1]));
  // `plan.actions.length` and `profile.actions.push` are arrays named `actions`, not the reducer.
  for (const arrayMember of ['length', 'push']) used.delete(arrayMember);
  const classified = new Set(Object.values(HOMESCREEN_REDUCER_ACTIONS).flat());
  const unclassified = [...used].filter((name) => !classified.has(name)).sort();
  assert.deepEqual(unclassified, [], `unclassified reducer actions in HomeScreen: ${unclassified.join(', ')}`);
  const stale = [...classified].filter((name) => !used.has(name)).sort();
  assert.deepEqual(stale, [], `classified actions no longer used (remove them from the map): ${stale.join(', ')}`);
});

test('runtime-engine reducer actions are never handed to a tab or the header as a control', () => {
  const home = read('src/components/HomeScreen.tsx');
  const props = [...home.matchAll(/^\s+on[A-Z][A-Za-z]*=\{actions\.([A-Za-z]+)\}/gm)].map((match) => match[1]);
  const allowedAsProps = new Set([...HOMESCREEN_REDUCER_ACTIONS.localNotification, ...HOMESCREEN_REDUCER_ACTIONS.sharedSelection, ...HOMESCREEN_REDUCER_ACTIONS.debugOnly, ...HOMESCREEN_REDUCER_ACTIONS.sendFeedback]);
  const leaked = props.filter((name) => !allowedAsProps.has(name));
  assert.deepEqual(leaked, [], `engine actions passed to a component: ${leaked.join(', ')}`);
});

// Browser-storage keys a migrated tab may use. 9.1.4.17: state 8.x requires to be retained belongs in `uiPreferences`
// (per save); only reviewed keys may stay in local storage.
const TAB_STORAGE_KEYS = {
  'SettingTab.tsx': {
    // Send Feedback (reviewed local exception): the previous name and the reward cooldown.
    FEEDBACK_NAME_STORAGE_KEY: 'sendFeedback', FEEDBACK_SUBMITTED_STORAGE_KEY: 'sendFeedback', FEEDBACK_LAST_SUBMITTED_AT_STORAGE_KEY: 'sendFeedback',
    // Pane expansion, per-party Clairvoyance expansion, and the Glossary tab are `uiPreferences` (Build 103), not keys here.
  },
};

test('migrated tabs and the header use only reviewed browser-storage keys', () => {
  const files = ['PartyTab.tsx', 'ExpeditionTab.tsx', 'BaseTab.tsx', 'DiaryTab.tsx', 'SettingTab.tsx'];
  for (const file of files) {
    const source = read(`src/components/home/tabs/${file}`);
    const keys = new Set([...source.matchAll(/(?:local|session)Storage\.(?:getItem|setItem|removeItem)\(\s*([A-Za-z_][A-Za-z0-9_.]*|'[^']*'|`[^`]*`)/g)].map((match) => match[1]));
    const allowed = new Set(Object.keys(TAB_STORAGE_KEYS[file] ?? {}));
    const unreviewed = [...keys].filter((key) => !allowed.has(key)).sort();
    assert.deepEqual(unreviewed, [], `${file} persists UI state under unreviewed keys: ${unreviewed.join(', ')}`);
  }
  assert.doesNotMatch(read('src/components/home/HeaderBar.tsx'), /(?:local|session)Storage\./);
});

test('migrated tabs and the header never reach the desktop bridge directly', () => {
  for (const file of ['tabs/PartyTab.tsx', 'tabs/ExpeditionTab.tsx', 'tabs/BaseTab.tsx', 'tabs/DiaryTab.tsx', 'tabs/SettingTab.tsx', 'HeaderBar.tsx']) {
    assert.doesNotMatch(read(`src/components/home/${file}`), /bokemoDesktop/, `${file} must use the trusted components or ports, not the bridge`);
  }
});

test('the Setting tab keeps retained pane, Clairvoyance, and Glossary-tab state in uiPreferences', () => {
  const tab = read('src/components/home/tabs/SettingTab.tsx');
  for (const name of ['settingPanelExpandedKey', 'clairvoyanceExpandedKey', 'SETTING_GLOSSARY_TAB_FAMILY']) assert.match(tab, new RegExp(`onSetUiPreference\\(${name}`));
  // Every Setting pane, the Enemy Edit pane included, opens and closes through the retained pane state.
  assert.doesNotMatch(tab, /isEnemyEditExpanded/);
  assert.match(tab, /toggleSettingPanel\('enemyEdit'\)/);
  const home = read('src/components/HomeScreen.tsx');
  assert.match(home, /settingPreferences=\{settingTabPreferences\}/);
  assert.match(home, /onSetUiPreference=\{handleSetUiPreference\}/);
});

// Stage 9.5d: the Setting tab no longer receives the complete save. News read state, Clairvoyance availability and reset
// access, and the Character Roster's parties come from projections; Send Feedback's save-derived attachments are built
// by HomeScreen (reviewed local exception). Two scalar reads remain reviewed: the party count (Debug "Party unlock") and
// the shared language.
test('the Setting tab receives no complete save and computes no Clairvoyance access itself', () => {
  const tab = read('src/components/home/tabs/SettingTab.tsx');
  // `game/gameState` is a display-helper module path, not the save.
  assert.doesNotMatch(tab, /(?<!game\/)\bgameState\b/, 'SettingTab must not take the complete game state');
  for (const banned of [/computePartyStats/, /getProphecyControlAccess/, /renderExpeditionMetadata/, /buildStatusTableRows/]) {
    assert.doesNotMatch(tab, banned, `SettingTab must not reference ${banned}`);
  }
  const home = read('src/components/HomeScreen.tsx');
  const start = home.indexOf('<SettingTab');
  const jsx = home.slice(start, home.indexOf('\n      />', start));
  assert.doesNotMatch(jsx, /=\{state\}/);
  const rawReads = [...jsx.matchAll(/^\s+([A-Za-z]+)=\{state\./gm)].map((match) => match[1]).sort();
  assert.deepEqual(rawReads, ['language', 'partyCount'], 'only the reviewed scalar reads');
  assert.match(jsx, /rosterParties=\{rosterParties\}/);
  assert.match(jsx, /onBuildFeedbackReport=\{handleBuildFeedbackReport\}/);
});
