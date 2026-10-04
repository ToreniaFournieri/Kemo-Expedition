// Minimal BoKemo API v1 client. Every HTTP attempt is appended to calls.jsonl (no credentials).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const runDir = process.env.BK_RUN_DIR || path.resolve(here, '..');
const privDir = process.env.BK_PRIVATE || '/tmp/bk';
const descriptor = JSON.parse(fs.readFileSync(path.join(privDir, 'desc.json'), 'utf8'));
const statePath = path.join(privDir, 'state.json');
const USER = process.env.BK_USER || 'ClaudeSortie1003';

export class Client {
  constructor() {
    this.s = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { calls: 0, revision: null };
  }
  save() { fs.writeFileSync(statePath, JSON.stringify(this.s), { mode: 0o600 }); }
  async http(route, parameters = {}, { label = '', raw = false } = {}) {
    const commit = route.startsWith('/commit/');
    const post = commit || (route.startsWith('/fundamental/') && route !== '/fundamental/status') || route.endsWith('/simulationRun');
    const body = post ? (commit ? { expectedRevision: this.s.revision, idempotencyKey: crypto.randomUUID(), parameters } : parameters) : undefined;
    const qs = !post ? new URLSearchParams(Object.entries(parameters).map(([k, v]) => [k, String(v)])).toString() : '';
    const headers = { Authorization: 'Bearer ' + descriptor.token };
    if (post) headers['Content-Type'] = 'application/json';
    if (this.s.session) { headers['X-BoKemo-Session'] = this.s.session; headers['X-BoKemo-Control-Lease'] = this.s.lease; }
    const t0 = performance.now();
    const startedAt = new Date().toISOString();
    let status = 0, json = null, buf = null, revHeader = null;
    try {
      const res = await fetch(descriptor.endpoint + route + (qs ? '?' + qs : ''), { method: post ? 'POST' : 'GET', headers, body: post ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(300000) });
      status = res.status;
      revHeader = res.headers.get('x-bokemo-revision');
      if (raw && res.ok) buf = Buffer.from(await res.arrayBuffer());
      else { const t = await res.text(); try { json = JSON.parse(t); } catch { json = { raw: t.slice(0, 500) }; } }
    } catch (e) { json = { error: { code: 'transport', message: String(e) } }; }
    const ms = Math.round(performance.now() - t0);
    this.s.calls++;
    if (json && typeof json.revision === 'number') this.s.revision = json.revision;
    if (revHeader) this.s.revision = Number(revHeader);
    const igt = json?.data?.inGameTime; if (igt) this.s.inGameTime = igt;
    this.s.lastCallAt = Date.now();
    this.save();
    const rec = { n: this.s.calls, t: startedAt, label, method: post ? 'POST' : 'GET', route, parameters, status, ms, revision: this.s.revision, inGameTime: this.s.inGameTime ?? null, error: json?.error?.code ?? null };
    fs.appendFileSync(path.join(runDir, 'calls.jsonl'), JSON.stringify(rec) + '\n');
    process.stderr.write(`#${rec.n} ${route} ${status} ${ms}ms${rec.error ? ' ERR ' + rec.error : ''}\n`);
    return { status, json, buf };
  }
  async login() {
    const r = await this.http('/fundamental/logIn', { userId: USER, environment: 'prod', gameMode: 'normal', headless: true }, { label: 'login' });
    if (r.status === 200) { this.s.session = r.json.data.sessionToken; this.s.lease = r.json.data.controlLeaseToken; this.save(); }
    return r;
  }
  async call(route, parameters = {}, opts = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await this.http(route, parameters, opts);
      const code = r.json?.error?.code;
      if (r.status === 401 && ['control_lease_expired', 'login_required', 'session_expired', 'invalid_session'].includes(code)) { await this.login(); continue; }
      if (r.status === 409 && code === 'stale_revision') { const cur = r.json?.error?.details?.currentRevision; if (typeof cur === 'number') { this.s.revision = cur; this.save(); continue; } }
      if (r.status >= 400) { const e = new Error(`${route} ${r.status} ${JSON.stringify(r.json?.error)}`); e.r = r; throw e; }
      return opts.raw ? r : r.json.data;
    }
    throw new Error('retries exhausted ' + route);
  }
  commit(route, p, label) { return this.call('/commit/' + route, p, { label }); }
  read(route, p, label) { return this.call('/read/' + route, p, { label }); }
  async exportSave(file) { const r = await this.call('/commit/setting/backup/export', {}, { raw: true, label: 'export' }); fs.writeFileSync(file, r.buf); return file; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const c = new Client();
  const [route, json, pick] = process.argv.slice(2);
  try {
    const d = route === 'login' ? (await c.login()).json : await c.call(route, JSON.parse(json || '{}'));
    fs.writeFileSync('/tmp/bk/last.json', JSON.stringify(d));
    const out = pick ? pick.split('.').reduce((v, k) => v?.[k], d) : d;
    console.log(JSON.stringify(out, null, 1).slice(0, Number(process.env.N || 8000)));
  } catch (e) { console.log(e.message); process.exit(1); }
}
