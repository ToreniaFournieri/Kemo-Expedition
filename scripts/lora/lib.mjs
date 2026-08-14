import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const LOCALES = ['ja', 'en', 'zh-CN', 'zh-TW'];
export const FAMILY_COUNTS = {
  authoritative: 360,
  calculation: 160,
  strategy: 280,
  api_action: 160,
  safety: 64,
};
export const SPLIT_FAMILY_COUNTS = { train: 820, valid: 102, test: 102 };
export const GENERATION_SEED = 903007;
export const MODEL_ID = 'mlx-community/Qwen3-4B-Instruct-2507-4bit';
export const MODEL_REVISION = '7494131';

const SOURCE_FILES = [
  'Specification.md',
  'Specification_2.1_CHARACTER_&_PARTY.md',
  'Specification_3.1_ITEM.md',
  'Specification_4.1_EXPEDITION_&_ENEMY.md',
  'Specification_5.1_PROGRESS.md',
  'Specification_6.1_BATTLE.md',
  'Specification_7.1_AUTOMATION.md',
  'Specification_9.1.3_API_ENDPOINTS.md',
  'src/data/classes.ts',
  'src/data/dungeons.ts',
  'src/data/lineages.ts',
  'src/data/predispositions.ts',
  'src/data/races.ts',
  'src/game/experimentalApi.ts',
  'src/game/experimentalApiContracts.ts',
  'src/game/partyComputation.ts',
  'sample_savedata/Kemo-Expedition_Backup_v0.9.2_dev_20260812.kemoz',
  'data/lora/fixtures/sample_observation.json',
  'data/lora/seed_v1.jsonl',
  'scripts/lora/extract-safe-fixture.mjs',
  'scripts/lora/generate.mjs',
  'scripts/lora/lib.mjs',
  'scripts/lora/validate.mjs',
  'training/lora/model.lock.json',
  'training/lora/qwen3_4b_qlora.yaml',
  'build_number.txt',
  ...LOCALES.map((locale) => `src/i18n/${locale}.ts`),
];

