import { deflateSync as deflateRawSync, inflateSync as inflateRawSync } from 'fflate';

const STORAGE_COMPRESSION_PREFIX = 'kexp-lz16:';
// Internal storage codec: deflate-raw bytes packed 15 bits per UTF-16 code unit
// (offset 0x20, so every unit is in 0x20..0x801F: no controls, no surrogates).
const STORAGE_DEFLATE_PREFIX = 'kexp-df15:';
const PACK_BITS = 15;
const PACK_OFFSET = 0x20;
const PACK_MASK = (1 << PACK_BITS) - 1;

// Based on lz-string's UTF-16 codec approach (synchronous, localStorage-safe).
function compressToUTF16(input: string): string {
  if (!input) return '';

  const dictionary = new Map<string, number>();
  const dictionaryToCreate = new Set<string>();
  let c = '';
  let wc = '';
  let w = '';
  let enlargeIn = 2;
  let dictSize = 3;
  let numBits = 2;
  let dataVal = 0;
  let dataPosition = 0;
  let output = '';

  const writeBit = (value: number) => {
    dataVal = (dataVal << 1) | value;
    if (dataPosition === 14) {
      dataPosition = 0;
      output += String.fromCharCode(dataVal + 32);
      dataVal = 0;
    } else {
      dataPosition += 1;
    }
  };

  const writeBits = (count: number, value: number) => {
    for (let i = 0; i < count; i += 1) {
      writeBit(value & 1);
      value >>= 1;
    }
  };

  for (let i = 0; i < input.length; i += 1) {
    c = input.charAt(i);

    if (!dictionary.has(c)) {
      dictionary.set(c, dictSize++);
      dictionaryToCreate.add(c);
    }

    wc = w + c;
    if (dictionary.has(wc)) {
      w = wc;
      continue;
    }

    if (dictionaryToCreate.has(w)) {
      const wCharCode = w.charCodeAt(0);
      if (wCharCode < 256) {
        writeBits(numBits, 0);
        writeBits(8, wCharCode);
      } else {
        writeBits(numBits, 1);
        writeBits(16, wCharCode);
      }

      enlargeIn -= 1;
      if (enlargeIn === 0) {
        enlargeIn = 2 ** numBits;
        numBits += 1;
      }
      dictionaryToCreate.delete(w);
    } else {
      const value = dictionary.get(w);
      if (typeof value !== 'number') {
        throw new Error('Compression dictionary lookup failed.');
      }
      writeBits(numBits, value);
    }

    enlargeIn -= 1;
    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits += 1;
    }

    dictionary.set(wc, dictSize++);
    w = String(c);
  }

  if (w !== '') {
    if (dictionaryToCreate.has(w)) {
      const wCharCode = w.charCodeAt(0);
      if (wCharCode < 256) {
        writeBits(numBits, 0);
        writeBits(8, wCharCode);
      } else {
        writeBits(numBits, 1);
        writeBits(16, wCharCode);
      }

      enlargeIn -= 1;
      if (enlargeIn === 0) {
        enlargeIn = 2 ** numBits;
        numBits += 1;
      }
      dictionaryToCreate.delete(w);
    } else {
      const value = dictionary.get(w);
      if (typeof value !== 'number') {
        throw new Error('Compression dictionary lookup failed.');
      }
      writeBits(numBits, value);
    }

    enlargeIn -= 1;
    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits += 1;
    }
  }

  writeBits(numBits, 2);

  while (true) {
    dataVal <<= 1;
    if (dataPosition === 14) {
      output += String.fromCharCode(dataVal + 32);
      break;
    }
    dataPosition += 1;
  }

  return output;
}

function decompressFromUTF16(compressed: string): string | null {
  if (!compressed) return '';

  const dictionary: string[] = [];
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  let result = '';
  let w = '';

  let dataVal = compressed.charCodeAt(0) - 32;
  let dataPosition = 16384;
  let dataIndex = 1;

  const readBit = () => {
    const res = dataVal & dataPosition;
    dataPosition >>= 1;
    if (dataPosition === 0) {
      dataPosition = 16384;
      dataVal = compressed.charCodeAt(dataIndex) - 32;
      dataIndex += 1;
    }
    return res > 0 ? 1 : 0;
  };

  const readBits = (maxPower: number): number => {
    let power = 1;
    let bits = 0;
    while (power !== maxPower) {
      bits |= readBit() * power;
      power <<= 1;
    }
    return bits;
  };

  for (let i = 0; i < 3; i += 1) {
    dictionary[i] = String(i);
  }

  let bits = readBits(4);
  let c: string;

  switch (bits) {
    case 0:
      c = String.fromCharCode(readBits(256));
      break;
    case 1:
      c = String.fromCharCode(readBits(65536));
      break;
    case 2:
      return '';
    default:
      return null;
  }

  dictionary[3] = c;
  w = c;
  result = c;

  while (true) {
    if (dataIndex > compressed.length) {
      return '';
    }

    const cc = readBits(2 ** numBits);
    let ccValue = cc;

    switch (ccValue) {
      case 0:
        dictionary[dictSize++] = String.fromCharCode(readBits(256));
        ccValue = dictSize - 1;
        enlargeIn -= 1;
        break;
      case 1:
        dictionary[dictSize++] = String.fromCharCode(readBits(65536));
        ccValue = dictSize - 1;
        enlargeIn -= 1;
        break;
      case 2:
        return result;
      default:
        break;
    }

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits += 1;
    }

    if (dictionary[ccValue]) {
      entry = dictionary[ccValue];
    } else if (ccValue === dictSize) {
      entry = w + w.charAt(0);
    } else {
      return null;
    }

    result += entry;

    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn -= 1;

    w = entry;

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits += 1;
    }
  }
}

