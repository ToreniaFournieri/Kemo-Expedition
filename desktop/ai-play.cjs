const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const cell = value => String(value).replaceAll('|', '&#124;').replaceAll('<', '&lt;').replaceAll('\n', ' ');

// SpecRef: 12.1.1 | AI Play Regulation | Starting conditions
function prepareAiPlay({ argv, userData, environment, version, build, reportDirectory }) {
  const start = argv.find(a => a.startsWith('--ai-play='));
  const resume = argv.find(a => a.startsWith('--resume-ai-play='));
  if (!start && !resume) return null;
  if (!['orca', 'prod'].includes(environment) || (start && resume)) throw new Error('AI Play requires Desktop Orca or Normal (prod) and exactly one launch option.');
  const mode = environment === 'prod' ? 'normal' : 'orca';
  const regulationVersion = 2;
  const rulesId = 'ai-play-v2-calls20000-score10-sortie1-penalty100000-exactbatch';
  const root = path.join(userData, 'ai-play');
  let config;
  if (start) {
    const concept = start.slice('--ai-play='.length);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(concept)) throw new Error('AI Play concept must contain 1-64 letters, numbers, underscores or hyphens.');
    const evaluationId = crypto.randomUUID();
    const profile = path.join(root, evaluationId);
    fs.mkdirSync(profile, { recursive: true });
    config = { evaluationId, concept, version, build, mode, regulationVersion, rulesId, profile, reportDirectory, resume: false };
    fs.writeFileSync(path.join(profile, 'evaluation.json'), JSON.stringify(config), { flag: 'wx' });
  } else {
    const evaluationId = resume.slice('--resume-ai-play='.length);
    if (!/^[a-f0-9-]{36}$/.test(evaluationId)) throw new Error('Invalid AI Play evaluation ID.');
    const profile = path.join(root, evaluationId);
    config = JSON.parse(fs.readFileSync(path.join(profile, 'evaluation.json'), 'utf8'));
    if (config.evaluationId !== evaluationId || config.version !== version || config.build !== build || config.mode !== mode || config.regulationVersion !== regulationVersion || config.rulesId !== rulesId) throw new Error('AI Play identity or build mismatch.');
    config = { ...config, profile, resume: true };
  }
  return config;
}
// SpecRef: 12.1.2 | AI Play Regulation | Reporting
function writeAiPlayReport(config, report) {
  const evaluation = report?.evaluation;
  if (!evaluation) return;
  if (!config || evaluation.evaluationId !== config.evaluationId || evaluation.finalScore == null) return;
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(evaluation.startedAt ?? Date.now())).replaceAll('-', '');
  const filename = `${String(evaluation.finalScore).padStart(6, '0')}_v${config.version}(${config.build})_${config.mode}_${config.concept}_${date}.md`;
  const lines = [`# AI Play: ${config.concept}`, '', `Evaluation: ${config.evaluationId}`, `Version: v${config.version} (${config.build})`, `Environment: Desktop ${config.mode}; mode.${config.mode}; enemy offset ${config.mode === 'orca' ? '+5' : '0'}; Debug Mode OFF.`, `Rules: ${config.rulesId} (regulation ${config.regulationVersion})`, '',
    `Result: ${evaluation.status}`, `Counted API calls: ${evaluation.countedApiCalls}`, `Actual sorties: ${evaluation.actualSorties}`, `Score: ${evaluation.finalScore}`, `First winning sortie: ${evaluation.firstWinningSortie ?? 'none'}`, '',
    '## Final party status', '', '| ' + report.statusTable.headers.map(cell).join(' | ') + ' |', '| ' + report.statusTable.headers.map(() => '---').join(' | ') + ' |', ...report.statusTable.rows.map(row => '| ' + row.map(cell).join(' | ') + ' |'), '',
    '## Winning operation', '', '```json', JSON.stringify(evaluation.winningOperation ?? null, null, 2), '```', '',
    '## Final party configuration', '', '```json', JSON.stringify(report.observation.parties.map(p => ({ id: p.id, level: p.level, deityId: p.deityId, expedition: p.expedition, characters: p.characters.map(c => ({ id: c.id, row: c.row, build: c.build, autoEquipmentMode: c.autoEquipmentMode, equipment: c.equipment })) })), null, 2), '```', '',
    'This automatically generated report records the authoritative operation ledger. Strategy commentary can be added after the run.', '', '| Call | Operation | Actual sorties | Error |', '|-|-|-|-|',
    ...report.ledger.map(r => `| ${r.call} | ${cell(r.commandType ? `${r.operation}:${r.commandType}` : r.operation)} | ${r.actualSorties} | ${cell(r.error ?? '')} |`), ''];
  fs.mkdirSync(config.reportDirectory, { recursive: true });
  let target = path.join(config.reportDirectory, filename);
  if (fs.existsSync(target) && !fs.readFileSync(target, 'utf8').includes(`Evaluation: ${config.evaluationId}`)) {
    target = path.join(config.reportDirectory, filename.replace(`_${config.concept}_`, `_${config.concept}-${config.evaluationId}_`));
  }
  // Never replace another run report. The evaluation UUID remains available in the profile.
  try { fs.writeFileSync(target, lines.join('\n'), { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return target;
}
module.exports = { prepareAiPlay, writeAiPlayReport };
