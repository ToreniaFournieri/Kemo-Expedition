const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApiV1 } = require('../desktop/api-v1.cjs');

// SpecRef: 9.1.4.15 | Backup export, import, and reset | real HTTP-transport coverage
// `tests/apiV1Backup.test.cjs` covers the commit/authority/ApplicationApi layers against a real `invokeApplication`;
// this file drives the actual desktop HTTP server (`desktop/api-v1.cjs`) with a mock `invokeApplication`, so it is
// the real `readMultipart` parser and the raw-binary export response that are exercised, not a stand-in for them.

async function startServer(invokeApplication) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-backup-transport-'));
  const api = createApiV1({ allowEnable: true, connectionDirectory: directory, allowedOrigin: 'app://bokemo', invokeApplication });
  const settings = await api.enable();
  const descriptor = JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8'));
  const bootstrap = { Authorization: `Bearer ${descriptor.token}`, 'Content-Type': 'application/json' };
  const loginResponse = await fetch(`${descriptor.endpoint}/fundamental/logIn`, { method: 'POST', headers: bootstrap, body: JSON.stringify({ userId: 'Taro', environment: 'desktop', gameMode: 'normal' }) });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  const session = { Authorization: `Bearer ${descriptor.token}`, 'X-BoKemo-Session': login.data.sessionToken, 'X-BoKemo-Control-Lease': login.data.controlLeaseToken };
  return { api, directory, endpoint: descriptor.endpoint, session };
}

function multipartBody(metadata, fileParts) {
  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  for (const [name, bytes] of Object.entries(fileParts)) form.append(name, new Blob([bytes]), `${name}.bin`);
  return form;
}

test('backup/export: the raw-binary response carries the exact save payload and its own headers, not the JSON envelope', async t => {
  let revision = 7;
  const savePayload = 'compressed-save-payload-with-éè日本語-content';
  const { api, directory, endpoint, session } = await startServer(async (operationId, payload) => {
    if (operationId === 'fundamental/status') return { data: { systemStatus: 'ready', versionBuild: '0.0.0 (0)', environment: 'desktop' } };
    if (operationId === 'fundamental/logIn') return { revision, data: { userId: 'Taro', environment: 'desktop', gameMode: 'normal', levelOffsetForOrca: null }, identity: { userId: 'Taro' } };
    if (operationId === 'commit/setting/backup/export') return { previousRevision: revision, revision, data: { savePayload }, requestId: payload?.transport?.requestId };
    throw new Error(`unexpected ${operationId}`);
  });
  t.after(async () => { api.shutdown(); fs.rmSync(directory, { recursive: true, force: true }); });

  const response = await fetch(`${endpoint}/commit/setting/backup/export`, {
    method: 'POST', headers: { ...session, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: revision, idempotencyKey: crypto.randomUUID(), parameters: {} }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/octet-stream');
  assert.match(response.headers.get('content-disposition') ?? '', /attachment; filename="bokemo-backup\.bokemo"/);
  assert.equal(response.headers.get('x-bokemo-revision'), String(revision));
  assert.equal(response.headers.get('x-bokemo-schema-version'), '1');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.toString('utf8'), savePayload, 'the downloaded bytes are the UTF-8 encoding of the exact save payload the authority returned');
});

test('backup/import: real multipart upload reaches the authority with the exact uploaded bytes, and malformed multipart shapes are refused', async t => {
  let revision = 3;
  const received = [];
  const { api, directory, endpoint, session } = await startServer(async (operationId, payload) => {
    if (operationId === 'fundamental/status') return { data: { systemStatus: 'ready', versionBuild: '0.0.0 (0)', environment: 'desktop' } };
    if (operationId === 'fundamental/logIn') return { revision, data: { userId: 'Taro', environment: 'desktop', gameMode: 'normal', levelOffsetForOrca: null }, identity: { userId: 'Taro' } };
    if (operationId === 'commit/setting/backup/import') {
      received.push(payload);
      return { previousRevision: revision, revision: ++revision, data: { imported: true }, requestId: payload?.transport?.requestId };
    }
    throw new Error(`unexpected ${operationId}`);
  });
  t.after(async () => { api.shutdown(); fs.rmSync(directory, { recursive: true, force: true }); });

  const backupBytes = Buffer.from('a fake but non-empty backup payload, with some éè bytes', 'utf8');
  const happyPath = await fetch(`${endpoint}/commit/setting/backup/import`, {
    method: 'POST', headers: session,
    body: multipartBody({ expectedRevision: revision, idempotencyKey: crypto.randomUUID(), parameters: {} }, { backup: backupBytes }),
  });
  const happyBody = await happyPath.json();
  assert.equal(happyPath.status, 200, JSON.stringify(happyBody));
  assert.deepEqual(happyBody.data, { imported: true });
  assert.equal(received.length, 1);
  const uploaded = received[0].uploadedFiles.backup;
  assert.equal(Buffer.from(uploaded.contentBase64, 'base64').toString('utf8'), backupBytes.toString('utf8'), 'the authority receives exactly the uploaded bytes, base64-encoded');
  assert.equal(uploaded.byteLength, backupBytes.length);

  // No file part at all: readMultipart's single-file requirement for this operation rejects before the authority sees it.
  const noFile = await fetch(`${endpoint}/commit/setting/backup/import`, {
    method: 'POST', headers: session,
    body: multipartBody({ expectedRevision: revision, idempotencyKey: crypto.randomUUID(), parameters: {} }, {}),
  });
  assert.equal(noFile.status, 400);
  assert.equal((await noFile.json()).error.code, 'invalid_request');

  // A second, unexpected file part alongside `backup` is also rejected (exactly one file is allowed).
  const extraFile = await fetch(`${endpoint}/commit/setting/backup/import`, {
    method: 'POST', headers: session,
    body: multipartBody({ expectedRevision: revision, idempotencyKey: crypto.randomUUID(), parameters: {} }, { backup: backupBytes, extra: Buffer.from('unexpected') }),
  });
  assert.equal(extraFile.status, 400);
  assert.equal((await extraFile.json()).error.code, 'invalid_request');

  // A malformed multipart body (JSON instead of multipart/form-data) never reaches the file parser at all.
  const wrongContentType = await fetch(`${endpoint}/commit/setting/backup/import`, {
    method: 'POST', headers: { ...session, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: revision, idempotencyKey: crypto.randomUUID(), parameters: {} }),
  });
  assert.equal(wrongContentType.status, 415);

  assert.equal(received.length, 1, 'none of the three rejected requests ever reached the authority');
});

