import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const smoke = process.argv.includes('--profile=smoke');
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const server = createServer();
await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));

const electron = spawn('./node_modules/.bin/electron', ['.', '--environment=dev', `--remote-debugging-port=${port}`], {
  cwd: process.cwd(),
  stdio: ['ignore', 'ignore', 'pipe'],
});

async function getTarget() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const target = targets.find((entry) => entry.type === 'page' && entry.url.includes('/dev/'));
      if (target) return target;
    } catch { /* renderer is still starting */ }
    await delay(250);
  }
  throw new Error('Timed out waiting for the Electron renderer');
}

try {
  const target = await getTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const handler = pending.get(message.id);
    if (handler) { pending.delete(message.id); handler(message); }
  };
  const evaluate = (expression, awaitPromise = true) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result.result.value));
    socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise, returnByValue: true } }));
  });
  const readyDeadline = Date.now() + 30_000;
  while (Date.now() < readyDeadline && !(await evaluate('Boolean(window.__BOKEMO_MEMORY_BENCHMARK__)'))) await delay(250);
  const initial = await evaluate('window.__BOKEMO_MEMORY_BENCHMARK__.sample()');
  await delay(smoke ? 100 : 30 * 60_000);
  const afterIdle = await evaluate('window.__BOKEMO_MEMORY_BENCHMARK__.sample()');
  await evaluate(`window.__BOKEMO_MEMORY_BENCHMARK__.switchPanes(${smoke ? 12 : 1000})`);
  await delay(smoke ? 100 : 5_000);
  const settled = await evaluate('window.__BOKEMO_MEMORY_BENCHMARK__.sample()');
  const renderProfile = await evaluate('window.__BOKEMO_RENDER_PROFILE__ ?? null');
  const afkWorkerProfile = await evaluate('window.__BOKEMO_AFK_WORKER_PROFILE__ ?? []');
  console.log(JSON.stringify({ schemaVersion: 1, profile: smoke ? 'smoke' : 'standard', initial, afterIdle, settled, renderProfile, afkWorkerProfile }, null, 2));
  if (renderProfile && renderProfile.p95CommitDurationMs >= 8) {
    throw new Error(`React commit p95 ${renderProfile.p95CommitDurationMs}ms must remain below 8ms`);
  }
  socket.close();
} finally {
  electron.kill('SIGTERM');
}
