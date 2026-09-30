const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApiV1 } = require('../desktop/api-v1.cjs');

// SpecRef: 9.1.4.8 | Popup event stream | push, reconnect/replay, and fencing lifecycle coverage (Stage 7 D4).

function makeEvent(revision, sequence) {
  return {
    apiVersion: 'v1', schemaVersion: 1, revision, sequence, eventId: `${revision}:${sequence}`,
    eventKey: 'popup.itemDrop', args: {}, partyNumber: 1, diaryEntryId: null, groupKey: null,
    createdAt: new Date(0).toISOString(),
  };
}

// Reads the SSE body one blank-line-terminated frame at a time, buffering partial reads across calls.
function createFrameReader(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';
  return {
    async next() {
      while (!buffered.includes('\n\n')) {
        const { value, done } = await reader.read();
        if (done) { const rest = buffered || null; buffered = ''; return rest; }
        buffered += decoder.decode(value, { stream: true });
      }
      const splitAt = buffered.indexOf('\n\n') + 2;
      const frame = buffered.slice(0, splitAt);
      buffered = buffered.slice(splitAt);
      return frame;
    },
    async cancel() { try { await reader.cancel(); } catch { /* already closed */ } },
  };
}

test('SSE popup event stream: push, reconnect replay, resync, and lifecycle fencing', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-sse-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let revision = 0;
  let popupEvents = [];
  const api = createApiV1({
    allowEnable: true,
    connectionDirectory: directory,
    allowedOrigin: 'app://bokemo',
    invokeApplication: async (operationId, payload) => {
      if (operationId === 'fundamental/status') return { data: { systemStatus: 'ready', versionBuild: '0.0.0 (0)', environment: 'desktop' } };
      if (operationId === 'fundamental/logIn') return { revision, data: { userId: 'Taro', environment: 'desktop', gameMode: 'normal', levelOffsetForOrca: null }, identity: { userId: 'Taro' } };
      if (operationId === 'fundamental/logOut') return { revision, data: { finalPersistedRevision: revision } };
      if (operationId === 'commit/setting/backup/reset') {
        popupEvents = [];
        return { previousRevision: revision, revision: ++revision, data: {} };
      }
      if (operationId === 'read/observation/popupEventStream') {
        // Mirrors src/api/v1/applicationApi.ts: no cursor means "from the beginning of the retained buffer" — it is
        // the transport layer's job to decide what a fresh connect actually replays to the client.
        const lastEventId = payload?.transport?.lastEventId ?? null;
        const start = lastEventId ? popupEvents.findIndex(event => event.eventId === lastEventId) : -1;
        if (lastEventId && start < 0) return { status: 400, revision, error: { code: 'invalid_cursor', message: 'The popup replay cursor is unavailable.' } };
        return { revision, data: { events: popupEvents.slice(start + 1) } };
      }
      throw new Error(`unexpected ${operationId}`);
    },
  });
  t.after(() => api.shutdown());
  const settings = await api.enable();
  const descriptor = JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8'));
  const bootstrap = { Authorization: `Bearer ${descriptor.token}`, 'Content-Type': 'application/json' };

  const loginResponse = await fetch(`${descriptor.endpoint}/fundamental/logIn`, { method: 'POST', headers: bootstrap, body: JSON.stringify({ userId: 'Taro', environment: 'desktop', gameMode: 'normal' }) });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  const session = { Authorization: `Bearer ${descriptor.token}`, 'X-BoKemo-Session': login.data.sessionToken, 'X-BoKemo-Control-Lease': login.data.controlLeaseToken };

  // A first connection without Last-Event-ID starts after the current boundary: an event already in the buffer before
  // connecting must never be replayed, only events produced after connecting are delivered.
  popupEvents = [makeEvent(1, 1)];
  const freshConnect = await fetch(`${descriptor.endpoint}/read/observation/popupEventStream`, { headers: session });
  assert.equal(freshConnect.status, 200);
  assert.match(freshConnect.headers.get('content-type') ?? '', /text\/event-stream/);
  const freshReader = createFrameReader(freshConnect);

  // Push (not the 1-second poll backstop): notifyPopupActivity() delivers a brand-new event immediately.
  popupEvents.push(makeEvent(2, 1));
  api.notifyPopupActivity();
  const pushed = await freshReader.next();
  assert.match(pushed, /^id: 2:1\nevent: popup\n/, 'the pre-existing event is not replayed; only the new one is pushed');
  await freshReader.cancel();

  // Reconnecting with Last-Event-ID resumes exactly after that cursor: no gap, no duplicate of what was already seen.
  popupEvents.push(makeEvent(3, 1));
  const reconnect = await fetch(`${descriptor.endpoint}/read/observation/popupEventStream`, { headers: { ...session, 'Last-Event-ID': '2:1' } });
  assert.equal(reconnect.status, 200);
  const reconnectReader = createFrameReader(reconnect);
  const resumed = await reconnectReader.next();
  assert.match(resumed, /^id: 3:1\nevent: popup\n/, 'replay resumes exactly after the supplied cursor, with no duplicate of 2:1');

  // A cursor that is no longer valid discovered on a later push/poll tick emits resyncRequired and ends the stream.
  popupEvents = [];
  api.notifyPopupActivity();
  const resyncFrame = await reconnectReader.next();
  assert.match(resyncFrame, /^event: resyncRequired\n/);
  assert.equal(await reconnectReader.next(), null, 'the stream ends after resyncRequired');

  // An initial connect with an unknown/invalid Last-Event-ID never upgrades to SSE; it is a plain JSON error.
  popupEvents = [makeEvent(4, 1)];
  const invalidConnect = await fetch(`${descriptor.endpoint}/read/observation/popupEventStream`, { headers: { ...session, 'Last-Event-ID': 'nonexistent-cursor' } });
  assert.equal(invalidConnect.status, 400);
  assert.doesNotMatch(invalidConnect.headers.get('content-type') ?? '', /text\/event-stream/);
  assert.equal((await invalidConnect.json()).error.code, 'invalid_cursor');

  // A confirmed reset atomically fences the popup buffer; the open stream closes synchronously with the reset's own
  // HTTP response, not on the next poll tick.
  const stillOpen = await fetch(`${descriptor.endpoint}/read/observation/popupEventStream`, { headers: session });
  assert.equal(stillOpen.status, 200);
  const stillOpenReader = createFrameReader(stillOpen);
  const resetResponse = await fetch(`${descriptor.endpoint}/commit/setting/backup/reset`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: revision, idempotencyKey: crypto.randomUUID(), parameters: {} }) });
  assert.equal(resetResponse.status, 200);
  const fencedFrame = await stillOpenReader.next();
  assert.match(fencedFrame, /^event: resyncRequired\n/, 'reset closes the stream immediately, without waiting for a poll tick');
  assert.equal(await stillOpenReader.next(), null);

  // Logout closes any remaining open stream.
  popupEvents = [makeEvent(5, 1)];
  const loggedInStream = await fetch(`${descriptor.endpoint}/read/observation/popupEventStream`, { headers: session });
  assert.equal(loggedInStream.status, 200);
  const loggedInReader = createFrameReader(loggedInStream);
  const logoutResponse = await fetch(`${descriptor.endpoint}/fundamental/logOut`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(logoutResponse.status, 200);
  assert.match(await loggedInReader.next(), /^event: resyncRequired\n/);
  assert.equal(await loggedInReader.next(), null, 'logout ends the stream');
});

