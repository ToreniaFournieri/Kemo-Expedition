const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSync } = require('esbuild');

const FORBIDDEN_INPUTS = [
  'battleTypeScriptReference',
  'battleEngine.ts',
  'battleSetup.ts',
  'battleNormalAction.ts',
  'battleReactive.ts',
  'battleTimed.ts',
  'domainTerrain.ts',
];

const FORBIDDEN_BUNDLE_MARKERS = [
  'executeBattleTapeDiagnostic',
  'executeBattleCandidateDiagnosticFromSeed',
  'decodeBattleProtocolOutput',
  'OwnedBattleProtocolOutputIndex',
  'reserveGameplayRandomTape',
  'BATTLE_GOLDEN_V2_CAPTURE',
  'executeBattleStartCheckpoint',
  'executeBattleCombatBaseCheckpoint',
  'executeBattleCombatNormalCheckpoint',
  'executeBattleCombatReactiveCheckpoint',
  'executeBattleCombatTimedCheckpoint',
  'executeBattleEndCheckpoint',
];

function audit(entryPoint) {
  const result = buildSync({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    write: false,
    metafile: true,
    define: {
      'import.meta.env.DEV': 'false',
      __BUILD_NUMBER__: '0',
    },
    loader: { '.css': 'empty', '.md': 'text' },
    logLevel: 'silent',
  });
  const inputs = Object.keys(result.metafile.inputs).join('\n');
  const output = result.outputFiles.map(file => file.text).join('\n');
  for (const marker of FORBIDDEN_INPUTS) {
    assert.equal(inputs.includes(marker), false, `${entryPoint}: production graph includes ${marker}`);
  }
  for (const marker of FORBIDDEN_BUNDLE_MARKERS) {
    assert.equal(output.includes(marker), false, `${entryPoint}: production bundle includes ${marker}`);
  }
}

test('browser and AFK worker production bundles contain only the authoritative native battle path', () => {
  audit('src/main.tsx');
  audit('src/workers/afkChunkWorker.ts');
});

test('battle runtime sources contain no battle Math.random or retired no-flag placeholder', () => {
  const { readFileSync } = require('node:fs');
  for (const path of ['src/game/battle.ts', 'src/game/battleCandidate.ts', 'src/game/battleKernel.ts']) {
    assert.equal(readFileSync(path, 'utf8').includes('Math.random'), false, `${path}: battle Math.random found`);
  }
  const native = readFileSync('native/battle_protocol.cpp', 'utf8');
  assert.equal(native.includes('Build all normal-action entries once'), false);
  assert.equal(native.includes('while (state.random_cursor < state.random_count)'), false);
});
