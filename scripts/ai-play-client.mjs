#!/usr/bin/env node
// SpecRef: 12.2 | AI Play Operator Guide | Reference client
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { AiPlayClient } from './lib/ai-play-client.mjs';

const usage = `Usage: node scripts/ai-play-client.mjs --connection=PATH --directory=PATH
Keep this client running. Use configurationFile for builds or @/path/to/action.json.
Send only short control actions inline, e.g. {"action":"sortie","partyId":1,"count":1}.
Actions: observe, preview, simulate, configure, buy-shop-item, remove-all-equipment,
         run-auto-equipment, sortie, build-options, read,
         status, evaluation, report, ledger, retry, release, quit.
Configuration objects must be in files, not pasted into terminal lines.
Full sanitized responses and request progress are saved in directory.
quit, Ctrl-C or SIGTERM stops renewal immediately and discards queued actions.
An outstanding request finishes or times out before release is attempted.
EOF finishes the supplied input then closes. Reuse the directory for recovery.`;
if (process.argv.includes('--help')) { console.log(usage); process.exit(0); }
let client, timer, lines, stopping = false;
function shutdown(reason) {
  if (stopping) return;
  stopping = true;
  clearInterval(timer); // Stop scheduling renewals at signal receipt, not after the outstanding request.
  client?.beginShutdown(reason);
  lines?.close();
  process.stdin.pause();
}
const onInterrupt = () => shutdown('SIGINT');
const onTerminate = () => shutdown('SIGTERM');
const onInput = chunk => { if (typeof chunk === 'string' ? chunk.includes('\u0003') : chunk.includes(3)) shutdown('interrupt_byte'); };
// Install before the first awaited connection operation. Some tool pipes deliver ETX as data.
process.on('SIGINT', onInterrupt);
process.on('SIGTERM', onTerminate);
try {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--(connection|directory)=(.+)$/.exec(arg);
    if (!match || args[match[1]]) throw new Error(usage);
    args[match[1]] = match[2];
  }
  if (!args.connection || !args.directory) throw new Error(usage);
  client = new AiPlayClient({ connection: JSON.parse(readFileSync(args.connection, 'utf8')), directory: args.directory,
    onEvent: event => console.log(JSON.stringify(event)) });
  console.log(JSON.stringify({ event: 'client_started', pid: process.pid, input: 'configurationFile or @request-file' }));
  const connected = await client.connect();
  if (!stopping) {
    console.log(JSON.stringify({ connected }));
    timer = setInterval(() => { client.renew().catch(() => {
      if (!stopping) console.error('Lease maintenance failed. Check status; no gameplay was retried.');
    }); }, 60000);
    timer.unref();
    lines = createInterface({ input: process.stdin, terminal: false });
    process.stdin.on('data', onInput);
    // Keep reading control input while a request is pending. An async readline iterator
    // can pause stdin behind buffered actions, preventing quit/ETX from reaching us.
    let work = Promise.resolve();
    const inputClosed = new Promise(resolve => lines.once('close', resolve));
    lines.on('line', line => {
      if (stopping || !line.trim()) return;
      if (line.length <= 2048) {
        try { if (JSON.parse(line)?.action === 'quit') { shutdown('quit'); return; } } catch { /* Parse below. */ }
      }
      work = work.then(async () => {
        if (stopping) return;
        try {
          if (Buffer.byteLength(line) > 2048) throw new Error('Input line too long. Save the action in a file and send @/absolute/path/to/action.json.');
          const fromFile = line.trim().startsWith('@');
          const source = fromFile ? readFileSync(line.trim().slice(1), 'utf8') : line;
          const input = JSON.parse(source);
          if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Provide one JSON action object.');
          if (input.action === 'quit') { shutdown('quit'); return; }
          if (!fromFile && input.configuration !== undefined) throw new Error('Use configurationFile or @action-file for build configurations; do not paste configuration objects into the terminal.');
          if (input.configurationFile !== undefined) {
            if (!['preview', 'simulate', 'configure'].includes(input.action) || input.configuration !== undefined)
              throw new Error('Use configurationFile only for preview/simulate/configure, without configuration.');
            input.configuration = JSON.parse(readFileSync(input.configurationFile, 'utf8'));
            delete input.configurationFile;
          }
          console.log(JSON.stringify(await client.run(input)));
        } catch (error) { console.log(JSON.stringify({ clientError: error instanceof SyntaxError ? 'Invalid JSON; action was not dispatched.' : error.message })); }
        if (!stopping) console.log('READY');
      });
    });
    console.log('READY: configurationFile or @request-file; short control JSON; {"action":"quit"} to exit.');
    await inputClosed;
    await work;
  }
} catch (error) {
  if (!stopping) {
    console.error(error instanceof SyntaxError ? 'Invalid JSON input file.' : error.message);
    process.exitCode = 1;
  }
} finally {
  shutdown('input_finished');
  try { await client?.close(); }
  catch { console.error('Release unconfirmed. Preserve the client directory; check API status and evaluation ledger.'); process.exitCode = 1; }
  process.stdin.off('data', onInput);
  process.stdin.destroy(); // A quit delivered inside a data callback can otherwise leave the pipe referenced.
  process.off('SIGINT', onInterrupt); process.off('SIGTERM', onTerminate);
}