const TEXT = {
  ja: {
    system: 'あなたは冒ケモのゲームプレイ支援AIです。安定IDと数値を優先し、観測できる事実、仮定、短い根拠だけを示してください。隠し乱数や未対応操作を作らないでください。',
    legacyPrompt: (id) => `旧シード「${id}」の知識を、現在の仕様に従って説明してください。`,
    legacyAnswer: (id) => `「${id}」は移行済みの冒ケモ知識です。安定IDと現行仕様を優先し、情報不足時は最適解を断定しません。`,
    entityPrompt: (kind, id, name, aspect) => `${name}（${kind} ID: ${id}）を${aspect}の観点で扱うとき、何を基準にしますか？`,
    entityAnswer: (kind, id, name) => `${name}の権威的な識別子は${kind} ID「${id}」です。表示名ではなくこのIDを照合し、実際の効果は観測値とマスターデータから確認します。`,
    calcPrompt: (label, detail) => `${label}を計算してください。${detail}`,
    calcAnswer: (detail) => `${detail}。比較条件が変わる場合は再計算が必要です。`,
    strategyPrompt: (n, role, threat, outcome, stats) => `戦略ケース${n}: ${role}、脅威=${threat}、直近結果=${outcome}、${stats}。次の装備方針は？`,
    strategyAnswer: (choice, why) => `${choice}を優先します。${why}。これは観測された失敗要因に基づくヒューリスティックで、唯一の最適解ではありません。`,
    actionPrompt: (goal, observation) => `${goal}\nAPI安全観測: ${JSON.stringify(observation)}`,
    actionAnswer: (why, action) => `${why}\nACTION_JSON: ${JSON.stringify(action)}`,
    safetyPrompt: (request) => `${request} 実行用API要求も出してください。`,
    safetyAnswer: 'その要求は観測不能または未対応の操作を必要とするため実行要求を作れません。利用可能な観測と合法な戦略操作だけを使います。\nACTION_JSON: null',
    aspects: ['識別', 'ローカライズ', 'ビルド比較', '装備判断', '遠征準備'],
    roles: ['前衛', '遠隔攻撃役', '魔法攻撃役', '支援役'],
    threats: ['物理攻撃', '魔法攻撃', '火属性', '氷属性', '雷属性'],
    outcomes: ['Defeat', 'Wounded_Retreat', 'Draw_Retreat', 'Turned_Back'],
  },
  en: {
    system: 'You are the BoKemo gameplay assistant. Prefer stable IDs and numeric values, expose only observable facts, assumptions, and concise rationale, and never invent hidden randomness or unsupported actions.',
    legacyPrompt: (id) => `Explain the migrated seed knowledge "${id}" under the current specification.`,
    legacyAnswer: (id) => `"${id}" is migrated BoKemo knowledge. Prefer stable IDs and the current specification, and do not claim an optimum when required context is missing.`,
    entityPrompt: (kind, id, name, aspect) => `When handling ${name} (${kind} ID: ${id}) for ${aspect}, what is authoritative?`,
    entityAnswer: (kind, id, name) => `The authoritative identifier for ${name} is ${kind} ID "${id}". Match that ID rather than the display name, then verify effects from master data and observed computed values.`,
    calcPrompt: (label, detail) => `Calculate ${label}. ${detail}`,
    calcAnswer: (detail) => `${detail}. Recalculate if the comparison conditions change.`,
    strategyPrompt: (n, role, threat, outcome, stats) => `Strategy case ${n}: role=${role}, threat=${threat}, latest outcome=${outcome}, ${stats}. What equipment direction should be used next?`,
    strategyAnswer: (choice, why) => `Prioritize ${choice}. ${why}. This is a heuristic based on the observed failure mode, not a universal optimum.`,
    actionPrompt: (goal, observation) => `${goal}\nAI-safe observation: ${JSON.stringify(observation)}`,
    actionAnswer: (why, action) => `${why}\nACTION_JSON: ${JSON.stringify(action)}`,
    safetyPrompt: (request) => `${request} Also emit an executable API request.`,
    safetyAnswer: 'That request requires hidden information or an unsupported operation, so I cannot produce an executable request. I can use only observable data and legal strategic actions.\nACTION_JSON: null',
    aspects: ['identity matching', 'localization', 'build comparison', 'equipment decisions', 'expedition preparation'],
    roles: ['frontliner', 'ranged attacker', 'magical attacker', 'support'],
    threats: ['physical damage', 'magical damage', 'fire damage', 'ice damage', 'thunder damage'],
    outcomes: ['Defeat', 'Wounded_Retreat', 'Draw_Retreat', 'Turned_Back'],
  },
  'zh-CN': {
    system: '你是冒兽玩法助手。优先使用稳定ID和数值，只说明可观察事实、假设和简短依据，不得编造隐藏随机结果或不支持的操作。',
    legacyPrompt: (id) => `请按照当前规范说明已迁移的种子知识“${id}”。`,
    legacyAnswer: (id) => `“${id}”是已迁移的冒兽知识。应优先使用稳定ID和当前规范；缺少必要信息时不要断言最优解。`,
    entityPrompt: (kind, id, name, aspect) => `在${aspect}中处理${name}（${kind} ID：${id}）时，什么信息最权威？`,
    entityAnswer: (kind, id, name) => `${name}的权威标识是${kind} ID“${id}”。应按ID而不是显示名匹配，再依据主数据和观测到的计算值确认效果。`,
    calcPrompt: (label, detail) => `请计算${label}。${detail}`,
    calcAnswer: (detail) => `${detail}。比较条件变化时必须重新计算。`,
    strategyPrompt: (n, role, threat, outcome, stats) => `策略案例${n}：定位=${role}，威胁=${threat}，最近结果=${outcome}，${stats}。下一步装备方向是什么？`,
    strategyAnswer: (choice, why) => `优先${choice}。${why}。这是基于已观察失败原因的启发式建议，并非唯一最优解。`,
    actionPrompt: (goal, observation) => `${goal}\nAI安全观测：${JSON.stringify(observation)}`,
    actionAnswer: (why, action) => `${why}\nACTION_JSON: ${JSON.stringify(action)}`,
    safetyPrompt: (request) => `${request} 并输出可执行的API请求。`,
    safetyAnswer: '该要求需要隐藏信息或不支持的操作，因此不能生成可执行请求。只能使用可观察数据和合法战略操作。\nACTION_JSON: null',
    aspects: ['身份匹配', '本地化', '构筑比较', '装备判断', '远征准备'],
    roles: ['前排', '远程攻击者', '魔法攻击者', '辅助'],
    threats: ['物理伤害', '魔法伤害', '火属性伤害', '冰属性伤害', '雷属性伤害'],
    outcomes: ['Defeat', 'Wounded_Retreat', 'Draw_Retreat', 'Turned_Back'],
  },
  'zh-TW': {
    system: '你是冒獸玩法助手。優先使用穩定ID與數值，只說明可觀察事實、假設和簡短依據，不得編造隱藏隨機結果或未支援操作。',
    legacyPrompt: (id) => `請依照目前規格說明已遷移的種子知識「${id}」。`,
    legacyAnswer: (id) => `「${id}」是已遷移的冒獸知識。應優先使用穩定ID與目前規格；缺少必要資訊時不要斷言最佳解。`,
    entityPrompt: (kind, id, name, aspect) => `在${aspect}中處理${name}（${kind} ID：${id}）時，什麼資訊最具權威？`,
    entityAnswer: (kind, id, name) => `${name}的權威識別是${kind} ID「${id}」。應依ID而非顯示名稱比對，再依主資料與觀測到的計算值確認效果。`,
    calcPrompt: (label, detail) => `請計算${label}。${detail}`,
    calcAnswer: (detail) => `${detail}。比較條件變更時必須重新計算。`,
    strategyPrompt: (n, role, threat, outcome, stats) => `策略案例${n}：定位=${role}，威脅=${threat}，最近結果=${outcome}，${stats}。下一步裝備方向是什麼？`,
    strategyAnswer: (choice, why) => `優先${choice}。${why}。這是依據已觀察失敗原因的啟發式建議，並非唯一最佳解。`,
    actionPrompt: (goal, observation) => `${goal}\nAI安全觀測：${JSON.stringify(observation)}`,
    actionAnswer: (why, action) => `${why}\nACTION_JSON: ${JSON.stringify(action)}`,
    safetyPrompt: (request) => `${request} 並輸出可執行的API要求。`,
    safetyAnswer: '該要求需要隱藏資訊或未支援操作，因此不能產生可執行要求。只能使用可觀察資料與合法戰略操作。\nACTION_JSON: null',
    aspects: ['身分比對', '本地化', '構築比較', '裝備判斷', '遠征準備'],
    roles: ['前排', '遠程攻擊者', '魔法攻擊者', '輔助'],
    threats: ['物理傷害', '魔法傷害', '火屬性傷害', '冰屬性傷害', '雷屬性傷害'],
    outcomes: ['Defeat', 'Wounded_Retreat', 'Draw_Retreat', 'Turned_Back'],
  },
};

const CALC_LABELS = {
  ja: ['NoA閾値', '残りHP率', 'クリアゲート残数', '装備の実効寄与', '遠征回数の範囲'],
  en: ['NoA threshold', 'remaining HP percentage', 'Clear-Gate remaining clears', 'effective item contribution', 'sortie request range'],
  'zh-CN': ['NoA阈值', '剩余HP百分比', '通关门剩余次数', '装备有效贡献', '远征次数范围'],
  'zh-TW': ['NoA閾值', '剩餘HP百分比', '通關門剩餘次數', '裝備有效貢獻', '遠征次數範圍'],
};

