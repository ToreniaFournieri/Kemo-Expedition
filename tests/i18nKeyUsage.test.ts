import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ja from '../src/i18n/ja.ts';

// Keys that are looked up in a way this scan cannot see. Keep this list short and explain each entry.
const ALLOWED_UNREFERENCED_KEYS: readonly string[] = [];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return path.endsWith(join('src', 'i18n')) ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

test('every translation key is referenced by the code', () => {
  const source = sourceFiles('src').map((path) => readFileSync(path, 'utf8')).join('\n');
  // Quoted literals: full keys, and prefixes of numbered or dynamic families (e.g. 'battleFlavor.passive.firstAid').
  const literals = new Set([...source.matchAll(/['"`]([A-Za-z][\p{L}\p{N}_.\-]*)['"`]/gu)].map((match) => match[1]));
  // Template literal prefixes such as `ability.${id}.label` -> "ability.".
  const templatePrefixes = [...new Set([...source.matchAll(/`([A-Za-z][\p{L}\p{N}_.\-]*\.)\$\{/gu)].map((match) => match[1]))];

  const isReferenced = (key: string): boolean => {
    if (literals.has(key)) return true;
    const segments = key.split('.');
    for (let length = segments.length - 1; length >= 2; length -= 1) {
      if (literals.has(segments.slice(0, length).join('.'))) return true;
    }
    return templatePrefixes.some((prefix) => key.startsWith(prefix));
  };

  const unreferenced = Object.keys(ja).filter((key) => !isReferenced(key) && !ALLOWED_UNREFERENCED_KEYS.includes(key));
  assert.deepEqual(unreferenced, [], `Unused translation keys (delete them, or allowlist with a reason):\n${unreferenced.join('\n')}`);
});
