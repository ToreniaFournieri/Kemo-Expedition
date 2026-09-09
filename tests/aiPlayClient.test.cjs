const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function fixture(t, intercept) {
  const { AiPlayClient } = await import('../scripts/lib/ai-play-client.mjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-client-test-'));
  const evaluation = { evaluationId: 'test-evaluation', version: '0.9.6', build: 15, mode: 'orca', rulesId: 'test-rules', regulationVersion: 2, status: 'active' };
  const calls = []; let revision = 7;
  const connection = { endpoint: 'http://127.0.0.1:12345/experimental/v1', token: 'PRIVATE_BEARER', evaluationId: evaluation.evaluationId };
  const fetchImpl = async (url, options) => {
    const route = url.replace(connection.endpoint, '');
    const call = { route, ...options, body: options.body && JSON.parse(options.body) }; calls.push(call);
    const custom = await intercept?.(call, { evaluation });
    if (custom) return custom;
    let body = { apiVersion: 'experimental/v1', schemaVersion: 1 };
    if (route === '/evaluation') body.evaluation = { ...evaluation };
    else if (route === '/status') body.runtime = { status: 'ready', revision };
    else if (route === '/control/acquire') body.lease = { token: 'PRIVATE_LEASE' };
    else if (route === '/control/renew') body.renewed = true;
    else if (route === '/command' || route === '/sortie') body = { ...body, revision: ++revision, evaluation: { ...evaluation } };
    else if (route === '/observation') body.observation = { revision, parties: [] };
    return Response.json(body);
  };
  let client = new AiPlayClient({ connection, directory, fetchImpl });
  t.after(async () => { if (!client.closed) await client.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  return { get client() { return client; }, calls, directory, evaluation,
    async restart() { await client.close(); client = new AiPlayClient({ connection, directory, fetchImpl }); await client.connect(); } };
}

test('serializes operations, injects latest revision and never persists credentials', async t => {
  const f = await fixture(t); await f.client.connect();
  await Promise.all([
    f.client.run({ action: 'configure', configuration: { depthLimit: 'all' } }),
    f.client.run({ action: 'sortie', count: 1 }),
  ]);
  const writes = f.calls.filter(c => ['/command', '/sortie'].includes(c.route));
  assert.deepEqual(writes.map(c => c.body.expectedRevision), [7, 8]);
  assert.notEqual(writes[0].headers['Idempotency-Key'], writes[1].headers['Idempotency-Key']);
  const contents = fs.readdirSync(f.directory).map(n => fs.readFileSync(path.join(f.directory, n), 'utf8')).join('');
  assert(!contents.includes('PRIVATE_BEARER')); assert(!contents.includes('PRIVATE_LEASE'));
});

test('lost response blocks new gameplay and explicit retry survives restart with exact request', async t => {
  let lost = true;
  const f = await fixture(t, c => { if (c.route === '/sortie' && lost) { lost = false; throw new Error('connection lost'); } });
  await f.client.connect();
  await assert.rejects(f.client.run({ action: 'sortie', count: 10 }), /uncertain/);
  await assert.rejects(f.client.run({ action: 'observe' }), /pending/);
  await f.restart();
  await f.client.run({ action: 'retry' });
  const writes = f.calls.filter(c => c.route === '/sortie');
  assert.equal(writes.length, 2); assert.deepEqual(writes[0].body, writes[1].body);
  assert.equal(writes[0].headers['Idempotency-Key'], writes[1].headers['Idempotency-Key']);
  assert.equal(f.client.state.pending, null);
});

test('uncertain winning operation is never retried after terminal evaluation', async t => {
  const f = await fixture(t, (c, { evaluation }) => {
    if (c.route === '/sortie') { evaluation.status = 'succeeded'; throw new Error('lost winning response'); }
  });
  await f.client.connect();
  await assert.rejects(f.client.run({ action: 'sortie', count: 1 }));
  await assert.rejects(f.client.run({ action: 'retry' }), /finished/);
  await assert.rejects(f.client.run({ action: 'observe' }), /finished/);
  await f.client.run({ action: 'report' });
  assert.equal(f.calls.filter(c => c.route === '/sortie').length, 1);
});

test('lease expiry reacquires before gameplay without changing mutation accounting', async t => {
  let expire = true;
  const f = await fixture(t, c => {
    if (c.route === '/control/renew' && expire) { expire = false; return Response.json({ error: { code: 'control_lease_expired' } }, { status: 409 }); }
  });
  await f.client.connect(); await f.client.run({ action: 'sortie', count: 1 });
  assert.equal(f.calls.filter(c => c.route === '/control/acquire').length, 2);
  assert.equal(f.calls.filter(c => c.route === '/sortie').length, 1);
});

test('rejects unsafe paths and invalid batch counts without gameplay calls', async t => {
  const f = await fixture(t); await f.client.connect();
  for (const input of [{ action: 'read', path: 'https://example.com' }, { action: 'sortie', count: 101 }, { action: 'god_battle' }])
    await assert.rejects(f.client.run(input));
  assert(f.calls.every(c => ['/evaluation', '/status', '/control/acquire'].includes(c.route)));
});

test('rejects changed evaluation identity and duplicate directory owner', async t => {
  const f = await fixture(t); await f.client.connect();
  const { AiPlayClient } = await import('../scripts/lib/ai-play-client.mjs');
  assert.throws(() => new AiPlayClient({ connection: f.client.connection, directory: f.directory }), /EEXIST/);
  f.evaluation.build++;
  await assert.rejects(f.client.run({ action: 'sortie', count: 1 }), /identity changed/);
  assert.equal(f.calls.filter(c => c.route === '/sortie').length, 0);
  f.evaluation.build--;
});

test('compact output retains attack counts and marks equipment changes; export strips replay secrets', async () => {
  const { compactResponse, sanitize } = await import('../scripts/lib/ai-play-client.mjs');
  const previous = [{ id: 1, level: 1, experience: 2, condition: { value: 0 }, characters: [{ id: 2, equipment: [{ item: 1 }] }] }];
  const data = { observation: { parties: [{ ...previous[0], level: 2, characters: [{ id: 2, computed: { rangedNumberOfAttacks: 13 }, equipment: [{ item: 2 }] }] }] }, runs: [{ returnReason: 'depth_limit' }] };
  const summary = compactResponse(data, previous);
  assert.equal(summary.parties[0].characters[0].computed.rangedNumberOfAttacks, 13);
  assert.deepEqual(summary.parties[0].characters[0].equipmentChanges[0].before, { item: 1 });
  assert.equal(summary.returnReasons.depth_limit, 1);
  assert.deepEqual(sanitize({ replayMetadata: { seedHex: 'secret' }, nested: { token: 'secret', message: 'x secret' } }, ['secret']), { nested: { message: 'x [redacted]' } });
});

test('CLI reads configuration files through the real HTTP listener and blocks play after victory', async t => {
  const { createExperimentalApi } = require('../desktop/experimental-api.cjs');
  const { spawn } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-client-http-'));
  let revision = 0, released = false;
  const evaluation = { evaluationId: 'http-test', version: '0.9.6', build: 15, mode: 'orca', rulesId: 'test-rules', regulationVersion: 2, status: 'active' };
  const mutations = [];
  const api = createExperimentalApi({ environment: 'orca', version: '0.9.6', build: 15, invokeRenderer: async (operation, payload) => {
    if (operation === 'status' || operation === 'set-control') return { status: 'ready', revision };
    if (operation === 'evaluation') return { evaluation: { ...evaluation } };
    if (operation === 'renew') return { renewed: true };
    if (operation === 'release') { released = true; return { revision }; }
    if (operation === 'party-preview') return { revision, party: { id: 1, characters: [] } };
    if (operation === 'evaluation-report') return { evaluation: { ...evaluation }, ledger: [], observation: { revision, parties: [] } };
    if (operation === 'command' || operation === 'sortie') {
      assert.equal(payload.expectedRevision, revision); mutations.push({ operation, payload }); revision++;
      if (operation === 'sortie') evaluation.status = 'succeeded';
      return { revision, evaluation: { ...evaluation } };
    }
    throw new Error(`Unexpected ${operation}`);
  } });
  t.after(async () => { await api.shutdown(); fs.rmSync(directory, { recursive: true, force: true }); });
  const settings = await api.enable();
  const connection = path.join(directory, 'connection.json');
  fs.writeFileSync(connection, JSON.stringify({ endpoint: `http://${settings.host}:${settings.port}/experimental/v1`, token: settings.token, evaluationId: 'http-test' }), { mode: 0o600 });
  const configFile = path.join(directory, 'candidate.json');
  const configuration = { depthLimit: 'all' };
  fs.writeFileSync(configFile, ' '.repeat(6000) + JSON.stringify(configuration));
  const actionFile = path.join(directory, 'action.json');
  fs.writeFileSync(actionFile, JSON.stringify({ action: 'preview', configurationFile: configFile }));
  const child = spawn(process.execPath, ['scripts/ai-play-client.mjs', `--connection=${connection}`, `--directory=${path.join(directory, 'records')}`], { stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  let stdout = '', stderr = '';
  child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
  const done = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => resolve(code)); });
  child.stdin.end(`@${actionFile}\n${JSON.stringify({ action: 'configure', configurationFile: configFile })}\n{"action":"sortie","count":1}\n{"action":"sortie","count":1}\n{"action":"report"}\n`);
  assert.equal(await done, 0, stderr);
  assert.equal(mutations.length, 2, stdout);
  assert.deepEqual(mutations[0].payload.command.configuration, configuration);
  assert(stdout.includes('Evaluation finished')); assert(stdout.includes('succeeded'));
  assert(!stdout.includes(settings.token)); assert(released);
});

test('malformed successful mutation response preserves recovery request', async t => {
  const f = await fixture(t, c => c.route === '/sortie' ? Response.json({ apiVersion: 'experimental/v1' }) : undefined);
  await f.client.connect();
  await assert.rejects(f.client.run({ action: 'sortie', count: 1 }), /lacks a revision/);
  assert.equal(f.client.state.pending.body.count, 1);
  await assert.rejects(f.client.run({ action: 'observe' }), /pending/);
});

test('simulation compact output includes evaluated party and server comparison', async () => {
  const { compactResponse } = await import('../scripts/lib/ai-play-client.mjs');
  const comparison = { maximumHp: { before: 100, after: 120, delta: 20 }, characters: [] };
  const result = compactResponse({ configuration: { id: 1, characters: [{ id: 2, computed: { magicalNumberOfAttacks: 4 } }] }, comparison, simulation: { total: 1000 } });
  assert.deepEqual(result.comparison, comparison);
  assert.equal(result.parties[0].characters[0].computed.magicalNumberOfAttacks, 4);
});
