const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const Ajv = require('ajv');

test('checked-in API v1 catalog matches the normative endpoint index', () => {
  execFileSync(process.execPath, ['scripts/generate-api-v1-contract.mjs', '--check'], { cwd: process.cwd() });
  const catalog = JSON.parse(readFileSync('desktop/api-v1-contract.json', 'utf8'));
  assert.equal(catalog.apiVersion, 'v1');
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.operations.length, 85);
  assert.equal(new Set(catalog.operations.map(operation => `${operation.method} ${operation.path}`)).size, 85);
  assert.equal(catalog.operations.some(operation => operation.path.startsWith('/experimental/')), false);
  assert.deepEqual(catalog.limits, {
    jsonBodyBytes: 1048576,
    backupImportBytes: 33554432,
    feedbackAttachmentCount: 4,
    feedbackAttachmentBytes: 8388608,
    feedbackTotalBytes: 20971520,
    pageLimitDefault: 100,
    pageLimitMaximum: 200,
  });

  assert.ok(Array.isArray(catalog.errors) && catalog.errors.length > 0);
  assert.equal(new Set(catalog.errors.map(entry => entry.code)).size, catalog.errors.length, 'error codes must be unique');
  for (const entry of catalog.errors) {
    assert.ok(Number.isInteger(entry.status) && entry.status >= 400 && entry.status < 600, `error ${entry.code} status`);
    assert.ok(typeof entry.code === 'string' && entry.code.length > 0, 'error code');
    assert.ok(typeof entry.meaning === 'string' && entry.meaning.length > 0, `error ${entry.code} meaning`);
  }

  const knownErrorCodes = new Set(catalog.errors.map(entry => entry.code));
  const ajv = new Ajv({ strict: true });
  for (const operation of catalog.operations) {
    assert.ok(['query', 'json', 'multipart', 'binary', 'sse'].includes(operation.transport), operation.operationId);

    assert.ok(Array.isArray(operation.errors) && operation.errors.length > 0, `${operation.operationId} is missing applicable errors`);
    assert.equal(new Set(operation.errors).size, operation.errors.length, `${operation.operationId} lists a duplicate error code`);
    assert.deepEqual(operation.errors, [...operation.errors].sort(), `${operation.operationId} errors must be sorted`);
    for (const code of operation.errors) assert.ok(knownErrorCodes.has(code), `${operation.operationId} references unknown error code ${code}`);
    assert.ok(['invalid_request', 'runtime_unavailable', 'internal_error'].every(code => operation.errors.includes(code)), `${operation.operationId} is missing a baseline error code`);
    if (operation.access !== 'public') assert.ok(operation.errors.includes('authentication_required') && operation.errors.includes('authentication_failed'), `${operation.operationId} must document bootstrap auth failures`);
    if (operation.access === 'session') assert.ok(['login_required', 'control_lease_invalid', 'control_lease_expired'].every(code => operation.errors.includes(code)), `${operation.operationId} must document session lease failures`);

    assert.ok(operation.restrictions && typeof operation.restrictions === 'object', `${operation.operationId} is missing restrictions`);
    assert.ok(operation.restrictions.environments === 'all' || Array.isArray(operation.restrictions.environments), `${operation.operationId} restrictions.environments`);
    assert.equal(typeof operation.restrictions.requiresDebugMode, 'boolean', `${operation.operationId} restrictions.requiresDebugMode`);
    assert.equal(operation.restrictions.requiresLogin, operation.access === 'session', `${operation.operationId} restrictions.requiresLogin must mirror session access`);
    if (operation.restrictions.requiresDebugMode) assert.deepEqual(operation.restrictions.environments, ['dev', 'beta'], `${operation.operationId} debug-gated environments`);
    for (const member of ['pathParameters', 'query', 'body']) {
      assert.equal(operation[member].type, 'object', `${operation.operationId} ${member}`);
      assert.equal(operation[member].additionalProperties, false, `${operation.operationId} ${member}`);
      const validate = ajv.compile(operation[member]);
      const example = operation.examples.request[member] ?? {};
      assert.equal(validate(structuredClone(example)), true, `${operation.operationId} ${member}: ${JSON.stringify(validate.errors)}`);
    }
    const invalidMember = operation.method === 'GET' ? 'query' : 'body';
    const validateInvalid = ajv.compile(operation[invalidMember]);
    assert.equal(validateInvalid(structuredClone(operation.examples.invalidRequest[invalidMember])), false, `${operation.operationId} invalid example`);

    assert.ok(operation.response && operation.response.data, `${operation.operationId} is missing a response schema`);
    assert.equal(operation.response.data.type, 'object', `${operation.operationId} response.data`);
    assert.equal(operation.response.data.additionalProperties, false, `${operation.operationId} response.data`);
    const validateResponse = ajv.compile(operation.response.data);
    const responseExample = operation.examples.response.data;
    assert.equal(validateResponse(structuredClone(responseExample)), true, `${operation.operationId} response example: ${JSON.stringify(validateResponse.errors)}`);

    if (operation.transport === 'sse' || operation.operationId === 'commit/setting/backup/export') {
      assert.equal(operation.response.envelope, null, `${operation.operationId} should not have a JSON envelope (${operation.transport} transport)`);
      continue;
    }
    assert.ok(operation.response.envelope, `${operation.operationId} is missing a response envelope schema`);
    assert.equal(operation.response.envelope.type, 'object', `${operation.operationId} response.envelope`);
    assert.equal(operation.response.envelope.additionalProperties, false, `${operation.operationId} response.envelope`);
    const validateEnvelope = ajv.compile(operation.response.envelope);
    const isCommit = operation.operationId.startsWith('commit/');
    const envelopeExample = isCommit
      ? { apiVersion: 'v1', schemaVersion: 1, requestId: 'x'.repeat(8), previousRevision: 0, revision: 1, committedAt: new Date(0).toISOString(), data: responseExample, effects: [], changedResources: [] }
      : { apiVersion: 'v1', schemaVersion: 1, requestId: 'x'.repeat(8), observedAt: new Date(0).toISOString(), data: responseExample };
    assert.equal(validateEnvelope(structuredClone(envelopeExample)), true, `${operation.operationId} envelope example: ${JSON.stringify(validateEnvelope.errors)}`);
  }
});