test('SSE popup event stream: shutdown closes every open stream', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-sse-shutdown-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const api = createApiV1({
    allowEnable: true,
    connectionDirectory: directory,
    allowedOrigin: 'app://bokemo',
    invokeApplication: async (operationId) => {
      if (operationId === 'fundamental/status') return { data: { systemStatus: 'ready', versionBuild: '0.0.0 (0)', environment: 'desktop' } };
      if (operationId === 'fundamental/logIn') return { revision: 0, data: { userId: 'Taro', environment: 'desktop', gameMode: 'normal', levelOffsetForOrca: null }, identity: { userId: 'Taro' } };
      if (operationId === 'fundamental/logOut') return { revision: 0, data: { finalPersistedRevision: 0 } };
      if (operationId === 'read/observation/popupEventStream') return { revision: 0, data: { events: [] } };
      throw new Error(`unexpected ${operationId}`);
    },
  });
  const settings = await api.enable();
  const descriptor = JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8'));
  const bootstrap = { Authorization: `Bearer ${descriptor.token}`, 'Content-Type': 'application/json' };
  const loginResponse = await fetch(`${descriptor.endpoint}/fundamental/logIn`, { method: 'POST', headers: bootstrap, body: JSON.stringify({ userId: 'Taro', environment: 'desktop', gameMode: 'normal' }) });
  const login = await loginResponse.json();
  const session = { Authorization: `Bearer ${descriptor.token}`, 'X-BoKemo-Session': login.data.sessionToken, 'X-BoKemo-Control-Lease': login.data.controlLeaseToken };
  const stream = await fetch(`${descriptor.endpoint}/read/observation/popupEventStream`, { headers: session });
  assert.equal(stream.status, 200);
  const reader = createFrameReader(stream);
  await api.shutdown();
  assert.match(await reader.next(), /^event: resyncRequired\n/);
  assert.equal(await reader.next(), null, 'shutdown ends every open stream');
});
