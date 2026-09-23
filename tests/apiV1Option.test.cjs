const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApiV1 } = require('../desktop/api-v1.cjs');

// SpecRef: 8.6 | UI_SETTING | API option (`Application API v1`, `secretToken`, `persistSecretToken`)
// SpecRef: 9.1.4.6 | HTTP authentication and exclusive control (Stage 9.6)

const status = { data: { systemStatus: 'ready', versionBuild: '0.0.0 (0)', environment: 'desktop' } };
const help = { data: { overview: 'OVERVIEW', endpoints: 'ENDPOINTS' } };
const invokeApplication = async (operationId) => {
  if (operationId === 'fundamental/status') return status;
  if (operationId === 'help/overview') return { data: { requirements: 'REQUIREMENTS' } };
  if (operationId === 'help/endpoints') return { data: { detail: 'DETAIL' } };
  return help;
};
const create = (directory, extra = {}) => createApiV1({ allowEnable: true, connectionDirectory: directory, allowedOrigin: 'app://bokemo', invokeApplication, ...extra });
const settingsFile = (directory) => path.join(directory, 'api-v1-settings.json');
const readStored = (directory) => JSON.parse(fs.readFileSync(settingsFile(directory), 'utf8'));
const descriptor = (settings) => JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8'));

function tempDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-option-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('the option is remembered across launches and the kept token is reused', async t => {
  const directory = tempDirectory(t);
  const first = create(directory);
  assert.deepEqual([first.getSettings().enabled, first.getSettings().persistSecretToken], [false, true], 'off by default; the token is kept by default');
  const enabled = await first.enable();
  assert.equal('token' in enabled || 'secretToken' in enabled, false, 'settings never carry the token');
  const token = first.revealSecretToken();
  assert.match(token, /^[A-Za-z0-9_-]{43,}$/, 'at least 256 bits, URL-safe');
  assert.equal(descriptor(enabled).token, token, 'the connection file carries the same token');
  assert.deepEqual(readStored(directory), { enabled: true, persistSecretToken: true, secretToken: token });
  assert.equal(fs.statSync(settingsFile(directory)).mode & 0o777, 0o600, 'owner-only settings file');
  await first.shutdown();
  assert.equal(readStored(directory).enabled, true, 'quitting keeps the option on');

  const second = create(directory);
  const restored = await second.restore();
  t.after(() => second.shutdown());
  assert.equal(restored.enabled, true, 'a remembered "on" starts the listener at launch');
  assert.equal(second.revealSecretToken(), token, 'the kept token is reused');
  assert.equal(descriptor(restored).token, token);
});

test('without persistSecretToken each launch gets a new token, and switching takes effect as specified', async t => {
  const directory = tempDirectory(t);
  const first = create(directory);
  await first.enable();
  const token = first.revealSecretToken();
  first.setPersistSecretToken(false);
  assert.equal('secretToken' in readStored(directory), false, 'turning it off deletes the stored token at once');
  assert.equal(first.revealSecretToken(), token, 'the current token stays valid until exit');
  await first.shutdown();

  const second = create(directory);
  await second.restore();
  const fresh = second.revealSecretToken();
  assert.notEqual(fresh, token, 'a new token on the next launch');
  second.setPersistSecretToken(true);
  assert.equal(readStored(directory).secretToken, fresh, 'turning it on stores the current token');
  await second.shutdown();

  const third = create(directory);
  t.after(() => third.shutdown());
  await third.restore();
  assert.equal(third.revealSecretToken(), fresh);
});

test('disabling resets the token and is remembered; enabling again creates a new one', async t => {
  const directory = tempDirectory(t);
  const api = create(directory);
  t.after(() => api.shutdown());
  await api.enable();
  const token = api.revealSecretToken();
  const disabled = await api.disable();
  assert.equal(disabled.enabled, false);
  assert.equal(api.revealSecretToken(), null, 'nothing to reveal while off');
  assert.deepEqual(readStored(directory), { enabled: false, persistSecretToken: true });
  assert.equal(fs.existsSync(path.join(directory, 'api-v1-connection.json')), false, 'the connection file is removed');
  const restarted = create(directory);
  assert.equal((await restarted.restore()).enabled, false, 'a remembered "off" stays off at launch');
  await api.enable();
  assert.notEqual(api.revealSecretToken(), token, 'enabling again creates a new token');
});