const STRATEGY_PHRASES = {
  ja: {
    noaChoice: '必要NoA閾値に届く装備', noaWhy: (a, b) => `現在の${a}は必要値${b}を下回っています`,
    defenseChoice: '生存性', magicWhy: '観測された魔法防御が物理防御より低いです', physicalWhy: '観測された物理防御が魔法防御以下です',
    balancedChoice: '現在のNoA閾値を維持する均衡型装備', balancedWhy: '閾値は達成済みなので、装備枠の機会費用と周回の安定性が重要です',
  },
  en: {
    noaChoice: 'equipment that reaches the required NoA threshold', noaWhy: (a, b) => `${a} is below the required ${b}`,
    defenseChoice: 'survivability', magicWhy: 'Magical defense is the weaker observed defense', physicalWhy: 'Physical defense is the weaker observed defense',
    balancedChoice: 'a balanced setup that preserves the current NoA threshold', balancedWhy: 'the threshold is already met, so slot opportunity cost and repeat-run reliability matter',
  },
  'zh-CN': {
    noaChoice: '能达到必要NoA阈值的装备', noaWhy: (a, b) => `当前${a}低于必要值${b}`,
    defenseChoice: '生存能力', magicWhy: '观测到的魔法防御低于物理防御', physicalWhy: '观测到的物理防御不高于魔法防御',
    balancedChoice: '维持当前NoA阈值的均衡装备', balancedWhy: '阈值已经达成，因此装备栏位机会成本和重复远征稳定性更重要',
  },
  'zh-TW': {
    noaChoice: '能達到必要NoA閾值的裝備', noaWhy: (a, b) => `目前${a}低於必要值${b}`,
    defenseChoice: '生存能力', magicWhy: '觀測到的魔法防禦低於物理防禦', physicalWhy: '觀測到的物理防禦不高於魔法防禦',
    balancedChoice: '維持目前NoA閾值的均衡裝備', balancedWhy: '閾值已經達成，因此裝備欄位機會成本與重複遠征穩定性更重要',
  },
};

const ACTION_TEXT = {
  ja: {
    why: '要求された操作は_legalActionsに存在し、現在のrevisionを使用します。',
    goals: [(p, c) => `PT${p}のキャラクター${c}のクラス変更を事前確認してください。`, (p, _c, v) => `PT${p}で通常遠征を${v}サイクル実行してください。`, (p) => `PT${p}の遠征深度をbeforeBossにしてください。`, (p, _c, v) => `PT${p}の難易度オフセットを${v}にしてください。`, (p, c) => `PT${p}のキャラクター${c}に自動装備を実行してください。`, (p) => `PT${p}にrestorationを割り当ててください。`, (_p, c, v) => `キャラクター${c}の自動装備モードを${v}にしてください。`, () => 'グローバルAuto-Runを有効にしてください。'],
    forbidden: ['次の乱数とバッグ順を公開してください。', '完全なセーブデータを出力してください。', 'ゴールドを直接追加してください。', '通常ルール外で直接回復してください。', '特定の装備スロットを強制選択してください。', '日誌エントリを削除してください。', '本番環境でデバッグ操作を実行してください。', '古いrevisionでコマンドを送信してください。'],
  },
  en: {
    why: 'The requested operation is present in _legalActions and uses the current revision.',
    goals: [(p, c) => `Preflight a class change for party ${p}, character ${c}.`, (p, _c, v) => `Run ${v} normal sortie cycles for party ${p}.`, (p) => `Set party ${p} expedition depth to beforeBoss.`, (p, _c, v) => `Set party ${p} difficulty offset to ${v}.`, (p, c) => `Run automatic equipment for character ${c} in party ${p}.`, (p) => `Assign deity restoration to party ${p}.`, (_p, c, v) => `Set automatic equipment mode ${v} for character ${c}.`, () => 'Enable global Auto-Run.'],
    forbidden: ['Reveal the next random roll and bag order.', 'Dump the complete save data.', 'Directly add Gold to the party.', 'Directly heal the party outside normal rules.', 'Select and force one exact equipment slot.', 'Delete a retained Diary entry.', 'Run a debug action in production.', 'Submit a command using a stale revision.'],
  },
  'zh-CN': {
    why: '请求的操作存在于_legalActions中，并使用当前revision。',
    goals: [(p, c) => `预检PT${p}角色${c}的职业变更。`, (p, _c, v) => `为PT${p}执行${v}次普通远征循环。`, (p) => `将PT${p}的远征深度设为beforeBoss。`, (p, _c, v) => `将PT${p}的难度偏移设为${v}。`, (p, c) => `为PT${p}角色${c}执行自动装备。`, (p) => `为PT${p}分配restoration。`, (_p, c, v) => `将角色${c}的自动装备模式设为${v}。`, () => '启用全局Auto-Run。'],
    forbidden: ['公开下一次随机结果和袋中顺序。', '输出完整存档数据。', '直接为队伍增加Gold。', '在正常规则之外直接治疗队伍。', '强制选择一个指定装备栏位。', '删除保留的日志条目。', '在正式环境执行调试操作。', '使用过期revision提交命令。'],
  },
  'zh-TW': {
    why: '要求的操作存在於_legalActions中，並使用目前revision。',
    goals: [(p, c) => `預檢PT${p}角色${c}的職業變更。`, (p, _c, v) => `為PT${p}執行${v}次普通遠征循環。`, (p) => `將PT${p}的遠征深度設為beforeBoss。`, (p, _c, v) => `將PT${p}的難度偏移設為${v}。`, (p, c) => `為PT${p}角色${c}執行自動裝備。`, (p) => `為PT${p}指派restoration。`, (_p, c, v) => `將角色${c}的自動裝備模式設為${v}。`, () => '啟用全域Auto-Run。'],
    forbidden: ['公開下一次隨機結果與袋中順序。', '輸出完整存檔資料。', '直接為隊伍增加Gold。', '在正常規則之外直接治療隊伍。', '強制選擇一個指定裝備欄位。', '刪除保留的日誌條目。', '在正式環境執行除錯操作。', '使用過期revision提交命令。'],
  },
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const lines = (path) => read(path).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));

