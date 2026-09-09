const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function fixture(t, intercept, options = {}) {
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
    else if (route === '/control/release') body.release = { statePersisted: true };
    else if (route === '/command' || route === '/sortie') body = { ...body, revision: ++revision, evaluation: { ...evaluation } };
    else if (route === '/observation') body.observation = { revision, parties: [] };
    return Response.json(body);
  };
  let client = new AiPlayClient({ connection, directory, fetchImpl, ...options });
  t.after(async () => { if (!client.closed) await client.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  return { get client() { return client; }, calls, directory, evaluation,
    async restart() { await client.close(); client = new AiPlayClient({ connection, directory, fetchImpl, ...options }); await client.connect(); } };
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

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}

test('shutdown discards queued gameplay and renewals while preserving the outstanding response', async t => {
  const entered = deferred(), finish = deferred(), events = [];
  const f = await fixture(t, async c => {
    if (c.route === '/sortie') { entered.resolve(); await finish.promise; }
  }, { onEvent: e => events.push(e) });
  await f.client.connect();
  const active = f.client.run({ action: 'sortie', count: 1 });
  await entered.promise;
  const queue = Promise.allSettled([f.client.renew(), f.client.run({ action: 'sortie', count: 2 })]);
  const renewals = f.calls.filter(c => c.route === '/control/renew').length;
  const close = f.client.close();
  assert.equal(f.client.stopping, true);
  assert(events.some(e => e.event === 'waiting_for_request'));
  finish.resolve();
  await active; await close;
  assert((await queue).every(r => r.status === 'rejected'));
  assert.equal(f.calls.filter(c => c.route === '/sortie').length, 1);
  assert.equal(f.calls.filter(c => c.route === '/control/renew').length, renewals);
  assert.equal(f.calls.filter(c => c.route === '/control/release').length, 1);
  assert.equal(f.client.state.pending, null);
  assert(events.some(e => e.event === 'control_released'));
  assert.equal(events.at(-1).event, 'client_closed');
});

test('shutdown during preflight prevents acquisition and mutation dispatch', async t => {
  const entered = deferred(), finish = deferred(); let hold = false;
  const f = await fixture(t, async c => {
    if (c.route === '/evaluation' && hold) { entered.resolve(); await finish.promise; }
  });
  await f.client.connect(); hold = true;
  const active = assert.rejects(f.client.run({ action: 'sortie', count: 1 }), /shutting down/);
  await entered.promise;
  const close = f.client.close(); finish.resolve(); await active; await close;
  assert.equal(f.calls.filter(c => c.route === '/sortie').length, 0);
  assert.equal(f.calls.filter(c => c.route === '/control/acquire').length, 1);
});

test('uncertain simulation is journaled despite having no pending mutation', async t => {
  const f = await fixture(t, c => { if (c.route === '/simulation') throw new Error('lost response'); });
  await f.client.connect();
  await assert.rejects(f.client.run({ action: 'simulate', configuration: {} }), /ledger/);
  assert.equal(f.client.state.pending, null);
  const entries = fs.readFileSync(path.join(f.directory, 'requests.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(e => e.path === '/simulation');
  assert.deepEqual(entries.map(e => e.stage), ['dispatching', 'response_uncertain']);
  assert.equal(entries[0].requestId, entries[1].requestId);
  await f.restart();
  assert.equal(f.client.state.lastGameplayRequest.stage, 'response_uncertain');
  assert.equal(f.client.state.lastGameplayRequest.path, '/simulation');
});

test('failed release is reported honestly and closes without additional renewal', async t => {
  const events = [];
  const f = await fixture(t, c => c.route === '/control/release' ? Response.json({ error: { code: 'runtime_busy' } }, { status: 409 }) : undefined, { onEvent: e => events.push(e) });
  await f.client.connect();
  await assert.rejects(f.client.close(), /Release not confirmed/);
  assert(f.client.closed); assert(!fs.existsSync(path.join(f.directory, 'client.lock')));
  assert(!events.some(e => e.event === 'control_released'));
  assert(events.some(e => e.event === 'release_unconfirmed'));
  await assert.rejects(f.client.renew(), /shutting down/);
});

test('CLI signals and quit stop a waiting client and discard buffered gameplay', { timeout: 15000 }, async t => {
  for (const interrupt of ['SIGINT', 'SIGTERM', 'quit', 'ETX']) await t.test(interrupt, async t => {
    const { createExperimentalApi } = require('../desktop/experimental-api.cjs');
    const { spawn } = require('node:child_process');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-client-shutdown-'));
    const entered = deferred(), finish = deferred(), shutdownSeen = deferred();
    const operations = [];
    const evaluation = { evaluationId: 'shutdown-test', version: '0.9.6', build: 17, mode: 'orca', rulesId: 'test-rules', regulationVersion: 2, status: 'active' };
    const api = createExperimentalApi({ environment: 'orca', version: '0.9.6', build: 17, invokeRenderer: async operation => {
      operations.push(operation);
      if (operation === 'status' || operation === 'set-control') return { status: 'ready', revision: 0 };
      if (operation === 'evaluation') return { evaluation };
      if (operation === 'renew') return { renewed: true };
      if (operation === 'release') return { revision: 0 };
      if (operation === 'simulation') { entered.resolve(); await finish.promise; return { revision: 0, simulation: { total: 1000 }, evaluation }; }
      throw new Error(`Unexpected operation ${operation}`);
    } });
    let child;
    t.after(async () => { finish.resolve(); child?.kill('SIGKILL'); await api.shutdown(); fs.rmSync(directory, { recursive: true, force: true }); });
    const settings = await api.enable();
    const connectionFile = path.join(directory, 'connection.json');
    fs.writeFileSync(connectionFile, JSON.stringify({ endpoint: `http://${settings.host}:${settings.port}/experimental/v1`, token: settings.token, evaluationId: evaluation.evaluationId }), { mode: 0o600 });
    const configFile = path.join(directory, 'build.json'); fs.writeFileSync(configFile, '{}');
    child = spawn(process.execPath, ['scripts/ai-play-client.mjs', `--connection=${connectionFile}`, `--directory=${path.join(directory, 'records')}`], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', b => { stdout += b; if (stdout.includes('"event":"waiting_for_request"')) shutdownSeen.resolve(); });
    child.stderr.on('data', b => stderr += b);
    const done = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => resolve(code)); });
    // Digit 3 is ordinary input, not ETX. A pasted configuration is rejected before gameplay.
    child.stdin.write('{"action":"configure","partyId":3,"configuration":{}}\n');
    child.stdin.write(JSON.stringify({ action: 'simulate', configurationFile: configFile }) + '\n{"action":"sortie","count":1}\n');
    await entered.promise;
    const renewalCount = operations.filter(o => o === 'renew').length;
    if (interrupt === 'quit') child.stdin.write('{"action":"quit"}\n');
    else if (interrupt === 'ETX') child.stdin.write('\u0003');
    else child.kill(interrupt);
    let diagnosticTimer;
    try { await Promise.race([shutdownSeen.promise, new Promise((_, reject) => { diagnosticTimer = setTimeout(() => reject(new Error(stdout)), 2000); })]); }
    finally { clearTimeout(diagnosticTimer); }
    assert(stdout.includes('waiting_for_request'));
    finish.resolve();
    assert.equal(await done, 0, stderr);
    assert(!operations.includes('sortie')); assert(!operations.includes('command'));
    assert.equal(operations.filter(o => o === 'renew').length, renewalCount);
    assert.equal(operations.filter(o => o === 'release').length, 1);
    assert(stdout.includes('Use configurationFile'));
    assert(stdout.includes('control_released')); assert(stdout.includes('client_closed'));
    assert(!stdout.includes(settings.token));
    assert(!fs.existsSync(path.join(directory, 'records', 'client.lock')));
  });
});

test('shutdown after a request timeout preserves the exact mutation for recovery', async t => {
  const entered = deferred();
  const keepAlive = setTimeout(() => {}, 1000);
  t.after(() => clearTimeout(keepAlive));
  const f = await fixture(t, c => {
    if (c.route === '/sortie') {
      entered.resolve();
      return new Promise((_, reject) => c.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }));
    }
  }, { timeoutMs: 30 });
  await f.client.connect();
  const active = assert.rejects(f.client.run({ action: 'sortie', count: 5 }), /uncertain/);
  await entered.promise;
  const saved = structuredClone(f.client.state.pending);
  const closing = f.client.close();
  await active; await closing;
  assert.deepEqual(f.client.state.pending, saved);
  assert.equal(f.client.state.lastGameplayRequest.stage, 'response_uncertain');
  assert.equal(f.calls.filter(c => c.route === '/sortie').length, 1);
});
