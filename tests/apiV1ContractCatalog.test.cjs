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
  assert.equal(catalog.operations.length, 83);
  assert.equal(new Set(catalog.operations.map(operation => `${operation.method} ${operation.path}`)).size, 83);
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

  const ajv = new Ajv({ strict: true });
  for (const operation of catalog.operations) {
    assert.ok(['query', 'json', 'multipart', 'binary', 'sse'].includes(operation.transport), operation.operationId);
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
  }
});
