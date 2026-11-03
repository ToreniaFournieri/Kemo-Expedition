const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const { buildSync } = require('esbuild');

const bundlePath = '/tmp/bokemo-receipt-journal-sync-test.mjs';
buildSync({ entryPoints: ['src/api/v1/receiptJournalSync.ts'], bundle: true, platform: 'node', format: 'esm', outfile: bundlePath, logLevel: 'silent' });
const modulePromise = import(`${pathToFileURL(bundlePath).href}?${Date.now()}`);
const receipt = number => ({ key: `k${number}`, operation: 'op', canonical: '{}', response: { revision: number } });

test('receipt journal sync describes appends, front eviction, and unknown history', async () => {
  const { ApiReceiptJournalTracker } = await modulePromise;
  const tracker = new ApiReceiptJournalTracker(value => JSON.stringify(value));
  const all = Array.from({ length: 10 }, (_, index) => receipt(index));
  const first = tracker.plan('a', all.slice(0, 3));
  assert.equal(first.full, true);
  assert.equal(first.appended.length, 3);
  tracker.confirm('a', all.slice(0, 3));

  const append = tracker.plan('a', all.slice(0, 5));
  assert.deepEqual({ ...append, appended: append.appended.length }, { baseCount: 3, evicted: 0, appended: 2 });
  tracker.confirm('a', all.slice(0, 5));
  const slide = tracker.plan('a', all.slice(2, 7));
  assert.deepEqual({ ...slide, appended: slide.appended.length }, { baseCount: 5, evicted: 2, appended: 2 });
  assert.equal(slide.appended[0], JSON.stringify(all[5]));
  tracker.confirm('a', all.slice(2, 7));

  const same = tracker.plan('a', all.slice(2, 7));
  assert.deepEqual({ ...same, appended: same.appended.length }, { baseCount: 5, evicted: 0, appended: 0 });
  assert.equal(tracker.plan('a', [receipt(1), receipt(2)]).full, true, 'unknown receipts fall back to a full resend');
  assert.equal(tracker.plan('a', [all[2], receipt(99)]).full, true, 'a changed middle falls back to a full resend');
  assert.equal(tracker.plan('b', all.slice(0, 2)).full, true, 'accounts are tracked independently');
  assert.equal(tracker.plan('a', all.slice(2, 7), true).full, true, 'a forced plan resends everything');
  assert.deepEqual(tracker.plan('a', []), { baseCount: 5, evicted: 5, appended: [] });
});