function packBytesToUtf16(bytes: Uint8Array): string {
  const units = new Uint16Array(Math.ceil(bytes.length * 8 / PACK_BITS));
  let accumulator = 0;
  let bitCount = 0;
  let unitIndex = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    accumulator = (accumulator << 8) | bytes[index]!;
    bitCount += 8;
    if (bitCount >= PACK_BITS) {
      bitCount -= PACK_BITS;
      units[unitIndex++] = ((accumulator >>> bitCount) & PACK_MASK) + PACK_OFFSET;
      accumulator &= (1 << bitCount) - 1;
    }
  }
  if (bitCount > 0) units[unitIndex++] = ((accumulator << (PACK_BITS - bitCount)) & PACK_MASK) + PACK_OFFSET;
  let packed = '';
  const chunkSize = 0x2000;
  for (let index = 0; index < units.length; index += chunkSize) {
    packed += String.fromCharCode(...units.subarray(index, index + chunkSize));
  }
  return `${STORAGE_DEFLATE_PREFIX}${bytes.length}:${packed}`;
}

function unpackUtf16ToBytes(rawPayload: string): Uint8Array {
  const separator = rawPayload.indexOf(':', STORAGE_DEFLATE_PREFIX.length);
  const byteLength = Number(rawPayload.slice(STORAGE_DEFLATE_PREFIX.length, separator));
  if (separator < 0 || !Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new Error('Failed to decode compressed save payload.');
  }
  const bytes = new Uint8Array(byteLength);
  let accumulator = 0;
  let bitCount = 0;
  let byteIndex = 0;
  for (let index = separator + 1; index < rawPayload.length && byteIndex < byteLength; index += 1) {
    const value = rawPayload.charCodeAt(index) - PACK_OFFSET;
    if (value < 0 || value > PACK_MASK) throw new Error('Failed to decode compressed save payload.');
    accumulator = (accumulator << PACK_BITS) | value;
    bitCount += PACK_BITS;
    while (bitCount >= 8 && byteIndex < byteLength) {
      bitCount -= 8;
      bytes[byteIndex++] = (accumulator >>> bitCount) & 0xff;
    }
    accumulator &= (1 << bitCount) - 1;
  }
  if (byteIndex !== byteLength) throw new Error('Failed to decode compressed save payload.');
  return bytes;
}

/** Fast synchronous internal-storage encoding (deflate-raw). Not for portable backups. */
export function encodeStoredStateSync(jsonPayload: string): string {
  return packBytesToUtf16(deflateRawSync(new TextEncoder().encode(jsonPayload)));
}

/**
 * Internal-storage encoding using the platform's native `CompressionStream`
 * when available, falling back to the synchronous JS deflate. Both produce
 * standard deflate-raw data, so `decodePersistedState` reads either.
 */
export async function encodeStoredState(jsonPayload: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') return encodeStoredStateSync(jsonPayload);
  const stream = new Blob([jsonPayload]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return packBytesToUtf16(new Uint8Array(await new Response(stream).arrayBuffer()));
}

/** Portable encoding for exported backups and payloads older runtimes must read. */
export function encodePersistedState(jsonPayload: string): string {
  const compressed = compressToUTF16(jsonPayload);
  return `${STORAGE_COMPRESSION_PREFIX}${compressed}`;
}

export function decodePersistedState(rawPayload: string): string {
  if (rawPayload.startsWith(STORAGE_DEFLATE_PREFIX)) {
    try {
      return new TextDecoder().decode(inflateRawSync(unpackUtf16ToBytes(rawPayload)));
    } catch {
      throw new Error('Failed to decode compressed save payload.');
    }
  }
  if (!rawPayload.startsWith(STORAGE_COMPRESSION_PREFIX)) {
    return rawPayload;
  }

  const compressed = rawPayload.slice(STORAGE_COMPRESSION_PREFIX.length);
  const decompressed = decompressFromUTF16(compressed);
  if (decompressed == null) {
    throw new Error('Failed to decode compressed save payload.');
  }
  return decompressed;
}

/**
 * UTF-8-safe base64: `btoa` alone only accepts Latin1 code units, but `encodePersistedState`'s UTF16 packing
 * routinely produces characters above that range. Used wherever a compressed save payload becomes a multipart
 * upload's `contentBase64` (`commit/setting/backup/import`'s `uploadedFiles.backup`), matching the UTF-8-decode
 * pairing `commitOperations.ts` already uses to reverse this on the server (`atob` + `TextDecoder`).
 */
export function base64FromUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  return btoa(binary);
}
