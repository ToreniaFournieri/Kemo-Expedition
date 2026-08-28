const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

test('AFK transfer attribution preserves parity and enforces compact-envelope reductions', () => {
  const result = spawnSync(process.execPath, ['scripts/run-afk-transfer-attribution.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, `AFK transfer attribution failed with status ${result.status}`);
  const report = JSON.parse(result.stdout);
  assert.equal(report.validation.compactHydratedResultsByteIdentical, true);
  assert.equal(
    report.validation.compactDeterministicAfkFinalStateSha256,
    report.validation.deterministicAfkFinalStateSha256,
  );
  report.input.compactJobStateBytes.forEach((candidate) => {
    assert.ok(candidate.bytes < report.input.completeStateBytes * 0.4);
  });
  assert.ok(
    report.output.withoutBasePartySixPartyBytes
      < report.output.completeSixPartyBytes * 0.51,
  );
});
