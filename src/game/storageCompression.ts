const STORAGE_COMPRESSION_PREFIX = 'kexp-lz16:';

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

export function encodePersistedState(jsonPayload: string): string {
  const compressed = compressToUTF16(jsonPayload);
  return `${STORAGE_COMPRESSION_PREFIX}${compressed}`;
}

export function decodePersistedState(rawPayload: string): string {
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
