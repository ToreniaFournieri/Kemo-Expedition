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
if (operations.length !== 83) throw new Error(`Expected 83 /api/v1 operations, found ${operations.length}.`);
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
const itemFormat = Type.String({ pattern: '^(?:0|[01]/[1-9][0-9]*/[0-6]/(?:[0-9]|[1-7][0-9]|80))$' });
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
  'read/base/searchItems': strict({ state: optional(literals('owned', 'equipped', 'sold', 'all'), 'owned'), category: itemCategory, rarity: optional(rarity, 'all'), superRare: optional(Type.Boolean()), superRareId: optional(Type.Integer({ minimum: 0, maximum: 80 })), itemId: optional(integerId), searchAbility: optional(stableKey), searchBonus: optional(stableKey), details: optional(detail, 'abilityAndCBonus'), ...page }),
  'read/base/enemyFormList': strict({ enemyType: optional(stableKey), enemyId: optional(integerId) }),
  'resources/glossary': strict({ category: literals('Ab.', 'Base.', 'Fixed.', 'Inc.', 'Mech.', 'Faith.', 'Magic.', 'Quest.', 'Terrain.'), glossaryId: optional(stableKey), ...page }),
  'resources/itemCompendium': strict({ category: itemCategory, rarity: optional(rarity, 'all'), tier: optional(Type.Integer({ minimum: 1, maximum: 8 })), itemId: optional(integerId), searchAbility: optional(stableKey), searchBonus: optional(stableKey), details: optional(detail, 'abilityAndCBonus'), ...page }),
  'resources/characterRoster': strict({ race: literals('lupinian', 'vulpinian', 'felidian', 'caninian', 'ursan', 'procyonian', 'leporian', 'cervin', 'murid', 'kemoria', 'orcinian', 'avian', 'mimorian'), ...page }),
  'resources/bestiary': strict({ enemyId: optional(integerId), enemyType: optional(stableKey), expedition: optional(integerId), ...page }),
  'resources/superRareList': strict({ superRareId: optional(Type.Integer({ minimum: 1, maximum: 80 })), ...page }),
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
const addedAbility = strict({ abilityId: stableKey, level: Type.Integer({ minimum: 1, maximum: 5 }) });
const enemyEdit = { enemyLevel: optional(Type.Integer({ minimum: 1, maximum: 99 })), enemyName: optional(Type.String({ minLength: 1, maxLength: 100 })), terrainEffect: optional(stableKey), enemyType: optional(stableKey), mainClass: optional(stableKey), subClass: optional(stableKey), addedAbilities: optional(Type.Array(addedAbility, { maxItems: 5 })) };

const commitParameters = {
  'commit/progress/elapsed': strict({ calculateToRealTime: optional(Type.Boolean()), elapsedSeconds: optional(Type.Integer({ minimum: 60, maximum: 43200 })) }),
  'commit/progress/progressReport': empty,
  'commit/expedition/{p}/changeExpedition': strict({ destination: optional(integerId), destinationMode: optional(literals('auto', 'fixed')), depthLimit: optional(Type.String({ pattern: '^(?:[1-9][0-9]*f-[1-9][0-9]*|beforeBoss|all)$' })), difficultyOffset: optional(Type.Integer({ minimum: 0, maximum: 68, multipleOf: 2 })) }),
  'commit/expedition/{p}/sortie': empty, 'commit/expedition/{p}/godsBattle': empty,
  'commit/build/party/{p}': strict({ deityId: optional(stableKey), order: optional(nonEmptyArray(integerId, { uniqueItems: true, maxItems: 6 })) }),
  'commit/build/character/{characterId}/changeBuild': strict({ name: optional(Type.String({ minLength: 1, maxLength: 100 })), racesAndGender: optional(stableKey), mainClassId: optional(stableKey), subClassId: optional(stableKey), lineage: optional(stableKey), predisposition: optional(stableKey) }),
  'commit/build/character/{characterId}/removeAllEquipment': empty,
  'commit/build/character/{characterId}/removeEquipment': strict({ targetEquipment: equipmentTarget }),
  'commit/build/character/{characterId}/equip': strict({ targetEquipment: Type.Union([itemFormat, nonEmptyArray(itemFormat)]) }),
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
    return 'x'.repeat(Math.max(7, schema.minLength ?? 0));
  }
  return null;
}

const operationContracts = operations.map((operation) => {
  const pathParameters = pathSchemaFor(operation); const query = querySchemas[operation.operationId] ?? empty; const body = bodySchemaFor(operation);
  if (operation.operationId.startsWith('commit/') && !commitParameters[operation.operationId]) throw new Error(`Missing Commit parameter schema: ${operation.operationId}`);
  return { ...operation, transport: transportFor(operation), pathParameters, query, body, examples: { request: { pathParameters: sample(pathParameters), query: sample(query), ...(operation.method === 'POST' ? { body: sample(body) } : {}) }, invalidRequest: operation.method === 'GET' ? { query: sample(query, true) } : { body: sample(body, true) } } };
});
const desktopOutput = `${JSON.stringify({ apiVersion: 'v1', schemaVersion: 1, limits: { jsonBodyBytes: 1_048_576, backupImportBytes: 33_554_432, feedbackAttachmentCount: 4, feedbackAttachmentBytes: 8_388_608, feedbackTotalBytes: 20_971_520, pageLimitDefault: 100, pageLimitMaximum: 200 }, operations: operationContracts }, null, 2)}\n`;
const typeRows = operations.map((operation) => `  ${JSON.stringify(operation)},`).join('\n');
const typescriptOutput = `/* Generated by scripts/generate-api-v1-contract.mjs. Do not edit. */\nexport const API_V1_OPERATIONS = [\n${typeRows}\n] as const;\n\nexport type ApiV1Operation = typeof API_V1_OPERATIONS[number];\nexport type ApiV1OperationId = ApiV1Operation['operationId'];\n`;
function verify(path, expected) { let actual = ''; try { actual = readFileSync(path, 'utf8'); } catch { /* reported below */ } if (actual !== expected) throw new Error(`${path} is stale. Run npm run api:v1:generate.`); }
if (check) { verify(desktopOutputPath, desktopOutput); verify(typescriptOutputPath, typescriptOutput); }
else { writeFileSync(desktopOutputPath, desktopOutput); writeFileSync(typescriptOutputPath, typescriptOutput); }
console.log(JSON.stringify({ operations: operationContracts.length, check }));