test('searchItems response schema accepts every documented result format', () => {
  const Ajv = require('ajv');
  const catalog = require('../desktop/api-v1-contract.json');
  const schema = catalog.operations.find((operation) => operation.operationId === 'read/base/searchItems').response.data;
  const validate = new Ajv({ strict: true }).compile(schema);
  const accepted = [
    '0/1101/2/0/3/18',
    '0/1211/0/0/2/1.62',
    '0/1104/0/12/1/12/ability=[a.pursuit]/cBonus=[c.magical-defense-x2/3]/otherBonus=[d.melee_attack:6, d.HP:20, e.ice+0.020]',
    '0/1104/0/12/1/24/ability=[]/cBonus=[]',
    '1/1211/0/0/101/fort:3/51',
    '1/1211/0/0/101/0:0/1.08',
    '1/1211/0/0/101/0:0/33/ability=[]/cBonus=[c.evasion+0.010]/otherBonus=[]',
    'fort:3/2',
    'fort:3/2/ability=[]/cBonus=[c.physical-defense+11]/otherBonus=[d.HP:10]',
  ];
  const page = (items) => ({ items, totalCount: items.length, truncated: false });
  assert.equal(validate(page(accepted)), true, JSON.stringify(validate.errors));
  for (const rejected of ['', 'nonsense', '0/1101/2/0', '0/1101/2/0/3', 'fort:9/2', '0/1101/2/0/3/junk', '1/1211/0/0/101/fort:3']) {
    assert.equal(validate(page([rejected])), false, `${rejected} must not validate`);
  }
  assert.equal(validate({ items: [] }), false, 'totalCount and truncated are required, so a cut-off list is never silent');
  assert.equal(validate({ ...page([]), equippedItems: [] }), false, 'equippedItems is no longer part of the response');
  assert.equal(validate({ ...page([]), nextCursor: null }), false, 'limit replaces the cursor for this operation');
});