test('backup/import: a confirmed import closes every open popup stream synchronously, exactly like reset', async t => {
  let revision = 0;
  const { api, directory, endpoint, session } = await startServer(async (operationId, payload) => {
    if (operationId === 'fundamental/status') return { data: { systemStatus: 'ready', versionBuild: '0.0.0 (0)', environment: 'desktop' } };
    if (operationId === 'fundamental/logIn') return { revision, data: { userId: 'Taro', environment: 'desktop', gameMode: 'normal', levelOffsetForOrca: null }, identity: { userId: 'Taro' } };
    if (operationId === 'commit/setting/backup/import') return { previousRevision: revision, revision: ++revision, data: { imported: true }, requestId: payload?.transport?.requestId };
    if (operationId === 'read/observation/popupEventStream') return { revision, data: { events: [] } };
    throw new Error(`unexpected ${operationId}`);
  });
  t.after(async () => { api.shutdown(); fs.rmSync(directory, { recursive: true, force: true }); });

  const stream = await fetch(`${endpoint}/read/observation/popupEventStream`, { headers: session });
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();

  const importResponse = await fetch(`${endpoint}/commit/setting/backup/import`, {
    method: 'POST', headers: session,
    body: multipartBody({ expectedRevision: revision, idempotencyKey: crypto.randomUUID(), parameters: {} }, { backup: Buffer.from('backup-bytes', 'utf8') }),
  });
  assert.equal(importResponse.status, 200, await importResponse.text());

  let framed = '';
  while (!framed.includes('\n\n')) {
    const { value, done } = await reader.read();
    if (done) break;
    framed += decoder.decode(value, { stream: true });
  }
  assert.match(framed, /^event: resyncRequired\n/, 'import closes the open stream synchronously in the same request, not on the next poll tick');
  const trailing = await reader.read();
  assert.equal(trailing.done, true, 'the stream ends after resyncRequired');
});