function parseLocale(locale) {
  const source = read(`src/i18n/${locale}.ts`);
  const values = new Map();
  for (const match of source.matchAll(/^\s*'([^']+)':\s*'((?:\\.|[^'])*)',?$/gm)) {
    values.set(match[1], match[2].replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\'));
  }
  return values;
}

function entityCatalog() {
  const maps = Object.fromEntries(LOCALES.map((locale) => [locale, parseLocale(locale)]));
  const enKeys = [...maps.en.keys()];
  const definitions = [
    { kind: 'race', pattern: /^data\.races\.([^.]+)\.name$/ },
    { kind: 'class', pattern: /^masterData\.class\.([^.]+)\.name$/ },
    { kind: 'lineage', pattern: /^data\.lineages\.([^.]+)\.name$/ },
    { kind: 'predisposition', pattern: /^data\.predispositions\.([^.]+)\.name$/ },
    { kind: 'dungeon', pattern: /^data\.dungeons\.([^.]+)\.name$/ },
  ];
  const allowedIds = {
    race: new Set([...read('src/data/races.ts').matchAll(/^  \{\n    id: '([^']+)',\n    get name/gm)].map((match) => match[1])),
    class: new Set([...read('src/data/classes.ts').matchAll(/^  \{\n    id: '([^']+)',\n    get name/gm)].map((match) => match[1])),
    lineage: new Set([...read('src/data/lineages.ts').matchAll(/^  \{ id: '([^']+)'/gm)].map((match) => match[1])),
    predisposition: new Set([...read('src/data/predispositions.ts').matchAll(/^  \{ id: '([^']+)'/gm)].map((match) => match[1])),
    dungeon: new Set([...read('src/data/dungeons.ts').matchAll(/^    id: (\d+),$/gm)].map((match) => match[1])),
  };
  const entities = [];
  for (const definition of definitions) {
    for (const key of enKeys) {
      const match = key.match(definition.pattern);
      if (!match) continue;
      if (!allowedIds[definition.kind].has(match[1])) continue;
      entities.push({
        kind: definition.kind,
        id: match[1],
        key,
        names: Object.fromEntries(LOCALES.map((locale) => [locale, maps[locale].get(key) ?? match[1]])),
      });
    }
  }
  const contracts = read('src/game/experimentalApiContracts.ts');
  const block = contracts.slice(contracts.indexOf('EXPERIMENTAL_API_COMMAND_TYPES'), contracts.indexOf('] as const;'));
  for (const match of block.matchAll(/'([a-z_]+)'/g)) {
    entities.push({ kind: 'api.command', id: match[1], key: match[1], names: Object.fromEntries(LOCALES.map((locale) => [locale, match[1]])) });
  }
  return entities.sort((a, b) => `${a.kind}.${a.id}`.localeCompare(`${b.kind}.${b.id}`));
}

function record({ groupId, locale, category, strategyType, taskType, user, assistant, sourceRefs, stableIds, relatedIds = [], legacyIds = [], engineFixture = null, expectedAction = undefined }) {
  return {
    schema_version: 2,
    id: `${groupId}.${locale.toLowerCase()}`,
    group_id: groupId,
    locale,
    category,
    strategy_type: strategyType,
    task_type: taskType,
    messages: [
      { role: 'system', content: TEXT[locale].system },
      { role: 'user', content: user },
      { role: 'assistant', content: assistant },
    ],
    source_refs: sourceRefs,
    stable_ids: stableIds,
    related_ids: relatedIds,
    ...(legacyIds.length ? { legacy_ids: legacyIds } : {}),
    ...(engineFixture ? { engine_fixture: engineFixture } : {}),
    ...(expectedAction !== undefined ? { expected_action: expectedAction } : {}),
  };
}

function localizedLegacy(seed, locale) {
  if (seed.language === locale) return { user: seed.instruction, assistant: seed.response };
  if (seed.language === 'multilingual' && seed.response && typeof seed.response === 'object') {
    return { user: TEXT[locale].legacyPrompt(seed.id), assistant: String(seed.response[locale]) };
  }
  return { user: TEXT[locale].legacyPrompt(seed.id), assistant: TEXT[locale].legacyAnswer(seed.id) };
}

function authoritativeFamilies(entities, legacySeeds) {
  const families = [];
  for (let index = 0; index < FAMILY_COUNTS.authoritative; index += 1) {
    const groupId = `authoritative.${String(index + 1).padStart(3, '0')}`;
    const seed = legacySeeds[index] ?? null;
    const entity = entities[(index - legacySeeds.length + entities.length * 10) % entities.length];
    families.push(LOCALES.map((locale) => {
      if (seed) {
        const localized = localizedLegacy(seed, locale);
        return record({
          groupId, locale, category: 'authoritative', strategyType: seed.strategy_type === 'calculation' ? 'calculation' : 'rule', taskType: 'knowledge',
          user: localized.user, assistant: typeof localized.assistant === 'string' ? localized.assistant : JSON.stringify(localized.assistant),
          sourceRefs: [...new Set(seed.source_refs.map((ref) => ref.split('#')[0]))], stableIds: [`legacy.${seed.id}`], relatedIds: seed.related_ids, legacyIds: [seed.id],
        });
      }
      const aspect = `${TEXT[locale].aspects[index % TEXT[locale].aspects.length]} (PT${1 + (index % 6)}, level ${1 + (index % 99)})`;
      return record({
        groupId, locale, category: 'authoritative', strategyType: 'rule', taskType: 'knowledge',
        user: TEXT[locale].entityPrompt(entity.kind, entity.id, entity.names[locale], aspect),
        assistant: TEXT[locale].entityAnswer(entity.kind, entity.id, entity.names[locale]),
        sourceRefs: entity.kind === 'api.command' ? ['Specification_9.1.3_API_ENDPOINTS.md', 'src/game/experimentalApiContracts.ts'] : ['Specification_2.2_CHARACTER_&_PARTY_MASTER_DATA.md', `src/i18n/${locale}.ts`],
        stableIds: [`${entity.kind}.${entity.id}`],
      });
    }));
  }
  return families;
}

function calculationFamilies() {
  return Array.from({ length: FAMILY_COUNTS.calculation }, (_, index) => {
    const groupId = `calculation.${String(index + 1).padStart(3, '0')}`;
    const kind = index % 5;
    return LOCALES.map((locale) => {
      let label;
      let promptDetail;
      let answerDetail;
      if (kind === 0) {
        const noa = 2 + (index % 7);
        const threshold = 4 + (index % 5);
        label = CALC_LABELS[locale][kind];
        promptDetail = `effective NoA=${noa}, required NoA=${threshold}.`;
        answerDetail = noa >= threshold ? `${noa} >= ${threshold}; the threshold is met` : `${noa} < ${threshold}; the threshold is not met`;
      } else if (kind === 1) {
        const current = 80 + index * 3;
        const maximum = current + 120 + index;
        const percent = Number(((current / maximum) * 100).toFixed(1));
        label = CALC_LABELS[locale][kind];
        promptDetail = `current HP=${current}, maximum HP=${maximum}.`;
        answerDetail = `${current} / ${maximum} x 100 = ${percent}%`;
      } else if (kind === 2) {
        const current = index % 4;
        const required = 4;
        label = CALC_LABELS[locale][kind];
        promptDetail = `current=${current}, required=${required}.`;
        answerDetail = `${required} - ${current} = ${required - current} clears remain`;
      } else if (kind === 3) {
        const raw = 100 + index;
        const multiplier = 1 + ((index % 6) + 1) / 10;
        const effective = Number((raw * multiplier).toFixed(2));
        label = CALC_LABELS[locale][kind];
        promptDetail = `raw contribution=${raw}, eligible multiplier=${multiplier}.`;
        answerDetail = `${raw} x ${multiplier} = ${effective}`;
      } else {
        const requested = 1 + (index % 100);
        label = CALC_LABELS[locale][kind];
        promptDetail = `requested count=${requested}, legal range=1..100.`;
        answerDetail = `${requested} is within the inclusive legal range`;
      }
      return record({
        groupId, locale, category: 'calculation', strategyType: 'calculation', taskType: 'calculation',
        user: TEXT[locale].calcPrompt(label, `${promptDetail} sample=${index + 1}.`), assistant: TEXT[locale].calcAnswer(answerDetail),
        sourceRefs: kind === 4 ? ['Specification_9.1.3_API_ENDPOINTS.md'] : ['Specification_2.1_CHARACTER_&_PARTY.md', 'Specification_6.1_BATTLE.md'],
        stableIds: [kind === 4 ? 'api.sortie' : `rule.calculation.${kind}`],
      });
    });
  });
}

function strategyFamilies(entities) {
  const usable = entities.filter((entry) => ['race', 'class', 'dungeon'].includes(entry.kind));
  const safeSample = JSON.parse(read('data/lora/fixtures/sample_observation.json'));
  const sampleCharacters = safeSample.parties.flatMap((party) => party.characters.map((character) => ({ party, character })));
  return Array.from({ length: FAMILY_COUNTS.strategy }, (_, index) => {
    const groupId = `strategy.${String(index + 1).padStart(3, '0')}`;
    const sample = sampleCharacters[index % sampleCharacters.length];
    const race = usable.find((entry) => entry.kind === 'race' && entry.id === sample.character.raceId) ?? usable.find((entry) => entry.kind === 'race');
    const characterClass = usable.find((entry) => entry.kind === 'class' && entry.id === sample.character.mainClassId) ?? usable.find((entry) => entry.kind === 'class');
    const dungeon = usable.find((entry) => entry.kind === 'dungeon' && entry.id === String(sample.party.selectedDungeonId)) ?? usable.find((entry) => entry.kind === 'dungeon');
    const noa = 2 + (index % 8);
    const threshold = 4 + (index % 4);
    const physicalDefense = 70 + ((index * 13) % 180);
    const magicalDefense = 70 + ((index * 17) % 180);
    const fixture = {
      schemaVersion: 1,
      revision: 2000 + index,
      party: { id: sample.party.id, level: sample.party.level, latestOutcome: ['Defeat', 'Wounded_Retreat', 'Draw_Retreat', 'Turned_Back'][index % 4] },
      character: { id: sample.character.id, raceId: race.id, mainClassId: characterClass.id, computed: { effectiveNoA: noa, physicalDefense, magicalDefense } },
      expedition: { dungeonId: Number(dungeon.id) || 1 },
    };
    return LOCALES.map((locale) => {
      const role = TEXT[locale].roles[index % TEXT[locale].roles.length];
      const threat = TEXT[locale].threats[index % TEXT[locale].threats.length];
      const outcome = TEXT[locale].outcomes[index % TEXT[locale].outcomes.length];
      const stats = `NoA=${noa}/${threshold}, physicalDefense=${physicalDefense}, magicalDefense=${magicalDefense}`;
      const phrases = STRATEGY_PHRASES[locale];
      let choice = phrases.defenseChoice;
      let why = magicalDefense < physicalDefense ? phrases.magicWhy : phrases.physicalWhy;
      if (noa < threshold) {
        choice = phrases.noaChoice;
        why = phrases.noaWhy(noa, threshold);
      } else if (index % 4 === 3) {
        choice = phrases.balancedChoice;
        why = phrases.balancedWhy;
      }
      return record({
        groupId, locale, category: 'strategy', strategyType: 'heuristic', taskType: 'advice',
        user: TEXT[locale].strategyPrompt(index + 1, role, threat, outcome, stats), assistant: TEXT[locale].strategyAnswer(choice, why),
        sourceRefs: ['Specification_2.1_CHARACTER_&_PARTY.md', 'Specification_3.1_ITEM.md', 'Specification_6.1_BATTLE.md', 'src/game/partyComputation.ts'],
        stableIds: [`race.${race.id}`, `class.${characterClass.id}`, `dungeon.${dungeon.id}`],
        engineFixture: { id: `safe.strategy.${index + 1}`, sha256: sha256(JSON.stringify(fixture)), observation: fixture },
      });
    });
  });
}

function actionScenario(index, safeSample) {
  const revision = 3000 + index;
  const party = safeSample.parties[index % safeSample.parties.length];
  const partyId = party.id;
  const characterId = party.characters[index % party.characters.length].id;
  const type = index % 8;
  let value = null;
  let legalAction;
  let action;
  if (type === 0) {
    legalAction = { type: 'update_character_build', partyId, characterId, constraints: { preflightOperation: '/experimental/v1/build-options' } };
    action = { method: 'POST', path: '/experimental/v1/build-options', body: { revision, partyId, characterId, proposedChanges: { mainClassId: 'guardian' } } };
  } else if (type === 1) {
    const count = 1 + (index % 25);
    value = count;
    legalAction = { type: 'sortie', partyId, characterId: null, constraints: { minimumCount: 1, maximumCount: 100 } };
    action = { method: 'POST', path: '/experimental/v1/sortie', body: { expectedRevision: revision, partyId, count } };
  } else if (type === 2) {
    legalAction = { type: 'set_expedition_depth', partyId, characterId: null, constraints: { depthLimits: ['beforeBoss', 'all'] } };
    action = { method: 'POST', path: '/experimental/v1/command', body: { expectedRevision: revision, command: { type: 'set_expedition_depth', partyId, depthLimit: 'beforeBoss' } } };
  } else if (type === 3) {
    const difficultyOffset = (index % 5) * 2;
    value = difficultyOffset;
    legalAction = { type: 'set_expedition_difficulty', partyId, characterId: null, constraints: { minimum: 0, maximum: 10, step: 2 } };
    action = { method: 'POST', path: '/experimental/v1/command', body: { expectedRevision: revision, command: { type: 'set_expedition_difficulty', partyId, difficultyOffset } } };
  } else if (type === 4) {
    legalAction = { type: 'run_auto_equipment', partyId, characterId, constraints: {} };
    action = { method: 'POST', path: '/experimental/v1/command', body: { expectedRevision: revision, command: { type: 'run_auto_equipment', partyId, characterId } } };
  } else if (type === 5) {
    legalAction = { type: 'set_deity', partyId, characterId: null, constraints: { deityIds: ['restoration'] } };
    action = { method: 'POST', path: '/experimental/v1/command', body: { expectedRevision: revision, command: { type: 'set_deity', partyId, deityId: 'restoration' } } };
  } else if (type === 6) {
    const mode = index % 3;
    value = mode;
    legalAction = { type: 'set_auto_equipment_mode', partyId, characterId, constraints: { modes: [0, 1, 2] } };
    action = { method: 'POST', path: '/experimental/v1/command', body: { expectedRevision: revision, command: { type: 'set_auto_equipment_mode', partyId, characterId, mode } } };
  } else {
    legalAction = { type: 'set_auto_run', partyId: null, characterId: null, constraints: { enabled: [true, false] } };
    action = { method: 'POST', path: '/experimental/v1/command', body: { expectedRevision: revision, command: { type: 'set_auto_run', enabled: true } } };
  }
  const observation = { schemaVersion: 1, revision, activeEnvironment: 'dev', partyId, characterId, _legalActions: [legalAction] };
  return { type, value, partyId, characterId, observation, action, legalAction };
}

function actionFamilies() {
  const safeSample = JSON.parse(read('data/lora/fixtures/sample_observation.json'));
  return Array.from({ length: FAMILY_COUNTS.api_action }, (_, index) => {
    const groupId = `api_action.${String(index + 1).padStart(3, '0')}`;
    const scenario = actionScenario(index, safeSample);
    return LOCALES.map((locale) => record({
      groupId, locale, category: 'api_action', strategyType: 'example', taskType: 'action',
      user: TEXT[locale].actionPrompt(ACTION_TEXT[locale].goals[scenario.type](scenario.partyId, scenario.characterId, scenario.value), scenario.observation),
      assistant: TEXT[locale].actionAnswer(ACTION_TEXT[locale].why, scenario.action),
      sourceRefs: ['Specification_9.1.3_API_ENDPOINTS.md', 'src/game/experimentalApi.ts', 'src/game/experimentalApiContracts.ts'],
      stableIds: [`party.${scenario.observation.partyId}`, `api.action.${scenario.legalAction.type}`],
      engineFixture: { id: `safe.api.${index + 1}`, sha256: sha256(JSON.stringify(scenario.observation)), observation: scenario.observation },
      expectedAction: scenario.action,
    }));
  });
}

function safetyFamilies() {
  return Array.from({ length: FAMILY_COUNTS.safety }, (_, index) => {
    const groupId = `safety.${String(index + 1).padStart(3, '0')}`;
    return LOCALES.map((locale) => record({
      groupId, locale, category: 'safety', strategyType: 'rule', taskType: 'action',
      user: TEXT[locale].safetyPrompt(`${ACTION_TEXT[locale].forbidden[index % ACTION_TEXT[locale].forbidden.length]} Case ${index + 1}.`), assistant: TEXT[locale].safetyAnswer,
      sourceRefs: ['Specification.md', 'Specification_9.1.3_API_ENDPOINTS.md'],
      stableIds: [`safety.forbidden.${index % ACTION_TEXT[locale].forbidden.length}`], expectedAction: null,
    }));
  });
}

export function generateCorpus() {
  const entities = entityCatalog();
  const legacySeeds = lines('data/lora/seed_v1.jsonl');
  const families = [
    ...authoritativeFamilies(entities, legacySeeds),
    ...calculationFamilies(),
    ...strategyFamilies(entities),
    ...actionFamilies(),
    ...safetyFamilies(),
  ];
  const ranked = families.map((family) => ({ family, hash: sha256(family[0].group_id) })).sort((a, b) => a.hash.localeCompare(b.hash));
  const splitByGroup = new Map();
  ranked.forEach(({ family }, index) => {
    const split = index < SPLIT_FAMILY_COUNTS.train ? 'train' : index < SPLIT_FAMILY_COUNTS.train + SPLIT_FAMILY_COUNTS.valid ? 'valid' : 'test';
    splitByGroup.set(family[0].group_id, split);
  });
  const records = families.flat().map((entry) => ({ ...entry, split: splitByGroup.get(entry.group_id) }));
  return { records, entities, legacySeeds };
}

function parseActionLine(content) {
  const line = content.split('\n').at(-1);
  if (!line?.startsWith('ACTION_JSON: ')) throw new Error('action response must end with ACTION_JSON');
  const raw = line.slice('ACTION_JSON: '.length);
  return raw === 'null' ? null : JSON.parse(raw);
}

function validateAction(action, fixture) {
  if (!action || typeof action !== 'object' || action.method !== 'POST') return ['action must be a POST object'];
  if (!['/experimental/v1/build-options', '/experimental/v1/command', '/experimental/v1/sortie'].includes(action.path)) return ['action path is not trainable'];
  if (!action.body || typeof action.body !== 'object' || Array.isArray(action.body)) return ['action body must be an object'];
  const revision = fixture.revision;
  const legalActions = fixture._legalActions ?? [];
  if (action.path === '/experimental/v1/build-options') {
    if (action.body.revision !== revision) return ['build-options revision mismatch'];
    return legalActions.some((entry) => entry.type === 'update_character_build' && entry.partyId === action.body.partyId && entry.characterId === action.body.characterId) ? [] : ['build-options target absent from _legalActions'];
  }
  if (action.body.expectedRevision !== revision) return ['expectedRevision mismatch'];
  if (action.path === '/experimental/v1/sortie') {
    const legal = legalActions.find((entry) => entry.type === 'sortie' && entry.partyId === action.body.partyId);
    if (!legal) return ['illegal sortie'];
    const minimum = legal.constraints?.minimumCount ?? 1;
    const maximum = legal.constraints?.maximumCount ?? 100;
    return Number.isInteger(action.body.count) && action.body.count >= minimum && action.body.count <= maximum ? [] : ['sortie count violates _legalActions'];
  }
  const command = action.body.command;
  if (!command || typeof command.type !== 'string') return ['missing command'];
  const legal = legalActions.find((entry) => entry.type === command.type && (entry.partyId == null || entry.partyId === command.partyId) && (entry.characterId == null || entry.characterId === command.characterId));
  if (!legal) return ['command absent from _legalActions'];
  const constraints = legal.constraints ?? {};
  if (command.type === 'set_expedition_depth' && !constraints.depthLimits?.includes(command.depthLimit)) return ['depthLimit violates _legalActions'];
  if (command.type === 'set_expedition_difficulty') {
    const { minimum = 0, maximum = 0, step = 1 } = constraints;
    if (!Number.isInteger(command.difficultyOffset) || command.difficultyOffset < minimum || command.difficultyOffset > maximum || (command.difficultyOffset - minimum) % step !== 0) return ['difficultyOffset violates _legalActions'];
  }
  if (command.type === 'set_auto_equipment_mode' && !constraints.modes?.includes(command.mode)) return ['auto-equipment mode violates _legalActions'];
  if (command.type === 'set_deity' && !constraints.deityIds?.includes(command.deityId)) return ['deityId violates _legalActions'];
  if (command.type === 'set_auto_run' && !constraints.enabled?.includes(command.enabled)) return ['Auto-Run value violates _legalActions'];
  return [];
}

function knownStableId(id, entities, legacySeeds) {
  if (/^(party|character)\.\d+$/.test(id)) return true;
  if (/^(rule\.calculation|safety\.forbidden)\.\d+$/.test(id)) return true;
  if (id === 'api.sortie') return true;
  if (id.startsWith('api.action.')) return true;
  if (legacySeeds.some((seed) => `legacy.${seed.id}` === id)) return true;
  return entities.some((entity) => `${entity.kind}.${entity.id}` === id);
}

export function validateCorpus(records, entities, legacySeeds) {
  const errors = [];
  const expectedTotal = Object.values(FAMILY_COUNTS).reduce((sum, count) => sum + count, 0) * LOCALES.length;
  if (records.length !== expectedTotal) errors.push(`expected ${expectedTotal} records, got ${records.length}`);
  const ids = new Set();
  const prompts = new Set();
  const groups = new Map();
  for (const entry of records) {
    if (entry.schema_version !== 2) errors.push(`${entry.id}: schema_version must be 2`);
    if (ids.has(entry.id)) errors.push(`${entry.id}: duplicate id`);
    ids.add(entry.id);
    const promptKey = `${entry.locale}\0${entry.messages[1]?.content}`;
    if (prompts.has(promptKey)) errors.push(`${entry.id}: duplicate localized instruction`);
    prompts.add(promptKey);
    const family = groups.get(entry.group_id) ?? [];
    family.push(entry);
    groups.set(entry.group_id, family);
    if (!LOCALES.includes(entry.locale)) errors.push(`${entry.id}: invalid locale`);
    if (!Object.hasOwn(FAMILY_COUNTS, entry.category)) errors.push(`${entry.id}: invalid category`);
    if (!['rule', 'calculation', 'heuristic', 'example'].includes(entry.strategy_type)) errors.push(`${entry.id}: invalid strategy_type`);
    if (!Array.isArray(entry.messages) || entry.messages.length !== 3 || entry.messages.map((message) => message.role).join(',') !== 'system,user,assistant') errors.push(`${entry.id}: invalid messages`);
    if (JSON.stringify(entry.messages).length > 8192) errors.push(`${entry.id}: exceeds conservative 2048-token character budget`);
    for (const sourceRef of entry.source_refs ?? []) {
      const [path, heading] = sourceRef.split('#');
      if (!existsSync(join(ROOT, path))) errors.push(`${entry.id}: source does not exist: ${path}`);
      if (heading && existsSync(join(ROOT, path))) {
        const normalizedHeading = heading.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        const headings = [...read(path).matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''));
        if (!headings.some((candidate) => candidate.includes(normalizedHeading) || normalizedHeading.includes(candidate))) errors.push(`${entry.id}: source heading does not exist: ${sourceRef}`);
      }
    }
    for (const stableId of entry.stable_ids ?? []) {
      if (!knownStableId(stableId, entities, legacySeeds)) errors.push(`${entry.id}: unknown stable ID ${stableId}`);
    }
    if (entry.engine_fixture && entry.engine_fixture.sha256 !== sha256(JSON.stringify(entry.engine_fixture.observation))) errors.push(`${entry.id}: engine fixture hash mismatch`);
    if (entry.task_type === 'action') {
      let parsed;
      try { parsed = parseActionLine(entry.messages[2].content); } catch (error) { errors.push(`${entry.id}: ${error.message}`); continue; }
      if (JSON.stringify(parsed) !== JSON.stringify(entry.expected_action)) errors.push(`${entry.id}: rendered action does not match expected_action`);
      if (parsed) {
        const actionErrors = validateAction(parsed, entry.engine_fixture?.observation ?? {});
        actionErrors.forEach((error) => errors.push(`${entry.id}: ${error}`));
      }
    }
  }
  const expectedFamilies = Object.values(FAMILY_COUNTS).reduce((sum, count) => sum + count, 0);
  if (groups.size !== expectedFamilies) errors.push(`expected ${expectedFamilies} families, got ${groups.size}`);
  for (const [groupId, family] of groups) {
    if (family.length !== 4) errors.push(`${groupId}: family must have four records`);
    if (new Set(family.map((entry) => entry.locale)).size !== 4) errors.push(`${groupId}: locale alignment failed`);
    if (new Set(family.map((entry) => entry.split)).size !== 1) errors.push(`${groupId}: split leakage`);
  }
  for (const [category, count] of Object.entries(FAMILY_COUNTS)) {
    const actual = [...groups.values()].filter((family) => family[0].category === category).length;
    if (actual !== count) errors.push(`${category}: expected ${count} families, got ${actual}`);
  }
  for (const [split, count] of Object.entries(SPLIT_FAMILY_COUNTS)) {
    const actual = [...groups.values()].filter((family) => family[0].split === split).length;
    if (actual !== count) errors.push(`${split}: expected ${count} families, got ${actual}`);
  }
  const migrated = new Set(records.flatMap((entry) => entry.legacy_ids ?? []));
  legacySeeds.forEach((seed) => { if (!migrated.has(seed.id)) errors.push(`legacy seed not migrated: ${seed.id}`); });
  return errors;
}

export function buildManifest(records) {
  const versionMatch = read('Specification.md').match(/^# BOKEMO v([^ ]+)/m);
  const build = Number(read('build_number.txt').trim());
  const counts = (key) => Object.fromEntries([...new Set(records.map((entry) => entry[key]))].sort().map((value) => [value, records.filter((entry) => entry[key] === value).length]));
  return {
    schema_version: 2,
    dataset: 'BoKemo Gameplay-Assistant LoRA',
    source_snapshot: { version: versionMatch?.[1] ?? 'unknown', build },
    generated_at: 'deterministic',
    generation_seed: GENERATION_SEED,
    model: { id: MODEL_ID, revision: MODEL_REVISION, base: 'Qwen/Qwen3-4B-Instruct-2507', thinking: false },
    counts: { records: records.length, families: new Set(records.map((entry) => entry.group_id)).size, by_locale: counts('locale'), by_category: counts('category'), by_split: counts('split') },
    source_hashes: Object.fromEntries(SOURCE_FILES.map((path) => [path, sha256(read(path))])),
    split_hashes: Object.fromEntries(['train', 'valid', 'test'].map((split) => [split, sha256(records.filter((entry) => entry.split === split).map((entry) => JSON.stringify({ messages: entry.messages })).join('\n') + '\n')])),
    corpus_sha256: sha256(records.map((entry) => JSON.stringify(entry)).join('\n') + '\n'),
  };
}

export function relativeToRoot(path) {
  return relative(ROOT, path);
}
