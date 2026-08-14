import { readFileSync } from 'node:fs';

const [goldPath, predictionsPath] = process.argv.slice(2);
if (!goldPath || !predictionsPath) {
  console.error('Usage: node scripts/lora/evaluate.mjs <gold-jsonl> <predictions-jsonl>');
  process.exit(2);
}

const load = (path) => readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const gold = load(goldPath).filter((entry) => !entry.split || entry.split === 'test');
const predictions = new Map(load(predictionsPath).map((entry) => [entry.id, String(entry.response ?? '')]));
const ratio = (value, total) => total ? Number((value / total).toFixed(4)) : 0;
const normalize = (value) => value.toLowerCase().replace(/action_json:[^\n]+/g, '').replace(/[^\p{L}\p{N}]+/gu, '');
const bigrams = (value) => {
  const normalized = normalize(value);
  if (normalized.length < 2) return new Set(normalized ? [normalized] : []);
  return new Set(Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)));
};
const similarity = (left, right) => {
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((part) => b.has(part)).length;
  return (2 * overlap) / (a.size + b.size);
};
const localeMatches = (locale, response) => {
  const hasKana = /[\u3040-\u30ff]/u.test(response);
  const hasHan = /[\u3400-\u9fff]/u.test(response);
  if (locale === 'ja') return hasKana;
  if (locale === 'en') return !hasKana && !hasHan && /[A-Za-z]{3}/.test(response);
  if (hasKana || !hasHan) return false;
  const simplifiedOnly = /[这为发后里过门数与观现区]/u;
  const traditionalOnly = /[這為發後裡過門數與觀現區]/u;
  return locale === 'zh-CN' ? !traditionalOnly.test(response) : !simplifiedOnly.test(response);
};

let actionTotal = 0;
let parsedActions = 0;
let schemaValidActions = 0;
let exactActions = 0;
let forbiddenActions = 0;
let abstentionTotal = 0;
let correctAbstentions = 0;
let authoritativeTotal = 0;
let authoritativeScore = 0;
let localeCorrect = 0;
const categoryScores = new Map();

for (const entry of gold) {
  const response = predictions.get(entry.id) ?? '';
  if (localeMatches(entry.locale, response)) localeCorrect += 1;
  const target = entry.messages.at(-1).content;
  let score = similarity(response, target);

  if (entry.category === 'authoritative') {
    authoritativeTotal += 1;
    const requiredIds = (entry.stable_ids ?? []).map((id) => id.replace(/^legacy\./, '').split('.').at(-1)).filter((id) => id && id.length > 2);
    const idScore = requiredIds.length ? requiredIds.filter((id) => response.includes(id)).length / requiredIds.length : 1;
    const factScore = Math.max(score, idScore);
    authoritativeScore += factScore;
    score = factScore;
  }

  if (entry.task_type === 'action') {
    actionTotal += 1;
    const actionLine = response.split('\n').at(-1) ?? '';
    if (actionLine.startsWith('ACTION_JSON: ')) {
      try {
        const parsed = JSON.parse(actionLine.slice('ACTION_JSON: '.length));
        parsedActions += 1;
        const validPath = parsed === null || (parsed.method === 'POST' && ['/experimental/v1/build-options', '/experimental/v1/command', '/experimental/v1/sortie'].includes(parsed.path));
        if (validPath) schemaValidActions += 1;
        if (JSON.stringify(parsed) === JSON.stringify(entry.expected_action)) exactActions += 1;
        if (entry.expected_action === null) {
          abstentionTotal += 1;
          if (parsed === null) correctAbstentions += 1;
        } else if (!validPath || parsed === null) {
          forbiddenActions += 1;
        }
        score = JSON.stringify(parsed) === JSON.stringify(entry.expected_action) ? 1 : 0;
      } catch {}
    } else if (entry.expected_action === null) {
      abstentionTotal += 1;
    }
  }

  const category = categoryScores.get(entry.category) ?? { score: 0, total: 0 };
  category.score += score;
  category.total += 1;
  categoryScores.set(entry.category, category);
}

const metrics = {
  evaluated_records: gold.length,
  prediction_coverage: ratio([...predictions.keys()].filter((id) => gold.some((entry) => entry.id === id)).length, gold.length),
  action_parse_rate: ratio(parsedActions, actionTotal),
  action_schema_valid_rate: ratio(schemaValidActions, actionTotal),
  exact_action_rate: ratio(exactActions, actionTotal),
  forbidden_action_count: forbiddenActions,
  authoritative_fact_score: ratio(authoritativeScore, authoritativeTotal),
  abstention_rate: ratio(correctAbstentions, abstentionTotal),
  locale_rate: ratio(localeCorrect, gold.length),
  category_scores: Object.fromEntries([...categoryScores].sort(([a], [b]) => a.localeCompare(b)).map(([category, value]) => [category, ratio(value.score, value.total)])),
};
metrics.acceptance = {
  action_format: metrics.action_parse_rate === 1 && metrics.action_schema_valid_rate === 1,
  no_forbidden_actions: metrics.forbidden_action_count === 0,
  action_selection: metrics.exact_action_rate >= 0.9,
  authoritative_facts: metrics.authoritative_fact_score >= 0.9,
  abstention: metrics.abstention_rate >= 0.95,
  locale: metrics.locale_rate >= 0.98,
  category_floor: Object.values(metrics.category_scores).every((score) => score >= 0.8),
};
console.log(JSON.stringify(metrics, null, 2));
