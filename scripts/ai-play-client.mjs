#!/usr/bin/env node
// SpecRef: 12.2 | AI Play Operator Guide | Reference client
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { AiPlayClient } from './lib/ai-play-client.mjs';

const usage = `Usage: npm run ai-play:client -- --connection=PATH --directory=PATH
Keep this client running. Send one JSON action per line, or @/path/to/action.json.
Actions: observe, preview, simulate, configure, sortie, build-options, read,
         status, evaluation, report, ledger, retry, release.
Example: {"action":"sortie","partyId":1,"count":1}
Preview/simulate/configure accept a configuration object. No automatic strategy.
Full sanitized responses and pending mutation requests are saved in directory.
EOF or Ctrl-C releases control. Reuse the directory to recover a pending request.`;
if (process.argv.includes('--help')) { console.log(usage); process.exit(0); }
let client, timer, closing = false;
async function close() {
  if (closing) return; closing = true; clearInterval(timer);
  try { await client?.close(); } catch { console.error('Release failed; preserve the client directory and check API status.'); process.exitCode = 1; }
}
try {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--(connection|directory)=(.+)$/.exec(arg);
    if (!match || args[match[1]]) throw new Error(usage);
    args[match[1]] = match[2];
  }
  if (!args.connection || !args.directory) throw new Error(usage);
  client = new AiPlayClient({ connection: JSON.parse(readFileSync(args.connection, 'utf8')), directory: args.directory });
  console.log(JSON.stringify({ connected: await client.connect() }));
  timer = setInterval(() => { client.renew().catch(() => console.error('Lease maintenance failed. Check status; no gameplay was retried.')); }, 60000);
  timer.unref();
  const lines = createInterface({ input: process.stdin, terminal: false });
  process.once('SIGINT', () => { lines.close(); process.stdin.pause(); });
  process.once('SIGTERM', () => { lines.close(); process.stdin.pause(); });
  console.log('READY: JSON action or @request-file; --help lists actions.');
  for await (const line of lines) {
    if (!line.trim()) continue;
    try {
      const source = line.trim().startsWith('@') ? readFileSync(line.trim().slice(1), 'utf8') : line;
      const input = JSON.parse(source);
      if (input.configurationFile !== undefined) {
        if (!['preview', 'simulate', 'configure'].includes(input.action) || input.configuration !== undefined)
          throw new Error('Use configurationFile only for preview/simulate/configure, without configuration.');
        input.configuration = JSON.parse(readFileSync(input.configurationFile, 'utf8'));
        delete input.configurationFile;
      }
      console.log(JSON.stringify(await client.run(input)));
    } catch (error) { console.log(JSON.stringify({ clientError: error instanceof SyntaxError ? 'Invalid JSON; no action was sent.' : error.message })); }
    console.log('READY');
  }
} catch (error) {
  // File/JSON errors can include sensitive source text; do not echo it.
  console.error(error instanceof SyntaxError ? 'Invalid JSON input file.' : error.message);
  process.exitCode = 1;
} finally { await close(); }
