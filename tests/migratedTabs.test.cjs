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
  // The item defense preview recomputes one hypothetical equipment change; API ownership needs an `equip` simulation (open spec question).
  characterComputation: ['computeCharacterStats'],
  equipment: ['replaceCharacterEquipment'],
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
