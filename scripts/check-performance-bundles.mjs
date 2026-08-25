import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const assetsDirectory = resolve('dist/assets');
const workerFileName = readdirSync(assetsDirectory).find((name) => /^afkChunkWorker-.*\.js$/.test(name));
if (!workerFileName) throw new Error('AFK worker bundle was not found; run npm run build first');

const worker = readFileSync(resolve(assetsDirectory, workerFileName));
const workerSource = worker.toString('utf8');
const workerBytes = worker.byteLength;
const workerGzipBytes = gzipSync(worker).byteLength;
const workerByteLimit = 1_200_000;
const workerGzipByteLimit = 300_000;
const workerContainsReactRuntime = /react\.production|useReducer|useCallback/.test(workerSource);

const indexHtml = readFileSync(resolve('dist/index.html'), 'utf8');
const initialLocalePreloads = Array.from(indexHtml.matchAll(/rel="modulepreload"[^>]+href="[^"]*locale-[^"]+\.js"/g)).length;
const report = {
  schemaVersion: 1,
  worker: { fileName: workerFileName, bytes: workerBytes, gzipBytes: workerGzipBytes, byteLimit: workerByteLimit, gzipByteLimit: workerGzipByteLimit, containsReactRuntime: workerContainsReactRuntime },
  startup: { initialLocalePreloads, localePreloadLimit: 1 },
};

console.log(JSON.stringify(report, null, 2));
if (workerBytes > workerByteLimit) throw new Error(`AFK worker is ${workerBytes} bytes; limit is ${workerByteLimit}`);
if (workerGzipBytes > workerGzipByteLimit) throw new Error(`AFK worker gzip is ${workerGzipBytes} bytes; limit is ${workerGzipByteLimit}`);
if (workerContainsReactRuntime) throw new Error('AFK worker bundle includes the React renderer runtime');
if (initialLocalePreloads > 1) throw new Error(`Startup preloads ${initialLocalePreloads} locales; limit is 1`);
