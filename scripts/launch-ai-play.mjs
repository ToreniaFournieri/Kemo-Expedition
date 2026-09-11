// SpecRef: 12.1.3 | AI Play | Private organizer connection handoff
import { spawn } from 'node:child_process';
import electron from 'electron';
import { mkdtempSync, chmodSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--(mode|concept|resume)=(.+)$/.exec(arg);
  if (!match) throw new Error('Use --mode=orca|normal and exactly one of --concept=Name or --resume=UUID.');
  return [match[1], match[2]];
}));
if (!['orca', 'normal'].includes(args.mode) || Boolean(args.concept) === Boolean(args.resume)) throw new Error('A mode and exactly one concept or resume UUID are required.');
if (args.concept && !/^[A-Za-z0-9_-]{1,64}$/.test(args.concept)) throw new Error('Invalid concept.');
if (args.resume && !/^[a-f0-9-]{36}$/.test(args.resume)) throw new Error('Invalid resume UUID.');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const directory = mkdtempSync(join(tmpdir(), 'bokemo-ai-play-'));
chmodSync(directory, 0o700);
const connectionFile = join(directory, 'connection.json');
const child = spawn(electron, ['.', `--environment=${args.mode === 'normal' ? 'prod' : 'orca'}`, args.resume ? `--resume-ai-play=${args.resume}` : `--ai-play=${args.concept}`], { cwd: root, stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
const cleanup = () => rmSync(directory, { recursive: true, force: true });
const handoffTimer = setTimeout(() => { console.error('Connection handoff timed out during startup.'); child.kill(); }, 120000);
handoffTimer.unref();
process.on('exit', cleanup);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; cleanup(); });
let received = false;
let closed = false;
child.on('exit', code => { clearTimeout(handoffTimer); closed = true; cleanup(); process.exitCode = code ?? 1; });
child.on('message', async message => {
  if (received || message?.type !== 'ai-play-connection') return;
  received = true;
  clearTimeout(handoffTimer);
  writeFileSync(connectionFile, JSON.stringify(message), { flag: 'wx', mode: 0o600 });
  console.log(`Private connection file: ${connectionFile}`);
  const deadline = Date.now() + 120000;
  while (!closed && Date.now() < deadline) {
    try {
      const response = await fetch(`${message.endpoint}/status`, { headers: { Authorization: `Bearer ${message.token}` }, signal: AbortSignal.timeout(5000) });
      const status = await response.json();
      if (response.ok && status.runtime?.status === 'ready') {
        console.log(`Ready: ${message.mode} evaluation ${message.evaluationId}. Acquire control through the API.`);
        return;
      }
    } catch { /* Renderer startup can briefly reject readiness requests. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!closed) console.error('Readiness timed out. Check authenticated status; do not start gameplay until ready.');
});
