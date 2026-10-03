import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const runDir = process.env.BOKEMO_RUN_DIR || path.dirname(fileURLToPath(import.meta.url));
const privatePath = process.env.BOKEMO_CLIENT_STATE || '/tmp/bokemo-codex-exp8/client-state.json';
const descriptorPath = process.env.BOKEMO_PLAY_DESCRIPTOR || '/tmp/bokemo-codex-exp8/descriptor.json';
const clean = value => JSON.parse(JSON.stringify(value, (key, v) => /token/i.test(key) ? '[REDACTED]' : v));
export class Client {
  constructor() {
    fs.mkdirSync(runDir, { recursive: true });
    this.descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
    this.state = fs.existsSync(privatePath) ? JSON.parse(fs.readFileSync(privatePath, 'utf8')) : { revision: 0, calls: 0, identity: { userId: 'CodexNormal1003', environment: 'prod', gameMode: 'normal', language: 'en' } };
  }
  async call(route, parameters = {}, label = route) {
    if (route !== '/fundamental/logIn' && this.state.lastCallAt && Date.now() - this.state.lastCallAt > 840000 && this.state.sessionToken) await this.call('/fundamental/logIn', {...this.state.identity,headless:true}, 'renew lease before idle expiry');
    const commit = route.startsWith('/commit/');
    const post = commit || route.startsWith('/fundamental/') && route !== '/fundamental/status' || route.endsWith('/simulationRun');
    const body = post ? commit ? { expectedRevision: this.state.revision, idempotencyKey: crypto.randomUUID(), parameters } : parameters : undefined;
    const query = !post ? new URLSearchParams(Object.entries(parameters).flatMap(([k,v]) => Array.isArray(v) ? v.map(x=>[k,String(x)]) : [[k,String(v)]])) : null;
    const url = this.descriptor.endpoint + route + (query?.size ? '?' + query : '');
    const headers = { Authorization: 'Bearer ' + this.descriptor.token, ...(post ? { 'Content-Type': 'application/json' } : {}), ...(this.state.sessionToken ? { 'X-BoKemo-Session': this.state.sessionToken, 'X-BoKemo-Control-Lease': this.state.controlLeaseToken } : {}) };
    const startedAt = new Date().toISOString();
    const beforeTime = this.state.inGameTime;
    const started = performance.now();
    const response = await fetch(url, { method: post ? 'POST' : 'GET', headers, ...(post ? { body: JSON.stringify(body) } : {}) });
    const raw = await response.text();
    const durationMs = performance.now() - started;
    let result;
    try { result = JSON.parse(raw); } catch { result = { raw }; }
    this.state.calls++;
    this.state.lastCallAt = Date.now();
    if (typeof result.revision === 'number') this.state.revision = result.revision;
    if (route === '/fundamental/logIn' && response.ok) Object.assign(this.state, result.data);
    if (result.data?.inGameTime) this.state.inGameTime = result.data.inGameTime;
    if (route === '/fundamental/signUp' && response.ok) this.state.identity = parameters;
    fs.writeFileSync(privatePath, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    const record = { call: this.state.calls, label, startedAt, method: post ? 'POST' : 'GET', route, query: !post ? parameters : {}, body: clean(body ?? null), durationMs: Math.round(durationMs * 1000) / 1000, status: response.status, revision: result.revision, inGameTimeBefore: beforeTime, inGameTimeAfter: this.state.inGameTime, error: result.error ?? null, responseFile: `responses/${String(this.state.calls).padStart(4,'0')}.json` };
    fs.mkdirSync(path.join(runDir,'responses'), { recursive: true });
    fs.writeFileSync(path.join(runDir, record.responseFile), JSON.stringify(clean(result), null, 2));
    fs.appendFileSync(path.join(runDir, 'calls.jsonl'), JSON.stringify(record) + '\n');
    console.error(JSON.stringify({ call: record.call, route, durationMs: record.durationMs, status: record.status, revision: record.revision, inGameTime: this.state.inGameTime }));
    if (!response.ok) throw Object.assign(new Error(JSON.stringify(result.error)), { result });
    return result.data;
  }
  async commit(route, parameters, label) { return this.call('/commit/' + route, parameters, label); }
  async read(route, parameters, label) { return this.call('/read/' + route, parameters, label); }
  async batch(steps) {
    const results = [];
    for (const step of steps) results.push(await this.call(step.route, step.parameters ?? {}, step.label));
    return results;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const client = new Client();
  const [route, json, pick] = process.argv.slice(2);
  const result = route === '--batch' ? await client.batch(JSON.parse(fs.readFileSync(json,'utf8'))) : await client.call(route, JSON.parse(json || '{}'));
  console.log(JSON.stringify(clean(pick ? pick.split('.').reduce((v,k)=>v?.[k], result) : result), null, 2));
}
