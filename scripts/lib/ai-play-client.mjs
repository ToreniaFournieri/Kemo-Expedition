// SpecRef: 12.2 | AI Play Operator Guide | Reference client
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

const terminal = e => e && e.status !== 'active';
const identity = e => Object.fromEntries(['evaluationId', 'version', 'build', 'mode', 'rulesId', 'regulationVersion'].map(k => [k, e[k]]));
const readPaths = /^\/(observation|catalog|diary-entries|parties\/\d+\/battle-log\/latest|diary-entries\/[A-Za-z0-9_-]+\/battle-log)$/;
export function sanitize(value, secrets = []) {
  if (typeof value === 'string') return secrets.filter(Boolean).reduce((s, secret) => s.replaceAll(secret, '[redacted]'), value);
  if (Array.isArray(value)) return value.map(v => sanitize(v, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([k]) => !/^(token|authorization|bearer|leaseToken|replayMetadata|seedHex|randomDrawCount)$/i.test(k))
    .map(([k, v]) => [k, sanitize(v, secrets)]));
  return value;
}
export function compactResponse(data, previous = []) {
  const parties = data.observation?.parties ?? (data.party ? [data.party] : data.configuration?.characters ? [data.configuration] : []);
  return {
    evaluation: data.evaluation, revision: data.observation?.revision ?? data.revision ?? data.sortie?.revision,
    error: data.error, reportPath: data.reportPath, reportError: data.reportError,
    runtime: data.runtime, control: data.control, release: data.release,
    comparison: data.comparison, simulation: data.simulation, outcomes: data.outcomes, totals: data.totals,
    returnReasons: data.runs?.reduce((counts, r) => { const k = r.returnReason ?? 'unknown'; counts[k] = (counts[k] ?? 0) + 1; return counts; }, {}),
    parties: parties.map(p => {
      const old = previous.find(x => x.id === p.id);
      return { id: p.id, level: p.level, experience: p.experience, experienceToNext: p.experienceToNext,
        change: old ? { level: p.level - old.level, experience: p.experience - old.experience, condition: p.condition?.value - old.condition?.value } : undefined,
        hp: p.hp, condition: p.condition, deityId: p.deityId, expedition: p.expedition, latestExpedition: p.latestExpedition,
        characters: p.characters?.map(c => { const before = old?.characters?.find(x => x.id === c.id);
          return { id: c.id, row: c.row, build: c.build, autoEquipmentMode: c.autoEquipmentMode, computed: c.computed,
            equipmentChanges: before ? (c.equipment ?? []).flatMap((slot, i) => JSON.stringify(slot) === JSON.stringify(before.equipment?.[i]) ? [] : [{ slotIndex: slot.slotIndex ?? i, before: before.equipment?.[i] ?? null, after: slot }]) : undefined };
        }) };
    }),
  };
}

