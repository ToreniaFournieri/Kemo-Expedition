const zlib = require('node:zlib');
const { promisify } = require('node:util');

// SpecRef: 9.1.4.12 | API account storage | Internal save encoding performed off the renderer
// Produces the same `kexp-df15:` container as src/game/storageCompression.ts (deflate-raw bytes packed 15 bits per
// UTF-16 unit, offset 0x20) so decodePersistedState reads it unchanged. Only the deflate level differs: API account
// saves are rewritten on every changed commit, so speed outranks the last ~35% of size.
const STORAGE_DEFLATE_PREFIX = 'kexp-df15:';
const PACK_BITS = 15;
const PACK_OFFSET = 0x20;
const PACK_MASK = (1 << PACK_BITS) - 1;
const API_ACCOUNT_DEFLATE_LEVEL = 3;
const deflateRaw = promisify(zlib.deflateRaw);

function packBytesToUtf16(bytes) {
  const units = new Uint16Array(Math.ceil(bytes.length * 8 / PACK_BITS));
  let accumulator = 0;
  let bitCount = 0;
  let unitIndex = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    accumulator = (accumulator << 8) | bytes[index];
    bitCount += 8;
    if (bitCount >= PACK_BITS) {
      bitCount -= PACK_BITS;
      units[unitIndex++] = ((accumulator >>> bitCount) & PACK_MASK) + PACK_OFFSET;
      accumulator &= (1 << bitCount) - 1;
    }
  }
  if (bitCount > 0) units[unitIndex++] = ((accumulator << (PACK_BITS - bitCount)) & PACK_MASK) + PACK_OFFSET;
  const packed = Buffer.from(units.buffer, units.byteOffset, units.byteLength).toString('utf16le');
  return `${STORAGE_DEFLATE_PREFIX}${bytes.length}:${packed}`;
}

// Asynchronous deflate runs on the libuv pool, so the main process keeps serving HTTP while a save is encoded.
async function encodeApiAccountSave(jsonPayload) {
  const compressed = await deflateRaw(Buffer.from(jsonPayload, 'utf8'), { level: API_ACCOUNT_DEFLATE_LEVEL });
  return packBytesToUtf16(compressed);
}

// Segmented encoding: large immutable expedition logs are compressed once, kept as sync-flushed raw deflate pieces, and
// concatenated with the pieces for the changing text. A sync flush ends on a byte boundary without a final block, so
// the pieces join into one standard deflate stream closed by an empty final block.
const SEGMENT_CACHE_LIMIT_BYTES = 128 * 1024 * 1024;
const LOG_DEFLATE_LEVEL = 6;
const FINAL_EMPTY_BLOCK = Buffer.from([0x03, 0x00]);
let cacheNonce = null;
let cache = new Map();
let cacheBytes = 0;
const SEGMENT_MISS = 'segment_cache_miss';

function deflatePiece(text, level) {
  return deflateRaw(Buffer.from(text, 'utf8'), { level, finishFlush: zlib.constants.Z_SYNC_FLUSH });
}

function remember(id, deflated, characters) {
  cache.set(id, { deflated, characters });
  cacheBytes += deflated.length;
  while (cacheBytes > SEGMENT_CACHE_LIMIT_BYTES) {
    const oldest = cache.keys().next().value;
    cacheBytes -= cache.get(oldest).deflated.length;
    cache.delete(oldest);
  }
}

async function encodeApiAccountSegments(segments) {
  if (!segments || typeof segments.nonce !== 'string' || !Array.isArray(segments.items)) throw new Error('invalid_request');
  if (segments.nonce !== cacheNonce) { cacheNonce = segments.nonce; cache = new Map(); cacheBytes = 0; }
  const pieces = [];
  const defined = [];
  let pendingText = '';
  const flushText = () => { if (pendingText) { pieces.push(deflatePiece(pendingText, API_ACCOUNT_DEFLATE_LEVEL)); pendingText = ''; } };
  for (const item of segments.items) {
    if (typeof item === 'string') { pendingText += item; continue; }
    if (!item || !Number.isInteger(item.id)) throw new Error('invalid_request');
    flushText();
    if (typeof item.text === 'string') {
      const id = item.id;
      const text = item.text;
      pieces.push(deflatePiece(text, LOG_DEFLATE_LEVEL).then((deflated) => { defined.push([id, deflated, text.length]); return deflated; }));
    } else {
      const held = cache.get(item.id);
      if (!held) throw new Error(SEGMENT_MISS);
      pieces.push(held.deflated);
    }
  }
  flushText();
  const parts = await Promise.all(pieces);
  for (const [id, deflated, characters] of defined) remember(id, deflated, characters);
  return packBytesToUtf16(Buffer.concat([...parts, FINAL_EMPTY_BLOCK]));
}

module.exports = { encodeApiAccountSave, encodeApiAccountSegments, packBytesToUtf16, API_ACCOUNT_DEFLATE_LEVEL };
