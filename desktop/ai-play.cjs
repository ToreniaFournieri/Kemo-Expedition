const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// SpecRef: 12.1.1 | AI Play Regulation | Starting conditions
function prepareAiPlay({ argv, userData, environment, version, build, reportDirectory }) {
  const start = argv.find(a => a.startsWith('--ai-play='));
  const resume = argv.find(a => a.startsWith('--resume-ai-play='));
  if (!start && !resume) return null;
  if (environment !== 'orca' || (start && resume)) throw new Error('AI Play requires Desktop Orca and exactly one launch option.');
  const root = path.join(userData, 'ai-play');
  let config;
  if (start) {
    const concept = start.slice('--ai-play='.length);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(concept)) throw new Error('AI Play concept must contain 1-64 letters, numbers, underscores or hyphens.');
    const evaluationId = crypto.randomUUID();
    const profile = path.join(root, evaluationId);
    fs.mkdirSync(profile, { recursive: true });
    config = { evaluationId, concept, version, build, profile, reportDirectory, resume: false };
    fs.writeFileSync(path.join(profile, 'evaluation.json'), JSON.stringify(config), { flag: 'wx' });
  } else {
    const evaluationId = resume.slice('--resume-ai-play='.length);
    if (!/^[a-f0-9-]{36}$/.test(evaluationId)) throw new Error('Invalid AI Play evaluation ID.');
    const profile = path.join(root, evaluationId);
    config = JSON.parse(fs.readFileSync(path.join(profile, 'evaluation.json'), 'utf8'));
    if (config.evaluationId !== evaluationId || config.version !== version || config.build !== build) throw new Error('AI Play identity or build mismatch.');
    config = { ...config, profile, resume: true };
  }
  return config;
}
// SpecRef: 12.1.2 | AI Play Regulation | Reporting
function writeAiPlayReport(config, evaluation) {
  if (!config || evaluation.evaluationId !== config.evaluationId || evaluation.finalScore == null) return;
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(evaluation.startedAt ?? Date.now())).replaceAll('-', '');
  const filename = `${evaluation.finalScore}_v${config.version}(${config.build})_${config.concept}_${date}.md`;
  const lines = [`# AI Play: ${config.concept}`, '', `Evaluation: ${config.evaluationId}`, `Version: v${config.version} (${config.build})`, 'Environment: Desktop Orca; mode.orca; enemy offset +5; Debug Mode OFF.', '',
    `Result: ${evaluation.status}`, `Counted API calls: ${evaluation.countedApiCalls}`, `Actual sorties: ${evaluation.actualSorties}`, `Score: ${evaluation.finalScore}`, `First winning sortie: ${evaluation.firstWinningSortie ?? 'none'}`, '',
    'This automatically generated report records the authoritative operation ledger. Strategy commentary can be added after the run.', '', '| Call | Operation | Actual sorties | Error |', '|-|-|-|-|',
    ...evaluation.ledger.map(r => `| ${r.call} | ${r.operation} | ${r.actualSorties} | ${r.error ?? ''} |`), ''];
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