export class AiPlayClient {
  constructor({ connection, directory, fetchImpl = fetch, timeoutMs = 120000, releaseTimeoutMs = 5000, onEvent = () => {} }) {
    const url = new URL(connection.endpoint);
    if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/experimental/v1' || url.search || url.hash || url.username || url.password)
      throw new Error('Connection must use the official loopback /experimental/v1 endpoint.');
    if (!connection.token || !connection.evaluationId) throw new Error('Invalid connection handoff.');
    this.connection = connection; this.fetch = fetchImpl; this.timeoutMs = timeoutMs;
    this.releaseTimeoutMs = releaseTimeoutMs; this.onEvent = onEvent;
    this.directory = resolve(directory); mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    this.lockPath = join(this.directory, 'client.lock');
    this.lock = openSync(this.lockPath, 'wx', 0o600);
    try {
      writeFileSync(this.lock, String(process.pid));
      this.statePath = join(this.directory, 'client-state.json');
      this.state = existsSync(this.statePath) ? JSON.parse(readFileSync(this.statePath, 'utf8')) : { sequence: 0, pending: null };
      if (this.state.identity && this.state.identity.evaluationId !== connection.evaluationId) throw new Error('Client directory belongs to another evaluation.');
    } catch (error) { closeSync(this.lock); unlinkSync(this.lockPath); throw error; }
    this.lease = null; this.tail = Promise.resolve(); this.parties = []; this.closed = false;
    this.stopping = false; this.closePromise = null; this.inFlight = null;
    this.journalPath = join(this.directory, 'requests.jsonl');
  }
  save() {
    const temp = this.statePath + '.tmp';
    writeFileSync(temp, JSON.stringify(this.state, null, 2) + '\n', { mode: 0o600 });
    renameSync(temp, this.statePath);
  }
  serialize(fn) {
    const next = this.tail.then(() => { if (this.closed || this.stopping) throw new Error('Client is shutting down; queued action discarded.'); return fn(); });
    this.tail = next.catch(() => {}); return next;
  }
  emit(event) {
    try { this.onEvent(sanitize(event, [this.connection.token, this.lease])); } catch { /* Logging cannot change request outcome. */ }
  }
  progress(request, stage, extra = {}) {
    const event = { event: 'request_progress', ...request, stage, at: Date.now(), ...extra };
    appendFileSync(this.journalPath, JSON.stringify(event) + '\n', { mode: 0o600 });
    if (request.gameplay) { this.state.lastGameplayRequest = event; this.save(); }
    if ((request.gameplay && stage !== 'response_received') || stage === 'response_uncertain') this.emit(event);
  }
  beginShutdown(reason = 'close') {
    if (this.stopping) return;
    this.stopping = true;
    this.emit({ event: 'shutdown_started', reason, pid: process.pid, queuedActions: 'discarded' });
    if (this.inFlight) this.emit({ event: 'waiting_for_request', requestId: this.inFlight.requestId,
      path: this.inFlight.path, message: 'Waiting for the outstanding response or its timeout; no further renewal will be sent.' });
  }
  async request(path, body, key, timeoutMs = this.timeoutMs) {
    if (this.stopping && path !== '/control/release') throw new Error('Client is shutting down; request not dispatched.');
    const headers = { Authorization: `Bearer ${this.connection.token}` };
    if (this.lease) headers['X-BoKemo-Control-Lease'] = this.lease;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (key) headers['Idempotency-Key'] = key;
    const request = { requestId: randomUUID(), path,
      gameplay: !['/status', '/evaluation', '/evaluation/report', '/evaluation/ledger', '/control/acquire', '/control/renew', '/control/release'].includes(path),
      countedApiCallsBefore: this.state.evaluation?.countedApiCalls ?? null };
    this.progress(request, 'dispatching'); // Intent recorded before fetch; this does not prove server acceptance.
    this.inFlight = request;
    let response, data;
    try {
      response = await this.fetch(this.connection.endpoint + path, { method: body === undefined ? 'GET' : 'POST', headers,
        body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
      data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response');
    } catch {
      this.progress(request, 'response_uncertain', { recovery: 'Read /evaluation and /evaluation/ledger; no response does not mean uncounted. Pending mutations retain their exact retry request.' });
      throw new Error('Response uncertain. Check evaluation and ledger for accounting; pending mutations are preserved for explicit retry.');
    } finally { this.inFlight = null; }
    this.progress(request, 'response_received', { status: response.status });
    if (path === '/control/acquire' && response.ok) this.lease = data.lease?.token;
    if (path === '/control/release' && response.ok) this.lease = null;
    const safe = sanitize(data, [this.connection.token, this.lease]);
    if (safe.evaluation) {
      const nextIdentity = identity(safe.evaluation);
      if (safe.evaluation.evaluationId !== this.connection.evaluationId || (this.state.identity && JSON.stringify(this.state.identity) !== JSON.stringify(nextIdentity)))
        throw new Error('Evaluation identity changed. Stop and preserve the checkpoint.');
      this.state.identity = nextIdentity; this.state.evaluation = safe.evaluation;
    }
    const revision = safe.observation?.revision ?? safe.revision ?? safe.sortie?.revision ?? safe.runtime?.revision;
    // A receipt replay may contain an older observation. Refresh revision through status before a new mutation.
    if (Number.isInteger(revision)) this.state.revision = Math.max(this.state.revision ?? 0, revision);
    const sequence = ++this.state.sequence;
    this.save(); // Reserve artifact number before writing, including across interruption.
    const artifact = join(this.directory, `${String(sequence).padStart(6, '0')}.json`);
    writeFileSync(artifact, JSON.stringify({ path, status: response.status, response: safe }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    this.save();
    this.progress(request, 'response_saved', { status: response.status, artifact, countedApiCallsAfter: safe.evaluation?.countedApiCalls ?? null });
    if (key && response.ok && !Number.isInteger(revision))
      throw new Error('Mutation response lacks a revision. Pending request preserved; check evaluation, then retry if active.');
    const summary = compactResponse(safe, this.parties);
    if (safe.observation?.parties) this.parties = safe.observation.parties;
    return { ok: response.ok, status: response.status, data: safe, summary: { ...summary, artifact } };
  }
  async checked(path, body) {
    const r = await this.request(path, body);
    if (!r.ok) throw new Error(`API ${r.data.error?.code ?? r.status}; see ${r.summary.artifact}`);
    return r;
  }
  async ensureLease() {
    const s = await this.checked('/status');
    if (s.data.runtime?.status !== 'ready') throw new Error('Runtime not ready. Use status and wait.');
    if (this.lease) {
      const r = await this.request('/control/renew', {});
      if (r.ok) return;
      if (!['no_active_lease', 'control_lease_expired'].includes(r.data.error?.code)) throw new Error(`Lease renewal failed: ${r.data.error?.code}`);
      this.lease = null;
    }
    await this.checked('/control/acquire', { client: { name: 'BoKemo reference client', version: '1' } });
    if (!this.lease) throw new Error('Acquisition did not return a lease.');
  }
  connect() { return this.serialize(async () => {
    const result = await this.checked('/evaluation');
    if (!result.data.evaluation) throw new Error('Reference client requires an AI Play evaluation.');
    if (!terminal(this.state.evaluation)) await this.ensureLease();
    return result.summary;
  }); }
  renew() { return this.serialize(async () => {
    if (!terminal(this.state.evaluation) && this.lease) await this.ensureLease();
  }); }
  run(input) { return this.serialize(async () => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Provide one JSON action object.');
    const { action } = input;
    if (['status', 'evaluation', 'report', 'ledger', 'release'].includes(action)) {
      const paths = { status: '/status', evaluation: '/evaluation', report: '/evaluation/report', ledger: '/evaluation/ledger', release: '/control/release' };
      return (await this.request(paths[action], action === 'release' ? {} : undefined)).summary;
    }
    // Exempt check prevents sending gameplay after an uncertain winning response or reconnect.
    await this.checked('/evaluation');
    if (terminal(this.state.evaluation)) throw new Error('Evaluation finished. Use report, evaluation, ledger or release.');
    if (this.state.pending && action !== 'retry') throw new Error('Uncertain mutation pending. Use retry; do not issue a new gameplay request.');
    const partyId = input.partyId ?? 1;
    if (!Number.isInteger(partyId) || partyId < 1) throw new Error('partyId must be a positive integer.');
    let path, body, mutation = false;
    if (action === 'retry') {
      if (!this.state.pending) throw new Error('No uncertain mutation to retry.');
    } else if (action === 'observe') path = '/observation';
    else if (action === 'read') {
      if (!readPaths.test(input.path)) throw new Error('Unsupported read path.');
      path = input.path;
    } else if (['preview', 'simulate', 'configure'].includes(action)) {
      if (!input.configuration || typeof input.configuration !== 'object' || Array.isArray(input.configuration)) throw new Error('configuration object required.');
      path = { preview: '/party-preview', simulate: '/simulation', configure: '/command' }[action];
      mutation = action === 'configure';
      body = mutation ? { command: { type: 'configure_party', partyId, configuration: input.configuration } } : { partyId, configuration: input.configuration };
    } else if (action === 'build-options') { path = '/build-options'; body = { ...input.body }; }
    else if (action === 'sortie') {
      if (!Number.isInteger(input.count) || input.count < 1 || input.count > 100) throw new Error('count must be an explicit integer from 1 to 100.');
      path = '/sortie'; body = { partyId, count: input.count }; mutation = true;
    } else throw new Error('Unknown action. Use observe, read, build-options, preview, simulate, configure, sortie, retry, status, evaluation, report, ledger or release.');
    await this.ensureLease();
    if (action === 'retry') ({ path, body } = this.state.pending);
    else if (body) {
      if (!Number.isInteger(this.state.revision)) throw new Error('Current revision unavailable.');
      body[mutation ? 'expectedRevision' : 'revision'] = this.state.revision;
    }
    if (mutation) {
      this.state.pending = { path, body, key: randomUUID() };
      this.save(); // Durable before dispatch; credentials are never journaled.
    }
    const r = await this.request(path, body, this.state.pending?.key);
    if (mutation || action === 'retry') {
      // Keep ambiguous infrastructure failures and key conflicts blocked for explicit recovery.
      if (r.status < 500 && r.data.error?.code !== 'idempotency_conflict') this.state.pending = null;
      this.save();
    }
    return { ...r.summary, pendingMutation: Boolean(this.state.pending) };
  }); }
  close() {
    this.beginShutdown();
    if (this.closePromise) return this.closePromise;
    this.closePromise = (async () => {
      await this.tail; // In-flight request settles; queued work observes stopping and cannot dispatch.
      let result;
      try {
        if (this.lease) {
          this.emit({ event: 'releasing_control' });
          const response = await this.request('/control/release', {}, undefined, this.releaseTimeoutMs);
          if (response.ok && response.data.release?.statePersisted === true) {
            result = { event: 'control_released', statePersisted: true };
          } else if (['no_active_lease', 'control_lease_expired'].includes(response.data.error?.code)) {
            result = { event: 'control_inactive', message: 'The server reports no active owned lease.' };
          } else throw new Error(`Release not confirmed (${response.data.error?.code ?? response.status}). Check authenticated status; a busy server operation may still pin the lease.`);
        } else result = { event: 'no_client_lease', message: 'No lease token held by this client; this does not prove the server has no active lease.' };
        this.emit(result);
        return result;
      } catch (error) {
        this.emit({ event: 'release_unconfirmed', message: error.message });
        throw error;
      } finally {
        this.closed = true; this.lease = null; closeSync(this.lock); unlinkSync(this.lockPath);
        this.emit({ event: 'client_closed', pid: process.pid, journal: this.journalPath });
      }
    })();
    return this.closePromise;
  }
}
