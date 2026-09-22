import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Type } from '@sinclair/typebox';

const root = process.cwd();
const specificationPath = resolve(root, 'Specification_9.1.4_API_DETAIL.md');
const desktopOutputPath = resolve(root, 'desktop/api-v1-contract.json');
const typescriptOutputPath = resolve(root, 'src/api/v1/generatedOperationCatalog.ts');
const check = process.argv.includes('--check');
const specification = readFileSync(specificationPath, 'utf8');
const rowPattern = /^\| (GET|POST) \| `([^`]+)` \| (Public|Bootstrap|Session) \| ([^|]+?) \|$/gm;
const operations = [...specification.matchAll(rowPattern)].map((match) => ({
  method: match[1], path: match[2], access: match[3].toLowerCase(), purpose: match[4].trim(),
  operationId: match[2].slice('/api/v1/'.length),
}));
if (operations.length !== 85) throw new Error(`Expected 85 /api/v1 operations, found ${operations.length}.`);
if (new Set(operations.map(({ method, path }) => `${method} ${path}`)).size !== operations.length) throw new Error('Duplicate /api/v1 method/path pair in the endpoint index.');
if (operations.some(({ path }) => !path.startsWith('/api/v1/'))) throw new Error('Non-v1 route found in the v1 endpoint index.');

// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Concrete request catalog
const strict = (properties, options = {}) => Type.Object(properties, { additionalProperties: false, ...options });
const optional = (schema, defaultValue) => Type.Optional(defaultValue === undefined ? schema : { ...schema, default: defaultValue });
const literals = (...values) => Type.Union(values.map((value) => Type.Literal(value)));
const nonEmptyArray = (items, options = {}) => Type.Array(items, { minItems: 1, ...options });
const integerId = Type.Integer({ minimum: 1 });
const partyNumber = Type.Integer({ minimum: 1, maximum: 6 });
const stableKey = Type.String({ minLength: 1, maxLength: 200 });
const itemFormat = Type.String({ pattern: '^(?:0|[01]/[1-9][0-9]*/[0-6]/(?:0|[1-9][0-9]*))$' });
const presentItemFormat = Type.String({ pattern: '^[01]/[1-9][0-9]*/[0-6]/(?:0|[1-9][0-9]*)$' });
const evaluatedItemFormat = Type.String({ pattern: '^[01]/[1-9][0-9]*/[0-6]/(?:0|[1-9][0-9]*)/(?:might|arcana|fort|ward|shade|focus):[1-8]$' });
const equipmentChangeFormat = Type.String({ pattern: '^[0-9]+=(?:0|[01]/[1-9][0-9]*/[0-6]/(?:0|[1-9][0-9]*)/(?:(?:might|arcana|fort|ward|shade|focus):[1-8]|0:0))$' });
// ajv-formats is not a project dependency, so ISO instants are validated by pattern rather than the `format` keyword.
const isoTimestamp = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$' });
// Concrete example values for schema objects whose pattern is too specific for the generic string heuristics in sample().
const sampleOverrides = new WeakMap();
sampleOverrides.set(presentItemFormat, '0/1101/2/0');
sampleOverrides.set(evaluatedItemFormat, '0/1101/2/0/fort:1');
sampleOverrides.set(equipmentChangeFormat, '0=0/1101/2/0/0:0');
const equipmentTarget = Type.Union([Type.Integer({ minimum: 0 }), nonEmptyArray(Type.Integer({ minimum: 0 }), { uniqueItems: true })]);
const language = literals('ja', 'en', 'zh-CN', 'zh-TW', 'ko');
const environment = literals('dev', 'beta', 'orca', 'prod', 'desktop');
const gameMode = literals('normal', 'orca');
const modeKey = literals('mode.normal', 'mode.orca');
const itemCategory = literals('sword', 'katana', 'bow', 'armor', 'glove', 'wand', 'robe', 'shield', 'bolt', 'book', 'catalyst', 'arrow', 'jewel');
const rarity = literals('common', 'uncommon', 'eliteRare', 'bossRare', 'mythicRare', 'all');
const detail = literals('none', 'ability', 'cBonus', 'otherBonus', 'abilityAndCBonus', 'all');
const identity = { userId: Type.String({ pattern: '^[A-Za-z0-9_-]{1,16}$' }), environment, gameMode, levelOffsetForOrca: optional(Type.Integer({ minimum: 0, maximum: 20 }), 5) };
const empty = strict({});
const expeditionOutcome = literals('Clear', 'Return', 'Draw', 'Retreat', 'Defeat');
// SpecRef: 9.1.3 | Read | 2-2-2 {p}/latestBattleLog
const scalar = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);
const factMap = Type.Record(Type.String(), scalar);
const enemyStatus = strict({
  enemyId: integerId, name: Type.String(), nameKey: Type.Union([Type.String(), Type.Null()]), level: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  enemyType: stableKey, tier: literals('normal', 'elite', 'boss', 'divine'), mainClass: stableKey, subClass: Type.Union([stableKey, Type.Null()]),
  hp: Type.Integer({ minimum: 0 }), magicStyle: Type.Union([Type.String(), Type.Null()]),
  stats: Type.Array(strict({ key: stableKey, value: Type.Number(), unit: literals('number', 'ratio') })),
  abilities: Type.Array(strict({ abilityId: stableKey, level: Type.Integer({ minimum: 1 }) })),
  ability: Type.Array(Type.String()), cBonus: Type.Array(Type.String()), otherBonus: Type.Array(Type.String()), dropItemIds: Type.Array(integerId),
});
const bottleneckEnemy = strict({
  room: Type.Integer({ minimum: 1 }), outcome: literals('victory', 'defeat', 'draw'), damageTakenPercent: Type.Number({ minimum: 0 }),
  reasons: Type.Array(literals('damage', 'outcome')), enemy: Type.Union([enemyStatus, Type.Null()]),
});
// A compact event row: [category, timing, actorId, opcode, targetId, element, hits, attempts, value, facts].
const compactEvent = Type.Tuple([Type.Integer(), Type.Integer(), Type.Integer(), Type.Integer(), Type.Integer(), Type.String(), Type.Integer(), Type.Integer(), Type.Number(), factMap]);
const legacyEvent = Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Record(Type.String(), Type.Union([Type.Number(), Type.Boolean()]))]));
const endEvent = Type.Union([Type.Tuple([Type.Literal(0), factMap]), Type.Tuple([Type.Literal(1), factMap]), Type.Tuple([Type.Literal(2), strict({ id: integerId, enhancement: Type.Integer({ minimum: 0, maximum: 6 }), superRare: Type.Integer({ minimum: 0 }), jewel: Type.Optional(Type.Union([strict({ key: stableKey, rank: Type.Integer({ minimum: 1, maximum: 8 }) }), Type.Null()])) }), Type.Optional(Type.Number())]), Type.Tuple([Type.Literal(3)]), Type.Tuple([Type.Literal(4)])]);
sampleOverrides.set(endEvent, [3]);
sampleOverrides.set(compactEvent, [2, 49, 1, 1, 2147483649, 'none', 1, 1, 10, {}]);
const nullableInteger = Type.Union([Type.Integer(), Type.Null()]);
const battleRoomBase = {
  room: Type.Integer({ minimum: 1 }), floor: nullableInteger, roomInFloor: nullableInteger, roomType: Type.Union([Type.String(), Type.Null()]), enemyId: nullableInteger,
  enemyMaximumHp: Type.Number({ minimum: 0 }), outcome: literals('victory', 'defeat', 'draw'), damageDealt: Type.Number(), damageTaken: Type.Number(),
  startingPartyHp: Type.Union([Type.Number(), Type.Null()]), remainingPartyHp: Type.Number(), maximumPartyHp: Type.Number(),
  healAmount: Type.Union([Type.Number(), Type.Null()]), attritionAmount: Type.Union([Type.Number(), Type.Null()]), endEvents: Type.Array(endEvent),
};
const battleRoom = Type.Union([
  strict({
    ...battleRoomBase, eventFormat: Type.Literal('compact-v1'), terrain: Type.Union([Type.String(), Type.Null()]),
    actors: Type.Array(strict({ id: Type.Integer(), kind: literals('character', 'enemy'), enemyId: Type.Optional(Type.Integer()), characterId: Type.Optional(Type.Integer()), name: Type.Optional(Type.String()) })),
    modifiers: Type.Array(Type.Array(scalar)), events: Type.Array(compactEvent),
  }),
  strict({ ...battleRoomBase, eventFormat: Type.Literal('legacy-facts'), legacyIncomplete: Type.Literal(true), events: Type.Array(legacyEvent) }),
]);
// Spec 9.1.3, 2-2-2 `resources`: the stored, language-neutral records a client renders a battle log from (see battleLogs.ts).
const diaryItem = strict({ id: integerId, enhancement: Type.Integer({ minimum: 0, maximum: 6 }), superRare: Type.Integer({ minimum: 0 }), jewel: Type.Optional(Type.Union([strict({ key: stableKey, rank: Type.Integer({ minimum: 1, maximum: 8 }) }), Type.Null()])) });
// DiaryText = [key, params?] where a param is a string, a number, or another DiaryText.
const diaryText = Type.Recursive((self) => Type.Union([Type.Tuple([Type.String()]), Type.Tuple([Type.String(), Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), self]))])]));
sampleOverrides.set(diaryText, ['gate.key']);
const nullableString = Type.Union([Type.String(), Type.Null()]);
const enemyBonus = strict({ type: Type.String(), value: Type.Number(), abilityId: Type.Optional(Type.String()), abilityLevel: Type.Optional(Type.Number()), unimplementedLabel: Type.Optional(Type.String()) });
const enemySnapshot = strict({
  id: Type.Integer(), type: literals('normal', 'elite', 'boss'), enemyType: Type.String(), spawnTier: Type.Number(), spawnPool: Type.Number(), poolId: Type.Number(), name: Type.String(), nameKey: Type.Optional(Type.String()),
  enemyClass: stableKey, enemySubClass: Type.Optional(Type.String()), abilities: Type.Array(strict({ id: Type.String(), level: Type.Integer() })), bonuses: Type.Optional(Type.Array(enemyBonus)),
  accuracyBonus: Type.Number(), evasionBonus: Type.Number(), hp: Type.Number(),
  rangedAttack: Type.Number(), rangedNoA: Type.Number(), magicalAttack: Type.Number(), magicalNoA: Type.Number(), magicStyle: Type.Optional(literals('multi-hit', 'arc-magic', 'percentage_damage', 'debuff')),
  meleeAttack: Type.Number(), meleeNoA: Type.Number(), rangedAttackAmplifier: Type.Number(), magicalAttackAmplifier: Type.Number(), meleeAttackAmplifier: Type.Number(),
  physicalDefense: Type.Number(), magicalDefense: Type.Number(), elementalOffense: literals('none', 'fire', 'thunder', 'ice'), elementalOffenseValue: Type.Number(),
  elementalResistance: strict({ fire: Type.Number(), thunder: Type.Number(), ice: Type.Number() }), physicalDefenseAmplifier: Type.Number(), magicalDefenseAmplifier: Type.Number(),
  experience: Type.Number(), itemIds: Type.Optional(Type.Array(Type.Integer())), isGodEnemy: Type.Optional(Type.Boolean()), image_path: Type.Optional(Type.String()),
});
const compactBattleActor = strict({
  id: Type.Integer(), kind: literals('character', 'enemy'), name: Type.String(), nameKey: Type.Optional(Type.String()),
  appearance: Type.Optional(Type.Union([Type.Tuple([Type.String(), literals(0, 1)]), Type.Tuple([Type.String(), literals(0, 1), Type.Union([Type.String(), Type.Number()])])])),
  elementalOffense: literals('none', 'fire', 'thunder', 'ice'), elementalOffenseValue: Type.Number(), magicStyle: Type.Optional(literals('multi-hit', 'arc-magic', 'percentage_damage', 'debuff')),
  physicalDefense: Type.Number(), abilities: Type.Array(Type.Tuple([Type.String(), Type.Integer()])),
});
// The stored envelope: ordered numeric event rows whose meaning is fixed by the append-only tables of `compactBattleLog.ts`.
const compactBattleLog = strict({ version: Type.Literal(1), actorSet: Type.Optional(Type.Array(Type.Integer())), actors: Type.Array(compactBattleActor), terrain: Type.Optional(nullableString), abilities: Type.Array(Type.String()), events: Type.Array(Type.Array(Type.Number())) });
sampleOverrides.set(compactBattleLog, { version: 1, actors: [], abilities: [], events: [] });
// A legacy record keeps the entries it was saved with, prose included.
const legacyBattleEntry = strict({
  semanticPresentation: Type.Optional(Type.Boolean()), actorDisplayName: Type.Optional(Type.String()), targetDisplayName: Type.Optional(Type.String()), isResurrection: Type.Optional(Type.Boolean()), actionIncludesActor: Type.Optional(Type.Boolean()),
  phase: literals('start', 'combat', 'end'), attackType: Type.Optional(literals('ranged', 'magical', 'melee')), initiativeRoll: Type.Optional(Type.Number()),
  actor: literals('party', 'enemy', 'character', 'effect', 'triggered', 'deity'), characterId: Type.Optional(Type.Integer()), effectKind: Type.Optional(literals('life_drain', 'stealth', 'terrain')),
  effectSourceName: Type.Optional(Type.String()), effectTargetName: Type.Optional(Type.String()), effectHealAmount: Type.Optional(Type.Number()), isAggregated: Type.Optional(Type.Boolean()),
  action: Type.String(), note: Type.Optional(Type.String()), noteTone: Type.Optional(literals('default', 'sub', 'muted')),
  damage: Type.Optional(Type.Number()), damageTarget: Type.Optional(literals('party', 'enemy')), reflectedDamage: Type.Optional(Type.Number()), reflectedSourceDamage: Type.Optional(Type.Number()), reflectTarget: Type.Optional(literals('party', 'enemy')),
  absorbedDamage: Type.Optional(Type.Number()), absorbTarget: Type.Optional(literals('party', 'enemy')), showZeroDamage: Type.Optional(Type.Boolean()), hits: Type.Optional(Type.Number()), totalAttempts: Type.Optional(Type.Number()),
  specialAttack: Type.Optional(literals('gravity_well', 'armor_break', 'mana_break')), rageBonusPercent: Type.Optional(Type.Number()), momentumBonusPercent: Type.Optional(Type.Number()), ambushMultiplier: Type.Optional(Type.Number()),
  overwatchMultiplier: Type.Optional(Type.Number()), executionMultiplier: Type.Optional(Type.Number()), swarmActorPenaltyPercent: Type.Optional(Type.Number()), swarmOpponentBonusPercent: Type.Optional(Type.Number()),
  isFirstStrike: Type.Optional(Type.Boolean()), isCounter: Type.Optional(Type.Boolean()), isReAttack: Type.Optional(Type.Boolean()), isEnemyTargetHit: Type.Optional(Type.Boolean()), hideInitiativeLabel: Type.Optional(Type.Boolean()),
  wasNegated: Type.Optional(Type.Boolean()), elementalOffense: Type.Optional(literals('none', 'fire', 'thunder', 'ice')),
});
// The end events as stored (flavor facts included: they select the narration variant).
const storedEndEvent = Type.Union([Type.Tuple([Type.Literal(0), factMap]), Type.Tuple([Type.Literal(1), factMap]), Type.Tuple([Type.Literal(2), diaryItem]), Type.Tuple([Type.Literal(2), diaryItem, Type.Number()]), Type.Tuple([Type.Literal(3)]), Type.Tuple([Type.Literal(4)])]);
sampleOverrides.set(storedEndEvent, [3]);
const roomResources = strict({
  room: Type.Integer({ minimum: 1 }), godsBattle: Type.Boolean(), gateText: Type.Union([diaryText, Type.Null()]), postBattlePartyHp: Type.Union([Type.Number(), Type.Null()]),
  enemy: Type.Union([enemySnapshot, Type.Null()]), rewardItems: Type.Array(diaryItem),
  battle: Type.Union([strict({ format: Type.Literal('compact-v1'), log: compactBattleLog }), strict({ format: Type.Literal('legacy'), details: Type.Array(legacyBattleEntry) })]),
  endEvents: Type.Array(storedEndEvent),
  legacyText: Type.Union([strict({ enemyName: Type.String(), gateInfo: nullableString, reward: nullableString, rewardRarity: nullableString, rewardIsSuperRare: Type.Union([Type.Boolean(), Type.Null()]) }), Type.Null()]),
});
const battleLogResources = strict({ rooms: Type.Array(roomResources), autoSellMultiplier: Type.Union([Type.Number(), Type.Null()]), compact: Type.Boolean() });
const explorationResources = strict({ rooms: Type.Array(roomResources, { maxItems: 24 }), compact: Type.Boolean() });
const battleLogSchema = strict({
  logId: stableKey, partyNumber, dungeonId: integerId, difficultyOffset: Type.Integer({ minimum: 0 }), finalOutcome: expeditionOutcome,
  totalExperience: Type.Number({ minimum: 0 }), completedRooms: Type.Integer({ minimum: 0 }), totalRooms: Type.Integer({ minimum: 0 }),
  remainingPartyHp: Type.Number(), maximumPartyHp: Type.Number(),
  rewards: Type.Array(strict({ item: presentItemFormat, itemId: integerId, category: stableKey, tier: Type.Integer({ minimum: 1 }), rarity: stableKey, enhancement: Type.Integer({ minimum: 0, maximum: 6 }), superRare: Type.Integer({ minimum: 0 }) })),
  autoSell: strict({ count: Type.Integer({ minimum: 0 }), gold: Type.Number({ minimum: 0 }) }),
  rooms: Type.Array(battleRoom),
});
const percentage = Type.Number({ minimum: 0, maximum: 100 });
const floorRoomKey = Type.String({ pattern: '^[1-6]f-[1-4]$' });
sampleOverrides.set(floorRoomKey, '1f-1');
const count = Type.Integer({ minimum: 0 });
const pathSchemas = {
  p: strict({ p: partyNumber }), characterId: strict({ characterId: integerId }), diaryEntryId: strict({ diaryEntryId: integerId }),
  deliveryId: strict({ deliveryId: Type.String({ minLength: 1, maxLength: 200 }) }),
};

const page = { limit: optional(Type.Integer({ minimum: 1, maximum: 200 }), 100), cursor: optional(stableKey) };
const querySchemas = {
  'read/observation/party': strict({ partyNumber: optional(partyNumber), characterId: optional(integerId) }),
  'read/observation/base': strict({ pane: optional(literals('shop', 'inventory', 'vault', 'workshop', 'altar')) }),
  'read/observation/diary': strict({ partyNumber: optional(partyNumber), diaryEntryId: optional(integerId) }),
  'read/expedition/{p}/latestBattleLog': strict({ logId: optional(Type.String({ minLength: 1, maxLength: 200 })) }),
  'read/build/character/{characterId}/equipmentSet': strict({ equipmentSetId: optional(Type.Union([integerId, nonEmptyArray(integerId, { uniqueItems: true })])), isEquipmentSetDetail: optional(Type.Boolean(), false) }),
  'read/build/character/{characterId}/equipmentEvaluation': strict({
    targetItems: optional(Type.Union([evaluatedItemFormat, nonEmptyArray(evaluatedItemFormat, { uniqueItems: true, maxItems: 100 })])),
    equipmentChanges: optional(Type.Union([equipmentChangeFormat, nonEmptyArray(equipmentChangeFormat, { uniqueItems: true, maxItems: 100 })])),
  }),
  'read/base/searchItems': strict({ state: optional(literals('owned', 'equipped', 'sold', 'all'), 'owned'), category: optional(itemCategory), rarity: optional(rarity, 'all'), superRare: optional(Type.Boolean()), superRareId: optional(Type.Integer({ minimum: 0 })), itemId: optional(integerId), searchAbility: optional(stableKey), searchBonus: optional(stableKey), details: optional(detail, 'abilityAndCBonus'), limit: optional(Type.Integer({ minimum: 1, maximum: 5000 }), 10) }),
  'read/base/enemyFormList': strict({ enemyType: optional(stableKey), enemyId: optional(integerId) }),
  'resources/glossary': strict({ category: literals('Ab.', 'Base.', 'Fixed.', 'Inc.', 'Mech.', 'Faith.', 'Magic.', 'Quest.', 'Terrain.'), glossaryId: optional(stableKey), ...page }),
  'resources/itemCompendium': strict({ category: itemCategory, rarity: optional(rarity, 'all'), tier: optional(Type.Integer({ minimum: 1, maximum: 8 })), itemId: optional(integerId), searchAbility: optional(stableKey), searchBonus: optional(stableKey), details: optional(detail, 'abilityAndCBonus'), ...page }),
  'resources/characterRoster': strict({ race: literals('lupinian', 'vulpinian', 'felidian', 'caninian', 'ursan', 'procyonian', 'leporian', 'cervin', 'murid', 'kemoria', 'orcinian', 'avian', 'mimorian'), ...page }),
  'resources/bestiary': strict({ enemyId: optional(integerId), enemyType: optional(stableKey), expedition: optional(integerId), ...page }),
  'resources/superRareList': strict({ superRareId: optional(Type.Integer({ minimum: 1 })), ...page }),
};

const threshold = Type.Union([literals('all', 'none'), Type.Integer({ minimum: 1, maximum: 6 })]);
const diarySetting = {
  superRareThreshold: optional(threshold), bossThreshold: optional(threshold), mythicThreshold: optional(threshold), rareThreshold: optional(threshold),
  sideQuestThreshold: optional(Type.Union([literals('all', 'none'), Type.Integer({ minimum: 2, maximum: 8 })])), notifyGodsBattle: optional(Type.Boolean()),
  defeatNotificationMode: optional(literals('defeatOnly', 'defeatAndDraw', 'defeatDrawRetreat', 'all', 'none')), notifyCyclePopup: optional(Type.Boolean()),
  notifyItemDropPopup: optional(Type.Boolean()), notifyAutoEquipmentPopup: optional(Type.Boolean()), notifySideQuestPopup: optional(Type.Boolean()),
};
const modeSelect = {
  mode: optional(modeKey), enemyLevelOffset: optional(Type.Integer({ minimum: 0, maximum: 20 })), language: optional(language), darkMode: optional(literals('off', 'on', 'system')),
  autoRepeat: optional(Type.Boolean()), showExpeditionStats: optional(Type.Boolean()),
  theme: optional(literals('theme.kemo', 'theme.laika', 'theme.leonard', 'theme.orca', 'theme.nox', 'theme.luna', 'theme.mishka', 'theme.puchitsa', 'theme.hagakure', 'theme.souga-ha', 'theme.finn', 'theme.merle', 'theme.rosaria', 'theme.milly', 'theme.guabi', 'theme.nemea', 'theme.bernetta', 'theme.yone', 'theme.niv', 'theme.nave')),
};
const debug = {
  runtimeDiagnostics: optional(Type.Boolean()), clairvoyance: optional(Type.Boolean()), speedOfTime: optional(literals('real', 'x1.2', 'x5', 'x20', 'x100', 'unlimited')),
  godsBattleCondition: optional(literals('normal', 'simple')), godsStrength: optional(literals('normal', 'veryWeak')), debugStoreOpen: optional(Type.Boolean()),
  displayFlavorCondition: optional(Type.Boolean()), displayAfkDuration: optional(Type.Boolean()), displayAllBestiary: optional(Type.Boolean()), displayAllCompendium: optional(Type.Boolean()),
  displayAllGlossary: optional(Type.Boolean()), colosseumMode: optional(Type.Boolean()),
};
const addedAbility = strict({ abilityId: stableKey, level: Type.Integer({ minimum: 1, maximum: 10 }) });
const enemyEdit = { enemyLevel: optional(Type.Integer({ minimum: 1, maximum: 99 })), enemyName: optional(Type.String({ minLength: 1, maxLength: 100 })), terrainEffect: optional(stableKey), enemyType: optional(stableKey), mainClass: optional(stableKey), subClass: optional(stableKey), addedAbilities: optional(Type.Array(addedAbility, { maxItems: 5 })) };

const commitParameters = {
  'commit/progress/elapsed': strict({ calculateToRealTime: optional(Type.Boolean()), elapsedSeconds: optional(Type.Integer({ minimum: 60, maximum: 43200 })) }),
  'commit/progress/progressReport': empty,
  'commit/expedition/{p}/changeExpedition': strict({ destination: optional(integerId), destinationMode: optional(literals('auto', 'fixed')), depthLimit: optional(Type.String({ pattern: '^(?:[1-9][0-9]*f-[1-9][0-9]*|beforeBoss|all)$' })), difficultyOffset: optional(Type.Integer({ minimum: 0, maximum: 68, multipleOf: 2 })) }),
  'commit/expedition/{p}/sortie': empty, 'commit/expedition/{p}/godsBattle': empty, 'commit/expedition/{p}/resetStatistics': empty,
  'commit/build/party/{p}': strict({ deityId: optional(stableKey), order: optional(nonEmptyArray(integerId, { minItems: 6, maxItems: 6, uniqueItems: true })) }),
  'commit/build/character/{characterId}/changeBuild': strict({ name: optional(Type.String({ minLength: 1, maxLength: 100 })), racesAndGender: optional(stableKey), mainClassId: optional(stableKey), subClassId: optional(stableKey), lineage: optional(stableKey), predisposition: optional(stableKey), simulation: Type.Boolean(), confirmation: Type.Optional(Type.Union([Type.Literal('yes'), Type.Literal('no')])) }),
  'commit/build/character/{characterId}/removeAllEquipment': empty,
  'commit/build/character/{characterId}/removeEquipment': strict({ targetEquipment: equipmentTarget }),
  'commit/build/character/{characterId}/equip': strict({ targetEquipment: Type.Union([itemFormat, nonEmptyArray(itemFormat)]), targetSlot: optional(Type.Integer({ minimum: 0 })) }),
  'commit/build/character/{characterId}/lockEquipment': strict({ targetEquipment: equipmentTarget }),
  'commit/build/character/{characterId}/unlockEquipment': strict({ targetEquipment: equipmentTarget }),
  'commit/build/character/{characterId}/autoEquipment': strict({ mode: literals('FULL', 'SEMI', 'OFF'), immediateAutoEquipment: optional(Type.Boolean(), false) }),
  'commit/build/character/{characterId}/jewelAttach': strict({ targetEquipment: equipmentTarget, jewelToSet: Type.String({ pattern: '^(?:might|arcana|fort|ward|shade|focus):[1-8]$' }) }),
  'commit/build/character/{characterId}/jewelRemove': strict({ targetEquipment: equipmentTarget }),
  'commit/build/character/{characterId}/saveEquipmentSet': strict({ equipmentSet: strict({ name: optional(Type.String({ minLength: 1, maxLength: 100 })) }) }),
  'commit/build/character/{characterId}/loadEquipmentSet': strict({ equipmentSetId: integerId, loadMode: optional(literals('equipSet', 'equipSimilar', 'equipExactMatchesOnly')) }),
  'commit/build/character/{characterId}/deleteEquipmentSet': strict({ equipmentSetId: integerId }),
  'commit/build/character/{characterId}/renameEquipmentSet': strict({ equipmentSetId: integerId, name: Type.String({ minLength: 1, maxLength: 100 }) }),
  'commit/build/character/{characterId}/undoEquipment': empty, 'commit/build/character/{characterId}/redoEquipment': empty,
  'commit/base/changeJewelPriorityParty': strict({ partyNumber: Type.Union([partyNumber, Type.Literal('none')]) }),
  'commit/base/sellInventoryItems': strict({ items: nonEmptyArray(itemFormat, { uniqueItems: true }) }),
  'commit/base/purchaseShopItems': strict({ items: nonEmptyArray(strict({ shopItemId: integerId }), { uniqueItems: true }) }),
  'commit/base/paidShopRefresh': empty, 'commit/base/unlockSoldItems': strict({ items: nonEmptyArray(itemFormat, { uniqueItems: true }) }),
  'commit/base/unlockForm': strict({ enemyId: integerId }), 'commit/base/markItemsAsSeen': strict({ items: nonEmptyArray(stableKey, { uniqueItems: true }) }),
  'commit/diary/{p}/diarySetting': strict(diarySetting),
  'commit/diary/diaryEntry/markAsRead': strict({ diaryEntryId: Type.Union([Type.Literal('ALL'), integerId, nonEmptyArray(integerId, { uniqueItems: true })]), partyNumber: optional(partyNumber) }),
  'commit/setting/clairvoyanceReset': strict({ partyNumber, resetCommonRewards: Type.Boolean(), resetRewards: Type.Boolean(), resetSideQuest: Type.Boolean() }),
  'commit/setting/modeSelect': strict(modeSelect), 'commit/setting/enemyEditPane': strict(enemyEdit),
  'commit/setting/feedback': strict({ name: Type.String({ minLength: 1, maxLength: 100 }), category: literals('feedback', 'question', 'featureRequest', 'bugReport'), text: Type.String({ minLength: 1, maxLength: 20000 }), latestBattleLogParty: optional(Type.Union([partyNumber, Type.Literal('none')]), 1), includeBackup: optional(Type.Boolean(), false), attachments: optional(Type.Array(Type.String({ pattern: '^attachment[0-3]$' }), { maxItems: 4, uniqueItems: true }), []) }),
  'commit/setting/backup/export': empty, 'commit/setting/backup/import': empty, 'commit/setting/backup/reset': empty,
  'commit/setting/debug': strict(debug), 'commit/setting/markNewsAsRead': strict({ version: optional(Type.Union([stableKey, nonEmptyArray(stableKey, { uniqueItems: true })])) }),
  'commit/setting/uiPreferences': strict({ changes: nonEmptyArray(strict({ key: stableKey, value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]) })) }),
};

const directBodySchemas = {
  'fundamental/signUp': strict({ ...identity, language: optional(language, 'ja') }), 'fundamental/logIn': strict(identity), 'fundamental/logOut': empty,
};

// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Concrete response catalog
const numericFact = strict({ key: stableKey, value: Type.Number(), unit: literals('number', 'ratio', 'seconds') });
const abilityFact = strict({ abilityId: stableKey, level: Type.Integer({ minimum: 1, maximum: 10 }) });
const bonusFact = strict({ bonusId: stableKey, value: Type.Number() });
const attackFact = strict({ attackType: literals('melee', 'ranged', 'magical'), available: Type.Boolean(), facts: Type.Array(numericFact), speed: Type.Union([Type.Null(), strict({ min: Type.Integer(), max: Type.Integer(), diceCount: Type.Integer(), dieSize: Type.Integer() })]) });
const calculatedStatus = strict({ stats: Type.Array(numericFact), abilities: Type.Array(abilityFact), bonuses: Type.Array(bonusFact), attacks: Type.Array(attackFact) });
// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Sell/purchase results
const tradeResult = strict({ items: Type.Array(strict({ item: itemFormat, quantity: Type.Integer({ minimum: 1 }) })), goldDelta: Type.Integer(), pranaDelta: Type.Integer() });
const semanticText = strict({ key: stableKey, args: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean()])) });
const availability = strict({ available: Type.Boolean(), unavailableReason: Type.Union([Type.String(), Type.Null()]) });
const equipmentEntryFormat = Type.String({ pattern: '^(?:0|[0-9]+/[01]/[1-9][0-9]*/[0-6]/(?:0|[1-9][0-9]*)(?:/(?:might|arcana|fort|ward|shade|focus):[1-8])?)$' });
sampleOverrides.set(equipmentEntryFormat, '0');
const equipmentEntryList = Type.Array(equipmentEntryFormat);
// SpecRef: 9.1.3 | 2-3-3 read/build/character/{characterId}/equipment | validOptions.undoEquipment and redoEquipment
const equipmentHistoryAction = strict({ equipmentStates: Type.Array(Type.Array(equipmentEntryFormat), { maxItems: 30 }), available: Type.Boolean(), unavailableReason: Type.Union([Type.String(), Type.Null()]) });
const equipmentCommitCurrent = strict({
  mode: literals('FULL', 'SEMI', 'OFF'),
  equipment: equipmentEntryList,
  undoAvailable: Type.Boolean(),
  redoAvailable: Type.Boolean(),
});
// SpecRef: 9.1.3 | 2-4-1 searchItems | Return formats
// One result string: an inventory stack (`<Item Format>/<quantity>/<calculatedBasePower>`), a character-assigned item
// (`<Item Format>/<characterId>/<jewelType>:<jewelRank>/<calculatedBasePower>`), or an unassigned Jewel stack, optionally followed by the `ability=[..]`, `cBonus=[..]`, and `otherBonus=[..]` detail fields.
const itemStackFormat = Type.String({ pattern: '^(?:(?:0|[01]/[1-9][0-9]*/[0-6]/(?:0|[1-9][0-9]*))/[0-9]+/-?[0-9]+(?:\\.[0-9]+)?|(?:0|[01]/[1-9][0-9]*/[0-6]/(?:0|[1-9][0-9]*))/[0-9]+/(?:(?:might|arcana|fort|ward|shade|focus):[1-8]|0:0)/-?[0-9]+(?:\\.[0-9]+)?|(?:might|arcana|fort|ward|shade|focus):[1-8]/[0-9]+)(?:/(?:ability|cBonus|otherBonus)=\\[.*\\])*$' });
sampleOverrides.set(itemStackFormat, '0/1/12');
const equipmentSet = strict({
  equipmentSetId: integerId,
  name: Type.String({ minLength: 1 }),
  createdAt: isoTimestamp,
  equipment: optional(equipmentEntryList),
  availability: strict({
    allAvailable: Type.Boolean(),
    entries: Type.Array(strict({
      slotIndex: Type.Integer({ minimum: 0 }),
      item: equipmentEntryFormat,
      available: Type.Boolean(),
      unavailableReason: Type.Union([
        Type.Literal('slot_unavailable'),
        Type.Literal('not_equippable'),
        Type.Literal('unavailable'),
        Type.Null(),
      ]),
    })),
  }),
});
const diaryContent = Type.Union([
  strict({ format: Type.Literal('semantic'), title: semanticText, subtitle: semanticText, events: Type.Array(semanticText) }),
  strict({ format: Type.Literal('legacy'), title: Type.String(), subtitle: Type.String(), text: Type.String() }),
]);
const battleLogReference = Type.Union([Type.Null(), strict({ logId: stableKey, availability })]);
const diaryEntry = strict({ diaryEntryId: integerId, partyNumber, occurredAt: isoTimestamp, unread: Type.Boolean(), content: diaryContent, battleLog: battleLogReference });
// `metadata` mirrors renderDiaryMetadata()'s existing narration output; tracked for a concrete shape once Diary compaction (Milestone 5) is finished.
const diaryEntrySummary = strict({ diaryEntryId: integerId, partyNumber, occurredAt: isoTimestamp, unread: Type.Boolean(), metadata: Type.Unknown(), battleLog: battleLogReference });
const range = strict({ min: Type.Number(), max: Type.Number(), step: optional(Type.Number()) });
// Spec 9.1.4.3: paginated lists include `nextCursor`, or null when complete; optional here since readModels.ts does not yet paginate (Milestone 4).
const nextCursor = { nextCursor: optional(Type.Union([stableKey, Type.Null()])) };
const popupEvent = strict({ revision: Type.Integer({ minimum: 0 }), sequence: Type.Integer({ minimum: 1 }), eventId: stableKey, eventKey: stableKey, args: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean()])), partyNumber: Type.Union([partyNumber, Type.Null()]), diaryEntryId: Type.Union([stableKey, Type.Null()]), groupKey: Type.Union([stableKey, Type.Null()]), createdAt: isoTimestamp });
const deliveryStatus = literals('queued', 'sending', 'delivered', 'failed', 'unknown', 'cancelled');
// Spec 9.1.4.15: the public delivery projection; payload parameters/files are never returned.
const deliveryRecord = strict({ deliveryId: stableKey, status: deliveryStatus, createdAt: isoTimestamp, updatedAt: isoTimestamp, failureReason: Type.Union([Type.String(), Type.Null()]), rewardApplied: Type.Boolean() });

const compactObservationSchema = strict({
  globalInfo: strict({ gameMode: modeKey, inGameTime: isoTimestamp, gold: Type.Integer({ minimum: 0 }), prana: Type.Integer({ minimum: 0 }) }),
  partyInfo: Type.Array(strict({
    party: strict({ partyNumber, level: Type.Integer({ minimum: 1, maximum: 69 }), experiencePoint: Type.String(), deity: stableKey, deityRank: Type.Integer({ minimum: 0 }), condition: Type.Integer({ minimum: -400, maximum: 400 }) }),
    state: stableKey, lastDestination: Type.Union([integerId, Type.Null()]), lastOutcome: Type.Union([expeditionOutcome, Type.Null()]),
  })),
  attention: strict({ latestSimulationResult: Type.Array(Type.String()), emptyEquipmentSlot: Type.Array(Type.String()), notification: Type.Array(strict({ partyNumber, unreadDiary: Type.Integer({ minimum: 0 }), unreadDiaryTitle: Type.Array(Type.String()) })) }),
});
// Spec 8.3 / 9.1.4.7: the Expedition pane's facts. While a party explores, `exploration` carries only the rooms revealed as
// of the read, with `nextRevealAt` naming when the next one appears; HP, floor, and outcome never run ahead of the clock.
const stepProgress = strict({
  kind: literals('none', 'continuous', 'stepBased'),
  mainPercent: percentage,
  totalSteps: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  completedSteps: Type.Union([count, Type.Null()]),
  subProgress: Type.Union([strict({ startedAt: isoTimestamp, endsAt: isoTimestamp }), Type.Null()]),
  nextChangeAt: Type.Union([isoTimestamp, Type.Null()]),
});
const clearGateFact = strict({ kind: literals('eliteGate', 'bossGate', 'entryGate', 'godGate', 'godEntry'), dungeonId: integerId, floor: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]), current: count, required: Type.Integer({ minimum: 1 }) });
const sideQuestFact = strict({ id: Type.Integer({ minimum: 0 }), type: stableKey, target: Type.Number({ minimum: 1 }), progress: Type.Number({ minimum: 0 }), percent: percentage, hasDeadline: Type.Boolean(), remainingMs: Type.Number({ minimum: 0 }) });
const sortieControl = strict({ available: Type.Boolean(), unavailableReason: Type.Union([literals('gods_battle_unavailable', 'entry_gate_locked', 'party_exhausted', 'already_moving_to_gods_battle', 'charge_insufficient'), Type.Null()]) });
const expeditionProjectionSchema = strict({ parties: Type.Array(strict({
  partyNumber, name: Type.String({ minLength: 1 }), state: stableKey,
  stateStartedAt: Type.Union([isoTimestamp, Type.Null()]), stateDurationMs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]), stateExpectedEndAt: Type.Union([isoTimestamp, Type.Null()]),
  progress: Type.Union([stepProgress, Type.Null()]),
  exploration: Type.Union([strict({ dungeonId: integerId, difficultyOffset: Type.Integer({ minimum: 0 }), totalRooms: Type.Integer({ minimum: 0 }), revealedRoomCount: count, nextRevealAt: Type.Union([isoTimestamp, Type.Null()]), rooms: Type.Array(battleRoom, { maxItems: 24 }), resources: explorationResources }), Type.Null()]),
  currentHp: Type.Number({ minimum: 0 }), maximumHp: Type.Number({ minimum: 0 }),
  disclosedFloor: Type.Union([Type.Integer(), Type.Null()]), disclosedOutcome: Type.Union([expeditionOutcome, Type.Null()]),
  destination: Type.Union([integerId, Type.Null()]), destinationMode: literals('auto', 'fixed'), depthLimit: Type.String(), difficultyOffset: Type.Integer({ minimum: 0 }),
  chargeStock: Type.Integer({ minimum: 0, maximum: 6 }), chargeDuration: Type.Integer({ minimum: 0 }),
  clearGates: Type.Array(clearGateFact, { maxItems: 4 }),
  sideQuest: Type.Union([sideQuestFact, Type.Null()]),
  controls: strict({ sortie: sortieControl, godsBattle: sortieControl }),
})) });
const characterSummary = strict({ characterId: integerId, name: Type.String({ minLength: 1 }), raceId: stableKey, gender: literals('male', 'female'), mainClassId: stableKey, subClassId: stableKey, lineageId: Type.Union([stableKey, Type.Null()]), predispositionId: Type.Union([stableKey, Type.Null()]), isUnique: Type.Boolean(), mimorianEnemyId: Type.Union([integerId, Type.Null()]), calculatedStatus, equipment: equipmentEntryList, autoEquipmentMode: Type.Integer({ minimum: 0, maximum: 2 }) });
const partyProjectionSchema = strict({ effectiveSelection: strict({ partyNumber, characterId: Type.Union([integerId, Type.Null()]) }), party: strict({ partyNumber, name: Type.String({ minLength: 1 }), level: Type.Integer({ minimum: 1, maximum: 69 }), experience: Type.Integer({ minimum: 0 }), experienceToNext: Type.Integer({ minimum: 0 }), maxHp: Type.Integer({ minimum: 0 }), deityId: stableKey, deityRank: Type.Integer({ minimum: 0 }), condition: Type.Integer({ minimum: -400, maximum: 400 }), order: Type.Array(integerId), characters: Type.Array(characterSummary) }) });
// Spec 8.4.1: the shop at the request's clock. A slot's `shopItemId` is its 1-based lineup position.
// `<shopItemId>/<itemId>/<price>/<availability>` (Spec 9.1.3, 2-4-4).
const shopItemString = Type.String({ pattern: '^[1-5]/[1-9][0-9]*/[0-9]+/(true|false)$' });
sampleOverrides.set(shopItemString, '1/1104/60/true');
const shopRarity = literals('common', 'uncommon', 'eliteRare', 'bossRare');
const shopEntry = strict({ shopItemId: Type.Integer({ minimum: 1, maximum: 5 }), itemId: integerId, price: Type.Integer({ minimum: 0 }), rarity: shopRarity, soldOut: Type.Boolean(), available: Type.Boolean(), unavailableReason: Type.Union([literals('sold_out', 'insufficient_gold'), Type.Null()]) });
const shopInfoMembers = { intimacy: Type.Integer({ minimum: 0, maximum: 99 }), dialogue: semanticText, paidRefreshCountdown: Type.Integer({ minimum: 1 }), paidRefreshPrice: Type.Integer({ minimum: 0 }), paidRefresh: strict({ available: Type.Boolean(), unavailableReason: Type.Union([Type.Literal('insufficient_gold'), Type.Null()]) }) };
// Spec 8.4.5: an Alter level per enemy category, and one entry per enemy form.
const altarCategory = strict({ enemyType: stableKey, altarLevel: Type.Integer({ minimum: 0, maximum: 20 }), victories: count, nextLevelVictories: count, maximumLevel: Type.Boolean(), formCount: count, unlockedFormCount: count });
const altarOverview = strict({ prana: count, maximumAltarLevel: Type.Integer({ minimum: 1 }), categories: Type.Array(altarCategory), unlockedEnemyIds: Type.Array(Type.Integer({ minimum: 0 })) });
const formAbilityId = Type.String({ pattern: '^a\\.[a-z0-9-]+$' });
sampleOverrides.set(formAbilityId, 'a.howl');
const formUnavailableReason = literals('already_unlocked', 'altar_level_too_low', 'insufficient_prana');
const enemyForm = strict({
  enemyId: Type.Integer({ minimum: 0 }), enemyName: Type.String({ minLength: 1 }), nameKey: Type.Union([Type.String(), Type.Null()]), enemyType: stableKey, enemyTier: literals('normal', 'elite', 'boss', 'divine'),
  enemyAbility: Type.Array(strict({ abilityId: formAbilityId, level: Type.Integer({ minimum: 1 }) })), enemyBonus: Type.Array(Type.String()),
  unlockCost: count, unlockCondition: strict({ requiredAltarLevel: Type.Integer({ minimum: 0, maximum: 20 }), currentAltarLevel: Type.Integer({ minimum: 0, maximum: 20 }), met: Type.Boolean() }),
  unlocked: Type.Boolean(), unlockable: strict({ available: Type.Boolean(), unavailableReason: Type.Union([formUnavailableReason, Type.Null()]) }),
});
const baseProjectionSchema = strict({ currencies: strict({ gold: Type.Integer({ minimum: 0 }), prana: Type.Integer({ minimum: 0 }) }), inventory: Type.Array(strict({ variantKey: stableKey, item: itemFormat, quantity: Type.Integer({ minimum: 0 }), status: literals('owned', 'sold', 'notown'), isNew: Type.Boolean() })), jewelPriorityParty: Type.Union([partyNumber, Type.Literal('none')]), shop: strict({ lineupId: stableKey, ...shopInfoMembers, refreshesAt: isoTimestamp, entries: Type.Array(shopEntry, { maxItems: 5 }) }), altar: altarOverview });
const diaryProjectionSchema = strict({ unreadTotal: Type.Integer({ minimum: 0 }), parties: Type.Array(strict({ partyNumber, settings: strict(diarySetting), entries: Type.Array(diaryEntrySummary) })) });
const settingProjectionSchema = strict({ language, environment: Type.String(), gameMode: modeKey, enemyLevelOffset: Type.Integer({ minimum: 0, maximum: 20 }), modeSelect: optional(strict(modeSelect)), debug: optional(strict(debug)), enemyEditPane: optional(strict(enemyEdit)), uiPreferences: Type.Array(strict({ key: stableKey, value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]) })), uiPreferenceCatalog: Type.Array(strict({ family: stableKey, subject: Type.Literal('characterId'), type: Type.Union([Type.Literal('string'), Type.Literal('number'), Type.Literal('boolean')]), options: Type.Array(Type.String()), defaultValue: Type.Union([Type.String(), Type.Number(), Type.Boolean()]) })) });
const popupStreamSchema = strict({ events: Type.Array(popupEvent) });

const responseDataSchemas = {
  'fundamental/status': strict({ systemStatus: Type.String({ minLength: 1 }), versionBuild: Type.String({ minLength: 1 }), environment: Type.String({ minLength: 1 }) }),
  'fundamental/signUp': strict({ userId: identity.userId, environment, gameMode, levelOffsetForOrca: Type.Integer({ minimum: 0, maximum: 20 }), revision: optional(Type.Integer({ minimum: 0 })) }),
  // The account store normalizes levelOffsetForOrca to `null` (not omitted) for non-Orca accounts; logIn echoes that persisted identity verbatim.
  'fundamental/logIn': strict({ userId: identity.userId, environment, gameMode, levelOffsetForOrca: Type.Union([Type.Integer({ minimum: 0, maximum: 20 }), Type.Null()]), sessionToken: Type.String({ minLength: 1 }), controlLeaseToken: Type.String({ minLength: 1 }), leaseExpiresAt: isoTimestamp }),
  'fundamental/logOut': strict({ finalPersistedRevision: Type.Integer({ minimum: 0 }) }),
  'read/observation': compactObservationSchema,
  'read/observation/compact': compactObservationSchema,
  // Spec 8.1.2 / 9.1.4.7: the header's facts. `speedOfTime`, `autoRepeat` are runtime-owned and `null` for an API account.
  'read/observation/overview': strict({ headerInfo: strict({
    gameMode: modeKey, inGameTime: isoTimestamp, gold: Type.Integer({ minimum: 0 }), prana: Type.Integer({ minimum: 0 }), environment: Type.String({ minLength: 1 }), unreadDiary: Type.Integer({ minimum: 0 }),
    speedOfTime: Type.Union([strict({ base: literals('real', 'x1.2', 'x5', 'x20', 'x100', 'unlimited'), scale: Type.Number({ minimum: 0 }), bonusActive: Type.Boolean(), bonusUntil: Type.Union([isoTimestamp, Type.Null()]) }), Type.Null()]),
    autoRepeat: Type.Union([Type.Boolean(), Type.Null()]),
    progressReportInfo: strict({ available: Type.Boolean(), bonusActive: Type.Boolean() }),
  }) }),
  'read/observation/expedition': strict({ expeditionInfo: expeditionProjectionSchema }),
  'read/observation/party': strict({ partyInfo: strict({ ...partyProjectionSchema.properties, unlockedMimorianEnemyIds: Type.Array(integerId), parties: Type.Array(strict({ partyNumber, deityId: stableKey, characters: Type.Array(strict({ characterId: integerId, name: Type.String({ minLength: 1 }), raceId: stableKey, mimorianEnemyId: Type.Union([integerId, Type.Null()]) })) })) }) }),
  'read/observation/base': strict({ baseInfo: baseProjectionSchema }),
  'read/observation/diary': strict({ diaryInfo: diaryProjectionSchema }),
  'read/observation/setting': strict({ settingInfo: settingProjectionSchema }),
  'read/observation/popupEventStream': popupStreamSchema,
  'read/expedition/{p}/setting': strict({ current: strict({ destination: integerId, destinationMode: literals('auto', 'fixed'), depthLimit: Type.String(), difficultyOffset: Type.Integer({ minimum: 0, maximum: 68, multipleOf: 2 }) }), validOptions: strict({ destination: Type.Array(integerId), depthLimit: Type.Array(Type.String()), difficultyOffset: range }) }),
  'read/expedition/{p}/latestBattleLog': strict({ battleLog: Type.Union([battleLogSchema, Type.Null()]), resources: Type.Union([battleLogResources, Type.Null()]), bottleneckEnemies: Type.Array(bottleneckEnemy) }),
  'read/expedition/{p}/simulationRun': strict({
    simulatedRevision: Type.Integer({ minimum: 0 }), seedDomain: stableKey, runs: Type.Integer({ minimum: 1 }),
    overview: Type.String(), counts: strict({ clear: count, return: count, draw: count, retreat: count, defeat: count }), overviewPercent: strict({ success: percentage, clear: percentage, return: percentage, draw: percentage, retreat: percentage, defeat: percentage }),
    detail: Type.Array(Type.String()),
    rooms: Type.Array(strict({
      room: Type.Integer({ minimum: 1, maximum: 24 }), floorRoom: floorRoomKey,
      reached: count, notReached: count, victory: count, clear: count, return: count, draw: count, retreat: count, defeat: count,
      successfulHp: strict({ full: count, from90: count, from80: count, from70: count, from60: count, from50: count, from40: count, below40: count }),
      retreatHp: strict({ from30: count, from20: count, from10: count, below10: count }),
    })),
  }),
  'read/expedition/{p}/chargeStock': strict({ chargeStock: Type.Integer({ minimum: 0, maximum: 6 }), chargeDuration: Type.Integer({ minimum: 0 }) }),
  'read/build/party/{p}': strict({ current: strict({ deityId: stableKey, order: Type.Array(integerId) }), validOptions: strict({ deityId: Type.Array(stableKey), order: Type.Array(integerId) }) }),
  'read/build/character/{characterId}/status': strict({ calculatedStatus, current: strict({ unique: Type.Boolean(), name: Type.String({ minLength: 1 }), racesAndGender: stableKey, mainClassId: stableKey, subClassId: stableKey, lineage: Type.Union([stableKey, Type.Null()]), predisposition: Type.Union([stableKey, Type.Null()]) }), editableFields: strict({ name: Type.Boolean(), unique: Type.Boolean() }), validOptions: strict({ racesAndGender: Type.Array(stableKey), mainClassId: Type.Array(stableKey), subClassId: Type.Array(stableKey), lineage: Type.Array(stableKey), predisposition: Type.Array(stableKey) }) }),
  'read/build/character/{characterId}/equipment': strict({ current: strict({ mode: literals('FULL', 'SEMI', 'OFF'), equipment: equipmentEntryList }), validOptions: strict({ mode: Type.Array(literals('FULL', 'SEMI', 'OFF')), numberOfEmptyEquipmentSlots: Type.Integer({ minimum: 0 }), undoEquipment: equipmentHistoryAction, redoEquipment: equipmentHistoryAction }) }),
  'read/build/character/{characterId}/equipmentSet': strict({ equipmentSets: Type.Array(strict({ equipmentSetId: integerId, equipmentSet })) }),
  'read/build/character/{characterId}/equipmentEvaluation': strict({
    calculatedItemStatus: Type.Array(strict({
      item: evaluatedItemFormat,
      equippable: Type.Boolean(),
      stats: Type.Array(strict({ key: stableKey, value: Type.Number(), unit: literals('number', 'ratio') })),
      abilities: Type.Array(stableKey),
    })),
    calculatedEquipmentChange: Type.Array(strict({
      change: equipmentChangeFormat,
      equippable: Type.Boolean(),
      physicalDefenseDelta: Type.Integer(),
      magicalDefenseDelta: Type.Integer(),
    })),
  }),
  'read/base/searchItems': strict({ items: Type.Array(itemStackFormat) }),
  'read/base/jewelPriorityParty': strict({ current: strict({ partyNumber: Type.Union([partyNumber, Type.Literal('none')]) }), validOptions: strict({ partyNumber: Type.Array(Type.Union([partyNumber, Type.Literal('none')])) }) }),
  'read/base/shopInfo': strict(shopInfoMembers),
  'read/base/shopItemsList': strict({ current: strict({ lineupId: stableKey, refreshesAt: isoTimestamp, items: Type.Array(shopItemString, { maxItems: 5 }), entries: Type.Array(shopEntry, { maxItems: 5 }) }), validOptions: strict({ items: Type.Array(Type.Integer({ minimum: 1, maximum: 5 })) }) }),
  'read/base/altarInfo': strict({ altarOverview }),
  'read/base/enemyFormList': strict({ current: strict({ enemyFormList: Type.Array(enemyForm) }), validOptions: strict({ enemyId: Type.Array(Type.Integer({ minimum: 0 })) }) }),
  'read/diary/{p}/diarySetting': strict({ current: strict(diarySetting), validOptions: strict({ superRareThreshold: Type.Array(Type.Union([Type.String(), Type.Integer()])), defeatNotificationMode: Type.Array(Type.String()) }) }),
  'read/diary/diaryEntry/{diaryEntryId}': strict({ entry: diaryEntry }),
  'read/setting/enemyEditPane': strict({ current: strict(enemyEdit), validOptions: strict({ enemyLevel: range, terrainEffect: Type.Array(Type.String()), enemyType: Type.Array(Type.String()), mainClass: Type.Array(stableKey), subClass: Type.Array(Type.String()), addedAbilities: strict({ maximumEntries: Type.Integer({ minimum: 0 }), level: strict({ min: Type.Integer(), max: Type.Integer() }) }) }) }),
  'read/setting/modeSelect': strict({ current: strict(modeSelect), validOptions: strict({ mode: Type.Array(modeKey), enemyLevelOffset: range, language: Type.Array(language), darkMode: Type.Array(Type.String()), theme: Type.Array(Type.String()) }) }),
  'read/setting/debug': strict({ current: strict(debug), validOptions: strict({ speedOfTime: Type.Array(Type.String()), godsBattleCondition: Type.Array(Type.String()), godsStrength: Type.Array(Type.String()) }) }),
  'commit/progress/elapsed': strict({ requestedElapsedSeconds: Type.Integer({ minimum: 0 }), acceptedElapsedSeconds: Type.Integer({ minimum: 0 }), cappedElapsedSeconds: Type.Integer({ minimum: 0 }), elapsedSeconds: Type.Integer({ minimum: 0 }), inGameTime: isoTimestamp }),
  'commit/progress/progressReport': strict({ deliveryId: stableKey, status: Type.Literal('queued') }),
  'commit/expedition/{p}/changeExpedition': strict({ current: strict({ destination: integerId, destinationMode: literals('auto', 'fixed'), depthLimit: Type.String(), difficultyOffset: Type.Integer({ minimum: 0, maximum: 68, multipleOf: 2 }) }) }),
  'commit/expedition/{p}/sortie': strict({ outcome: Type.Union([expeditionOutcome, Type.Null()]), rewards: Type.Array(Type.String()), diaryEntryId: Type.Union([stableKey, Type.Null()]), logId: Type.Union([stableKey, Type.Null()]) }),
  'commit/expedition/{p}/godsBattle': strict({ outcome: Type.Union([expeditionOutcome, Type.Null()]), rewards: Type.Array(Type.String()), diaryEntryId: Type.Union([stableKey, Type.Null()]), logId: Type.Union([stableKey, Type.Null()]) }),
  'commit/expedition/{p}/resetStatistics': empty,
  'commit/build/party/{p}': strict({ current: strict({ deityId: stableKey, order: Type.Array(integerId) }) }),
  'commit/build/character/{characterId}/changeBuild': strict({ current: equipmentCommitCurrent, confirmationRequired: Type.Boolean(), warnings: Type.Array(semanticText), applied: Type.Boolean() }),
  'commit/build/character/{characterId}/removeAllEquipment': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/removeEquipment': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/equip': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/lockEquipment': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/unlockEquipment': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/autoEquipment': strict({
    current: equipmentCommitCurrent,
    autoEquipmentReport: strict({
      ran: Type.Boolean(),
      changes: Type.Array(strict({
        slotIndex: Type.Integer({ minimum: 0 }),
        before: Type.Union([Type.String(), Type.Null()]),
        after: Type.Union([Type.String(), Type.Null()]),
      })),
    }),
  }),
  'commit/build/character/{characterId}/jewelAttach': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/jewelRemove': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/saveEquipmentSet': strict({ equipmentSetId: integerId }),
  'commit/build/character/{characterId}/loadEquipmentSet': strict({
    current: equipmentCommitCurrent,
    loadReport: strict({
      loadMode: literals('equipSet', 'equipSimilar', 'equipExactMatchesOnly'),
      entries: Type.Array(strict({
        slotIndex: Type.Integer({ minimum: 0 }),
        saved: Type.String(),
        result: literals('equipped', 'substituted', 'skipped'),
        reason: Type.Union([literals('slot_unavailable', 'not_equippable', 'unavailable'), Type.Null()]),
      })),
    }),
  }),
  'commit/build/character/{characterId}/deleteEquipmentSet': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/renameEquipmentSet': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/undoEquipment': strict({ current: equipmentCommitCurrent }),
  'commit/build/character/{characterId}/redoEquipment': strict({ current: equipmentCommitCurrent }),
  'commit/base/changeJewelPriorityParty': strict({ current: strict({ partyNumber: Type.Union([partyNumber, Type.Literal('none')]) }) }),
  'commit/base/sellInventoryItems': tradeResult,
  'commit/base/purchaseShopItems': tradeResult,
  'commit/base/paidShopRefresh': strict({ lineupId: stableKey, goldDelta: Type.Integer(), paidRefreshPrice: Type.Integer({ minimum: 0 }) }),
  'commit/base/unlockSoldItems': strict({ items: Type.Array(itemFormat) }),
  'commit/base/unlockForm': strict({ enemyId: Type.Integer({ minimum: 0 }), pranaDelta: Type.Integer() }),
  'commit/diary/{p}/diarySetting': strict({ current: strict(diarySetting) }),
  'commit/diary/diaryEntry/markAsRead': strict({ diaryEntryId: Type.Array(stableKey), unreadTotal: Type.Integer({ minimum: 0 }) }),
  'commit/setting/clairvoyanceReset': strict({ partyNumber, resetCommonRewards: Type.Boolean(), resetRewards: Type.Boolean(), resetSideQuest: Type.Boolean() }),
  'commit/setting/modeSelect': strict({ current: strict(modeSelect) }),
  'commit/setting/enemyEditPane': strict({ current: strict(enemyEdit) }),
  'commit/setting/feedback': strict({ deliveryId: stableKey, status: Type.Literal('queued') }),
  'commit/setting/backup/export': strict({ savePayload: Type.String({ minLength: 1 }) }),
  'commit/setting/backup/import': strict({ imported: Type.Boolean() }),
  'commit/setting/backup/reset': empty,
  'commit/setting/debug': strict({ current: strict(debug) }),
  'commit/setting/markNewsAsRead': strict({ versions: Type.Array(stableKey), unreadCount: Type.Integer({ minimum: 0 }) }),
  'commit/setting/uiPreferences': strict({ uiPreferences: Type.Array(strict({ key: stableKey, value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]) })) }),
  'commit/base/markItemsAsSeen': strict({ items: Type.Array(stableKey) }),
  'read/setting/delivery/{deliveryId}': deliveryRecord,
  'help/overview': strict({ endpoints: Type.Array(strict({ method: literals('GET', 'POST'), path: Type.String(), access: Type.String(), purpose: Type.String() })) }),
  'help/endpoints': strict({ requirements: Type.String(), detail: Type.String(), schemaVersion: Type.Integer() }),
  'resources/developerNewsNotification': strict({ entries: Type.Array(strict({ version: stableKey, date: Type.String(), content: Type.String() })) }),
  'resources/donationBox': strict({ gods: Type.Array(Type.String()) }),
  'resources/clairvoyance/{p}': strict({ reward: Type.Unknown(), enhancement: Type.Unknown(), superRare: Type.Unknown(), sideQuest: Type.Unknown(), sleepiness: Type.Unknown() }),
  'resources/glossary': strict({ entries: Type.Array(Type.Unknown()), validOptions: strict({ category: Type.Array(Type.String()) }), ...nextCursor }),
  'resources/itemCompendium': strict({ items: Type.Array(strict({ itemId: integerId, name: Type.String(), category: stableKey, ability: Type.Array(Type.Unknown()), cBonus: Type.Array(Type.Unknown()), otherBonus: Type.Array(Type.Unknown()) })), ...nextCursor }),
  'resources/characterRoster': strict({ races: Type.Array(strict({ raceId: stableKey, status: Type.Unknown(), bonus: Type.Unknown(), defaultAbility: Type.Unknown(), unlockAbility: Type.Unknown() })), ...nextCursor }),
  'resources/bestiary': strict({ enemies: Type.Array(Type.Unknown()), ...nextCursor }),
  'resources/superRareList': strict({ superRare: Type.Array(Type.String()), ...nextCursor }),
};

// SpecRef: 9.1.4.2 | Response envelopes | Concrete envelope schemas
// Mirrors createReadEnvelopeSchema/createCommitEnvelopeSchema in src/api/v1/contracts.ts; kept in sync by hand
// for the same reason as the response-data schemas above (that module cannot be imported by this plain-JS script).
const readResponseEnvelopeFor = (data) => strict({ apiVersion: Type.Literal('v1'), schemaVersion: Type.Literal(1), requestId: stableKey, revision: optional(Type.Integer({ minimum: 0 })), observedAt: isoTimestamp, data });
const commitResponseEnvelopeFor = (data) => strict({ apiVersion: Type.Literal('v1'), schemaVersion: Type.Literal(1), requestId: stableKey, previousRevision: Type.Integer({ minimum: 0 }), revision: Type.Integer({ minimum: 0 }), committedAt: isoTimestamp, data, effects: Type.Array(semanticText), changedResources: Type.Array(Type.String({ minLength: 1 })) });
// SSE streams and the raw-binary backup export never go through the JSON read/commit envelope construction in api-v1.cjs.
function envelopeSchemaFor(operation, data) {
  if (operation.transport === 'sse' || operation.operationId === 'commit/setting/backup/export') return null;
  return operation.operationId.startsWith('commit/') ? commitResponseEnvelopeFor(data) : readResponseEnvelopeFor(data);
}

// SpecRef: 9.1.4.11 | Errors | Stable error catalog
const ERROR_CATALOG = [
  { status: 400, code: 'invalid_request', meaning: 'Invalid syntax, unknown field, type, range, enum, combination, cursor shape, or file.' },
  { status: 400, code: 'invalid_cursor', meaning: 'Cursor does not match the route, filters, ordering, or retained revision.' },
  { status: 401, code: 'authentication_required', meaning: 'Bootstrap bearer token is absent.' },
  { status: 401, code: 'authentication_failed', meaning: 'Bootstrap bearer token is invalid.' },
  { status: 401, code: 'login_required', meaning: 'No valid API control session is supplied.' },
  { status: 401, code: 'control_lease_invalid', meaning: 'Control lease token does not belong to this session/save.' },
  { status: 401, code: 'control_lease_expired', meaning: 'Control lease expired; log in again.' },
  { status: 404, code: 'not_found', meaning: 'Requested visible resource does not exist.' },
  { status: 409, code: 'already_exists', meaning: 'Sign-up identity already exists.' },
  { status: 409, code: 'control_unavailable', meaning: 'Another client holds exclusive API control.' },
  { status: 409, code: 'stale_revision', meaning: 'expectedRevision is not current; details include currentRevision.' },
  { status: 409, code: 'idempotency_conflict', meaning: 'Idempotency key was used with a different route or body.' },
  { status: 409, code: 'idempotency_expired', meaning: 'Successful key is known, but its full receipt was evicted; no re-execution.' },
  { status: 409, code: 'operation_in_progress', meaning: 'The same operation is already admitted; retry the same request later.' },
  { status: 409, code: 'illegal_action', meaning: 'Valid request is unavailable under current game rules.' },
  { status: 409, code: 'confirmation_required', meaning: 'Action requires the confirmation flow.' },
  { status: 409, code: 'confirmation_invalid', meaning: 'Confirmation is expired, used, changed, or mismatched.' },
  { status: 413, code: 'payload_too_large', meaning: 'Body, file, or attachments exceed the operation limit.' },
  { status: 415, code: 'unsupported_media_type', meaning: 'Request media type is unsupported.' },
  { status: 422, code: 'incompatible_backup', meaning: 'Backup is valid data but cannot be migrated by this version.' },
  { status: 429, code: 'busy', meaning: 'Bounded work queue is full; Retry-After is supplied.' },
  { status: 500, code: 'save_failed', meaning: 'Atomic persistence failed; previous state remains authoritative.' },
  { status: 500, code: 'internal_error', meaning: 'Unexpected failure with no committed mutation.' },
  { status: 503, code: 'runtime_unavailable', meaning: 'Game authority is starting, stopping, or unavailable.' },
  { status: 503, code: 'operation_cancelled', meaning: 'Admitted work was cancelled before commit; no mutation was published.' },
];
const KNOWN_ERROR_CODES = new Set(ERROR_CATALOG.map((entry) => entry.code));

// SpecRef: 9.1.4.9 | Operation-specific completion rules | Applicable errors and restrictions metadata
// `commit/setting/enemyEditPane` and `commit/setting/debug` are the only handlers that check `isDebugModeEnabled()`
// (HomeScreen.tsx `processApiV1Request`), and that helper is true only in the `dev`/`beta` environments (environment.ts).
const DEBUG_GATED_OPERATIONS = new Set(['commit/setting/enemyEditPane', 'commit/setting/debug']);
// Confirmation-gated per 9.1.4.5: destructive/partial-load operations that may return `confirmation_required`.
const CONFIRMATION_GATED_OPERATIONS = new Set(['commit/setting/backup/import', 'commit/setting/backup/reset', 'commit/build/character/{characterId}/loadEquipmentSet']);
// Handlers observed to throw `not_found` for an unresolved item/variant lookup that isn't already covered by a `{...}` path template.
const ADDITIONAL_NOT_FOUND_OPERATIONS = new Set(['commit/base/sellInventoryItems', 'commit/base/purchaseShopItems', 'commit/base/unlockSoldItems', 'commit/base/unlockForm']);

function errorsFor(operation, query) {
  const codes = new Set(['invalid_request', 'runtime_unavailable', 'internal_error']);
  if (operation.access !== 'public') { codes.add('authentication_required'); codes.add('authentication_failed'); }
  if (operation.access === 'session') { codes.add('login_required'); codes.add('control_lease_invalid'); codes.add('control_lease_expired'); }
  if (operation.operationId.includes('{') || ADDITIONAL_NOT_FOUND_OPERATIONS.has(operation.operationId)) codes.add('not_found');
  if (operation.transport === 'multipart' || operation.transport === 'binary') { codes.add('payload_too_large'); codes.add('unsupported_media_type'); }
  if (operation.operationId.startsWith('commit/')) { codes.add('stale_revision'); codes.add('idempotency_conflict'); codes.add('idempotency_expired'); codes.add('operation_in_progress'); codes.add('illegal_action'); codes.add('save_failed'); codes.add('busy'); }
  if (CONFIRMATION_GATED_OPERATIONS.has(operation.operationId)) { codes.add('confirmation_required'); codes.add('confirmation_invalid'); }
  if (operation.operationId === 'commit/setting/backup/import') codes.add('incompatible_backup');
  if (query.properties?.cursor) codes.add('invalid_cursor');
  if (operation.operationId === 'fundamental/signUp') codes.add('already_exists');
  if (operation.operationId === 'fundamental/logIn') { codes.add('control_unavailable'); codes.add('not_found'); }
  if (operation.operationId === 'fundamental/logOut') codes.add('save_failed');
  if (operation.operationId.endsWith('/simulationRun')) codes.add('stale_revision');
  const list = [...codes].sort();
  for (const code of list) if (!KNOWN_ERROR_CODES.has(code)) throw new Error(`Unknown error code referenced by ${operation.operationId}: ${code}`);
  return list;
}

function restrictionsFor(operation) {
  const debugGated = DEBUG_GATED_OPERATIONS.has(operation.operationId);
  return { environments: debugGated ? ['dev', 'beta'] : 'all', requiresDebugMode: debugGated, requiresLogin: operation.access === 'session' };
}

const commitEnvelope = (parameters) => strict({ expectedRevision: Type.Integer({ minimum: 0 }), idempotencyKey: Type.String({ minLength: 16, maxLength: 128, pattern: '^[\\x20-\\x7e]+$' }), parameters, confirmationToken: optional(Type.String({ minLength: 1, maxLength: 512 })) });
function pathSchemaFor(operation) { const name = operation.path.match(/\{([^}]+)\}/)?.[1]; return name ? pathSchemas[name] : empty; }
function bodySchemaFor(operation) {
  if (directBodySchemas[operation.operationId]) return directBodySchemas[operation.operationId];
  if (operation.operationId.endsWith('/simulationRun')) return strict({ expectedRevision: optional(Type.Integer({ minimum: 0 })) });
  if (operation.operationId.startsWith('commit/')) return commitEnvelope(commitParameters[operation.operationId]);
  return empty;
}
function transportFor(operation) {
  if (operation.operationId === 'read/observation/popupEventStream') return 'sse';
  if (operation.operationId === 'commit/setting/backup/export') return 'binary';
  if (['commit/setting/backup/import', 'commit/setting/feedback'].includes(operation.operationId)) return 'multipart';
  return operation.method === 'GET' ? 'query' : 'json';
}
function sample(schema, invalid = false) {
  if (invalid) return { unexpectedMember: true };
  if (sampleOverrides.has(schema)) return sampleOverrides.get(schema);
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.anyOf) return sample(schema.anyOf[0]);
  if (schema.type === 'object') return Object.fromEntries(Object.entries(schema.properties ?? {}).filter(([key]) => (schema.required ?? []).includes(key)).map(([key, value]) => [key, sample(value)]));
  if (schema.type === 'array') return [sample(schema.items)];
  if (schema.type === 'integer' || schema.type === 'number') return schema.minimum ?? 1;
  if (schema.type === 'boolean') return true;
  if (schema.type === 'string') {
    if (schema.pattern?.includes('A-Za-z0-9')) return 'ApiUser';
    if (schema.pattern?.includes('x20')) return '550e8400-e29b-41d4-a716-446655440000';
    if (schema.pattern?.includes('might')) return 'might:1';
    if (schema.pattern?.includes('attachment')) return 'attachment0';
    if (schema.pattern?.includes('beforeBoss')) return 'all';
    if (schema.pattern?.includes('[01]/')) return '0';
    if (schema.pattern?.includes('\\d{4}-\\d{2}')) return new Date(0).toISOString();
    return 'x'.repeat(Math.max(7, schema.minLength ?? 0));
  }
  return null;
}

const operationContracts = operations.map((operation) => {
  const pathParameters = pathSchemaFor(operation); const query = querySchemas[operation.operationId] ?? empty; const body = bodySchemaFor(operation);
  if (operation.operationId.startsWith('commit/') && !commitParameters[operation.operationId]) throw new Error(`Missing Commit parameter schema: ${operation.operationId}`);
  const responseData = responseDataSchemas[operation.operationId];
  if (!responseData) throw new Error(`Missing response schema: ${operation.operationId}`);
  const transport = transportFor(operation);
  const withTransport = { ...operation, transport };
  const envelope = envelopeSchemaFor(withTransport, responseData);
  return { ...withTransport, pathParameters, query, body, response: { data: responseData, envelope }, errors: errorsFor(withTransport, query), restrictions: restrictionsFor(withTransport), examples: { request: { pathParameters: sample(pathParameters), query: sample(query), ...(operation.method === 'POST' ? { body: sample(body) } : {}) }, invalidRequest: operation.method === 'GET' ? { query: sample(query, true) } : { body: sample(body, true) }, response: { data: sample(responseData) } } };
});
const desktopOutput = `${JSON.stringify({ apiVersion: 'v1', schemaVersion: 1, limits: { jsonBodyBytes: 1_048_576, backupImportBytes: 33_554_432, feedbackAttachmentCount: 4, feedbackAttachmentBytes: 8_388_608, feedbackTotalBytes: 20_971_520, pageLimitDefault: 100, pageLimitMaximum: 200 }, errors: ERROR_CATALOG, operations: operationContracts }, null, 2)}\n`;
const typeRows = operations.map((operation) => `  ${JSON.stringify(operation)},`).join('\n');
const typescriptOutput = `/* Generated by scripts/generate-api-v1-contract.mjs. Do not edit. */\nexport const API_V1_OPERATIONS = [\n${typeRows}\n] as const;\n\nexport type ApiV1Operation = typeof API_V1_OPERATIONS[number];\nexport type ApiV1OperationId = ApiV1Operation['operationId'];\n`;
function verify(path, expected) { let actual = ''; try { actual = readFileSync(path, 'utf8'); } catch { /* reported below */ } if (actual !== expected) throw new Error(`${path} is stale. Run npm run api:v1:generate.`); }
if (check) { verify(desktopOutputPath, desktopOutput); verify(typescriptOutputPath, typescriptOutput); }
else { writeFileSync(desktopOutputPath, desktopOutput); writeFileSync(typescriptOutputPath, typescriptOutput); }
console.log(JSON.stringify({ operations: operationContracts.length, check }));