test('restore never starts the listener where the API is not available', async t => {
  const directory = tempDirectory(t);
  const available = create(directory);
  await available.enable();
  await available.shutdown();
  const unavailable = create(directory, { allowEnable: false });
  const settings = await unavailable.restore();
  assert.deepEqual([settings.supported, settings.enabled], [false, false]);
});

test('the token never appears in settings, logs, URLs, or HTTP responses, and the listener is loopback-only', async t => {
  const directory = tempDirectory(t);
  const logged = [];
  const original = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  for (const name of Object.keys(original)) console[name] = (...args) => { logged.push(args.map(String).join(' ')); };
  t.after(() => Object.assign(console, original));
  const api = create(directory);
  t.after(() => api.shutdown());
  const settings = await api.enable();
  const token = api.revealSecretToken();
  const { endpoint } = descriptor(settings);
  assert.match(endpoint, /^http:\/\/127\.0\.0\.1:\d+\/api\/v1$/, 'loopback-only listener');
  assert.equal(endpoint.includes(token), false, 'not in the endpoint URL');
  assert.equal(JSON.stringify(api.getSettings()).includes(token), false, 'not in settings');

  const bodies = [];
  for (const route of ['fundamental/status', 'help/overview', 'help/endpoints']) bodies.push(await (await fetch(`${endpoint}/${route}`, { headers: { Connection: 'close' } })).text());
  // Authenticated and rejected requests, including a wrong token and an invalid body.
  bodies.push(await (await fetch(`${endpoint}/fundamental/logIn`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Connection: 'close' }, body: '{"unknown":true}' })).text());
  bodies.push(await (await fetch(`${endpoint}/fundamental/logIn`, { method: 'POST', headers: { Authorization: `Bearer ${token}x`, 'Content-Type': 'application/json', Connection: 'close' }, body: '{}' })).text());
  bodies.push(await (await fetch(`${endpoint}/read/observation`, { headers: { Authorization: `Bearer ${token}`, Connection: 'close' } })).text());
  for (const body of bodies) assert.equal(body.includes(token), false, `a response leaked the token: ${body.slice(0, 120)}`);

  api.setPersistSecretToken(false);
  api.setPersistSecretToken(true);
  await api.disable();
  assert.equal(logged.some((line) => line.includes(token)), false, 'not in any log line');
});

test('only the API panel and the desktop bridge touch the token; no retired endpoint remains', () => {
  // Tracked and new (untracked, not ignored) files, except this test, which names the patterns it searches for.
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src', 'desktop', 'scripts', 'tests', 'package.json', 'index.html'], { encoding: 'utf8' })
    .split('\n').filter((file) => file && file !== 'tests/apiV1Option.test.cjs');
  const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
  const revealers = tracked.filter((file) => /\.(ts|tsx|cjs|mjs|js)$/.test(file) && read(file).includes('revealApiV1SecretToken'));
  assert.deepEqual(revealers.sort(), ['desktop/preload.cjs', 'src/components/ApiV1Settings.tsx', 'src/vite-env.d.ts'].sort());
  const panel = read('src/components/ApiV1Settings.tsx');
  assert.doesNotMatch(panel, /(?:local|session)Storage|indexedDB/, 'the revealed token is never stored by the renderer');

  // SpecRef: 9.1.4 | Cutover: no runtime route, alias, script, or test references the retired endpoint. The retired
  // evaluation reports (`AI_play_report/`) and the outdated Playing Guide are inert documents and are not searched.
  const retired = [['/experimental', '/v1'].join(''), ['experimental', '-api'].join(''), ['ai-play', '.cjs'].join(''), ['--ai', '-play'].join('')];
  const offenders = tracked.filter((file) => /\.(ts|tsx|cjs|mjs|js|json|html)$/.test(file) && retired.some((needle) => read(file).includes(needle)));
  assert.deepEqual(offenders, [], `retired endpoint references: ${offenders.join(', ')}`);
});
