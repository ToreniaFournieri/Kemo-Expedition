import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const assetsDirectory = resolve('dist/assets');
const assetFileNames = readdirSync(assetsDirectory);
const workerFileName = assetFileNames.find((name) => /^afkChunkWorker-.*\.js$/.test(name));
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
const javascriptAssets = assetFileNames.filter((name) => name.endsWith('.js')).map((fileName) => {
  const source = readFileSync(resolve(assetsDirectory, fileName));
  return { fileName, bytes: source.byteLength, sha256: createHash('sha256').update(source).digest('hex') };
});
const largestJavascriptAsset = javascriptAssets.reduce((largest, asset) => asset.bytes > largest.bytes ? asset : largest);
const javascriptAssetByteLimit = 500_000;
const localeAssets = javascriptAssets.filter(({ fileName }) => /^(?:locale-)?(?:ja|en|zh-CN|zh-TW)-.*\.js$/.test(fileName));
const expectedLocaleAssetNames = ['locale-ja', 'locale-en', 'locale-zh-CN', 'locale-zh-TW'];
const localesAreShared = localeAssets.length === expectedLocaleAssetNames.length
  && expectedLocaleAssetNames.every((prefix) => localeAssets.some(({ fileName }) => fileName.startsWith(`${prefix}-`)))
  && new Set(localeAssets.map(({ sha256 }) => sha256).values()).size === localeAssets.length;
const report = {
  schemaVersion: 2,
  worker: { fileName: workerFileName, bytes: workerBytes, gzipBytes: workerGzipBytes, byteLimit: workerByteLimit, gzipByteLimit: workerGzipByteLimit, containsReactRuntime: workerContainsReactRuntime },
  startup: { initialLocalePreloads, localePreloadLimit: 1 },
  chunks: { largest: largestJavascriptAsset, byteLimit: javascriptAssetByteLimit },
  locales: { files: localeAssets.map(({ fileName }) => fileName), shared: localesAreShared },
};

console.log(JSON.stringify(report, null, 2));
if (workerBytes > workerByteLimit) throw new Error(`AFK worker is ${workerBytes} bytes; limit is ${workerByteLimit}`);
if (workerGzipBytes > workerGzipByteLimit) throw new Error(`AFK worker gzip is ${workerGzipBytes} bytes; limit is ${workerGzipByteLimit}`);
if (workerContainsReactRuntime) throw new Error('AFK worker bundle includes the React renderer runtime');
if (initialLocalePreloads > 1) throw new Error(`Startup preloads ${initialLocalePreloads} locales; limit is 1`);
if (largestJavascriptAsset.bytes > javascriptAssetByteLimit) throw new Error(`${largestJavascriptAsset.fileName} is ${largestJavascriptAsset.bytes} bytes; chunk limit is ${javascriptAssetByteLimit}`);
if (!localesAreShared) throw new Error(`Locale bundles are missing or duplicated: ${localeAssets.map(({ fileName }) => fileName).join(', ')}`);
