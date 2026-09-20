const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { Readable } = require('node:stream');
const Ajv = require('ajv');
const catalog = require('./api-v1-contract.json');

// SpecRef: 9.1.4.6 | HTTP authentication and exclusive control | loopback transport

const API_PREFIX = '/api/v1';
const API_VERSION = 'v1';
const SCHEMA_VERSION = 1;
const LEASE_IDLE_TIMEOUT_MS = 300_000;
const MAX_JSON_BODY_BYTES = 1024 * 1024;
const MAX_MULTIPART_BODY_BYTES = 32 * 1024 * 1024;
const PUBLIC_OPERATIONS = new Set(['fundamental/status', 'help/overview', 'help/endpoints']);
const parameterAjv = new Ajv({ allErrors: true, strict: true, coerceTypes: true, useDefaults: true });
const bodyAjv = new Ajv({ allErrors: true, strict: true, coerceTypes: false, useDefaults: true });
// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Concrete response catalog
const responseAjv = new Ajv({ allErrors: true, strict: true, coerceTypes: false, useDefaults: false });

function timingSafeEqualString(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function compileRoute(operation) {
  const names = [];
  const pattern = operation.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{([^}]+)\\\}/g, (_match, name) => {
    names.push(name);
    return '([^/]+)';
  });
  return {
    ...operation,
    names,
    pattern: new RegExp(`^${pattern}$`),
    validators: {
      pathParameters: parameterAjv.compile(operation.pathParameters),
      query: parameterAjv.compile(operation.query),
      body: bodyAjv.compile(operation.body),
      response: responseAjv.compile(operation.response.data),
      // SSE and the raw-binary backup export never go through the JSON read/commit envelope construction below.
      envelope: operation.response.envelope ? responseAjv.compile(operation.response.envelope) : null,
    },
  };
}

const ROUTES = catalog.operations.map(compileRoute);

function createApiV1(options) {
  let server = null;
  let enabled = false;
  let bearerToken = null;
  let port = null;
  let descriptorPath = null;
  let lease = null;
  let expiryTimer = null;
  let shuttingDown = false;
  let admissionClosed = false;
  let activeOperations = 0;
  const streams = new Set();

  const nowMonotonic = () => Number(process.hrtime.bigint() / 1_000_000n);

  function requestId() { return crypto.randomUUID(); }
  function baseEnvelope(id) { return { apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, requestId: id }; }
  function errorEnvelope(id, code, message, revision, details) {
    return { ...baseEnvelope(id), ...(Number.isInteger(revision) ? { revision } : {}), error: { code, message, ...(details ? { details } : {}) } };
  }
  function sendJson(response, status, body, headers = {}) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    response.end(JSON.stringify(body));
  }

  function closeStreams(reason = 'resyncRequired') {
    for (const stream of streams) {
      try {
        if (!stream.response.writableEnded) stream.response.write(`event: ${reason}\ndata: ${JSON.stringify({ apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION })}\n\n`);
        stream.response.end();
      } catch { /* the peer already disconnected */ }
      clearInterval(stream.heartbeat);
      clearInterval(stream.poll);
    }
    streams.clear();
  }

  function validateSchema(validator, value) {
    if (validator(value)) return;
    const validationError = Object.assign(new Error('schema_validation_failed'), { status: 400, code: 'invalid_request' });
    validationError.details = { issues: validator.errors?.map(error => ({ path: error.instancePath, keyword: error.keyword })) ?? [] };
    throw validationError;
  }

  // A response mismatch is an implementation drift against the operation's own catalog contract, not caller error,
  // so it fails closed as `internal_error` before anything is written rather than leaking a malformed payload.
  function assertAgainstCatalog(route, validator, label, value) {
    if (validator(value)) return;
    const issues = validator.errors?.map(error => ({ path: error.instancePath, keyword: error.keyword })) ?? [];
    console.error(`api-v1: ${route.operationId} produced a ${label} that does not match its catalog schema`, issues);
    throw Object.assign(new Error(`${label}_schema_mismatch`), { status: 500, code: 'internal_error' });
  }
  function assertResponseData(route, data) { assertAgainstCatalog(route, route.validators.response, 'response', data); }
  function assertEnvelope(route, envelope) { if (route.validators.envelope) assertAgainstCatalog(route, route.validators.envelope, 'envelope', envelope); }

  function authenticateBootstrap(request, id) {
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string') return { status: 401, body: errorEnvelope(id, 'authentication_required', 'Bearer authentication is required.') };
    if (!authorization.startsWith('Bearer ') || !timingSafeEqualString(authorization.slice(7), bearerToken)) {
      return { status: 401, body: errorEnvelope(id, 'authentication_failed', 'Bearer authentication failed.') };
    }
    return null;
  }

  function authenticateSession(request, id) {
    const bootstrapFailure = authenticateBootstrap(request, id);
    if (bootstrapFailure) return bootstrapFailure;
    if (!lease) return { status: 401, body: errorEnvelope(id, 'login_required', 'A control session is required.') };
    if (nowMonotonic() >= lease.deadline && lease.pins === 0) {
      void expireLease();
      return { status: 401, body: errorEnvelope(id, 'control_lease_expired', 'The control lease expired.') };
    }
    if (!timingSafeEqualString(request.headers['x-bokemo-session'], lease.sessionToken)) {
      return { status: 401, body: errorEnvelope(id, 'login_required', 'The session token is invalid.') };
    }
    if (!timingSafeEqualString(request.headers['x-bokemo-control-lease'], lease.controlLeaseToken)) {
      return { status: 401, body: errorEnvelope(id, 'control_lease_invalid', 'The control lease is invalid.') };
    }
    return null;
  }

  function renewLease() {
    if (!lease) return;
    lease.deadline = nowMonotonic() + LEASE_IDLE_TIMEOUT_MS;
    lease.expiresAt = Date.now() + LEASE_IDLE_TIMEOUT_MS;
    scheduleExpiry();
  }
  function scheduleExpiry() {
    if (expiryTimer) clearTimeout(expiryTimer);
    if (!lease || lease.pins > 0) return;
    expiryTimer = setTimeout(() => void expireLease(), Math.max(1, lease.deadline - nowMonotonic()));
  }
  async function expireLease() {
    if (!lease || lease.pins > 0 || nowMonotonic() < lease.deadline) return scheduleExpiry();
    const expired = lease;
    lease = null;
    closeStreams();
    try { await options.invokeApplication('fundamental/logOut', { reason: 'inactivity', identity: expired.identity }); } catch { /* durable account state remains authoritative */ }
  }

  async function readJson(request, allowEmpty = false) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > MAX_JSON_BODY_BYTES) throw Object.assign(new Error('payload_too_large'), { status: 413, code: 'payload_too_large' });
      chunks.push(chunk);
    }
    if (chunks.length === 0) {
      if (allowEmpty) return {};
      throw Object.assign(new Error('missing_body'), { status: 400, code: 'invalid_request' });
    }
    const contentType = String(request.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') throw Object.assign(new Error('unsupported_media_type'), { status: 415, code: 'unsupported_media_type' });
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw Object.assign(new Error('invalid_json'), { status: 400, code: 'invalid_request' }); }
  }

  async function readMultipart(request, route) {
    const contentType = String(request.headers['content-type'] ?? '');
    if (!contentType.toLowerCase().startsWith('multipart/form-data;')) throw Object.assign(new Error('unsupported_media_type'), { status: 415, code: 'unsupported_media_type' });
    const declared = Number(request.headers['content-length'] ?? 0);
    if (declared > MAX_MULTIPART_BODY_BYTES) throw Object.assign(new Error('payload_too_large'), { status: 413, code: 'payload_too_large' });
    const webRequest = new Request('http://127.0.0.1/upload', { method: 'POST', headers: request.headers, body: Readable.toWeb(request), duplex: 'half' });
    let form;
    try { form = await webRequest.formData(); } catch { throw Object.assign(new Error('invalid_multipart'), { status: 400, code: 'invalid_request' }); }
    const metadataPart = form.getAll('metadata');
    if (metadataPart.length !== 1) throw Object.assign(new Error('invalid_metadata_count'), { status: 400, code: 'invalid_request' });
    const metadataText = typeof metadataPart[0] === 'string' ? metadataPart[0] : await metadataPart[0].text();
    if (Buffer.byteLength(metadataText) > MAX_JSON_BODY_BYTES) throw Object.assign(new Error('metadata_too_large'), { status: 413, code: 'payload_too_large' });
    let metadata;
    try { metadata = JSON.parse(metadataText); } catch { throw Object.assign(new Error('invalid_metadata'), { status: 400, code: 'invalid_request' }); }
    validateSchema(route.validators.body, metadata);
    const files = {};
    for (const [name, value] of form.entries()) {
      if (name === 'metadata') continue;
      if (typeof value === 'string' || files[name]) throw Object.assign(new Error('invalid_file_part'), { status: 400, code: 'invalid_request' });
      const bytes = Buffer.from(await value.arrayBuffer());
      const mediaType = value.type || 'application/octet-stream';
      const validImageSignature = mediaType === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mediaType === 'image/jpeg'
          ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
          : mediaType === 'image/webp'
            ? bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
            : true;
      files[name] = { mediaType, byteLength: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), contentBase64: bytes.toString('base64'), validImageSignature };
    }
    if (route.operationId === 'commit/setting/backup/import') {
      if (Object.keys(files).length !== 1 || !files.backup || files.backup.byteLength > MAX_MULTIPART_BODY_BYTES) throw Object.assign(new Error('invalid_backup'), { status: 400, code: 'invalid_request' });
    } else {
      const requested = metadata.parameters?.attachments ?? [];
      if (!Array.isArray(requested) || requested.length > 4 || Object.keys(files).length !== requested.length || requested.some((name, index) => name !== `attachment${index}` || !files[name])) throw Object.assign(new Error('invalid_attachments'), { status: 400, code: 'invalid_request' });
      let total = 0;
      for (const file of Object.values(files)) {
        total += file.byteLength;
        if (file.byteLength > 8 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.mediaType) || !file.validImageSignature) throw Object.assign(new Error('invalid_attachment'), { status: 400, code: 'invalid_request' });
      }
      if (total > 20 * 1024 * 1024) throw Object.assign(new Error('attachments_too_large'), { status: 413, code: 'payload_too_large' });
    }
    return { ...metadata, uploadedFiles: files };
  }

  function decodeQuery(url, pathParameters) {
    const parameters = { ...pathParameters };
    for (const key of new Set(url.searchParams.keys())) {
      const values = url.searchParams.getAll(key);
      parameters[key] = values.length === 1 ? values[0] : values;
    }
    return parameters;
  }

  async function invoke(operation, payload, id) {
    if (admissionClosed) return { status: 503, body: errorEnvelope(id, 'runtime_unavailable', 'The API is stopping.') };
    activeOperations += 1;
    if (lease) { lease.pins += 1; scheduleExpiry(); }
    try {
      const result = await options.invokeApplication(operation.operationId, payload);
      if (result?.error) return { status: result.status ?? 500, body: { ...baseEnvelope(id), ...(Number.isInteger(result.revision) ? { revision: result.revision } : {}), error: result.error } };
      return { status: 200, result };
    } catch {
      return { status: 503, body: errorEnvelope(id, 'runtime_unavailable', 'The game authority is unavailable.') };
    } finally {
      activeOperations -= 1;
      if (lease) { lease.pins = Math.max(0, lease.pins - 1); scheduleExpiry(); }
    }
  }

  async function handle(request, response) {
    const id = requestId();
    let url;
    try { url = new URL(request.url, 'http://127.0.0.1'); }
    catch { return sendJson(response, 400, errorEnvelope(id, 'invalid_request', 'The request URL is invalid.')); }

    if (request.headers.origin && request.headers.origin !== options.allowedOrigin) {
      return sendJson(response, 401, errorEnvelope(id, 'authentication_failed', 'The request origin is not allowed.'));
    }

    let route = null;
    let pathParameters = {};
    for (const candidate of ROUTES) {
      if (candidate.method !== request.method) continue;
      const match = candidate.pattern.exec(url.pathname);
      if (!match) continue;
      route = candidate;
      try { pathParameters = Object.fromEntries(candidate.names.map((name, index) => [name, decodeURIComponent(match[index + 1])])); }
      catch { return sendJson(response, 400, errorEnvelope(id, 'invalid_request', 'A path parameter is invalid.')); }
      break;
    }
    if (!route) {
      const pathRoute = ROUTES.find(candidate => candidate.pattern.test(url.pathname));
      return pathRoute
        ? sendJson(response, 405, errorEnvelope(id, 'method_not_allowed', 'The HTTP method is not allowed.'), { Allow: pathRoute.method })
        : sendJson(response, 404, errorEnvelope(id, 'not_found', 'The endpoint does not exist.'));
    }

    if (!PUBLIC_OPERATIONS.has(route.operationId)) {
      const failure = route.access === 'session' ? authenticateSession(request, id) : authenticateBootstrap(request, id);
      if (failure) return sendJson(response, failure.status, failure.body);
    }

    let payload;
    try {
      if (route.method === 'GET') {
        if (request.headers['content-length'] && request.headers['content-length'] !== '0') throw Object.assign(new Error('get_body'), { status: 400, code: 'invalid_request' });
        const query = decodeQuery(url, {});
        validateSchema(route.validators.pathParameters, pathParameters);
        validateSchema(route.validators.query, query);
        payload = { parameters: { ...pathParameters, ...query }, pathParameters, transport: { requestId: id, lastEventId: request.headers['last-event-id'] ?? null } };
      } else {
        const multipart = route.operationId === 'commit/setting/backup/import' || route.operationId === 'commit/setting/feedback';
        const body = multipart ? await readMultipart(request, route) : await readJson(request, route.operationId === 'fundamental/logOut');
        validateSchema(route.validators.pathParameters, pathParameters);
        if (!multipart) validateSchema(route.validators.body, body);
        payload = { ...body, pathParameters, transport: { requestId: id } };
      }
    } catch (error) {
      return sendJson(response, error.status ?? 400, errorEnvelope(id, error.code ?? 'invalid_request', 'The request is invalid.'));
    }

    if (route.operationId === 'fundamental/logIn' && lease) {
      return sendJson(response, 409, errorEnvelope(id, 'control_unavailable', 'Another client holds control.'));
    }

    const invoked = await invoke(route, payload, id);
    if (invoked.body) return sendJson(response, invoked.status, invoked.body, invoked.status === 429 ? { 'Retry-After': '1' } : {});
    const result = invoked.result ?? {};

    if (route.operationId === 'read/observation/popupEventStream') {
      assertResponseData(route, result.data ?? {});
      renewLease();
      response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      response.flushHeaders();
      const events = Array.isArray(result.data?.events) ? result.data.events : [];
      for (const event of events) response.write(`id: ${event.eventId}\nevent: popup\ndata: ${JSON.stringify({ apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, ...event })}\n\n`);
      let cursor = events.at(-1)?.eventId ?? request.headers['last-event-id'] ?? null;
      const heartbeat = setInterval(() => { if (!response.writableEnded) response.write(': heartbeat\n\n'); }, 15_000);
      let polling = false;
      const poll = setInterval(async () => {
        if (polling || response.writableEnded) return;
        if (!lease || nowMonotonic() >= lease.deadline) { closeStreams(); return; }
        polling = true;
        try {
          const update = await options.invokeApplication(route.operationId, { parameters: {}, pathParameters: {}, transport: { requestId: requestId(), lastEventId: cursor } });
          if (update?.error) { response.write(`event: resyncRequired\ndata: ${JSON.stringify({ apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, revision: update.revision })}\n\n`); response.end(); return; }
          for (const event of update?.data?.events ?? []) {
            response.write(`id: ${event.eventId}\nevent: popup\ndata: ${JSON.stringify({ apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, ...event })}\n\n`);
            cursor = event.eventId;
          }
        } catch { response.end(); }
        finally { polling = false; }
      }, 1_000);
      const stream = { response, heartbeat, poll };
      streams.add(stream);
      request.once('close', () => { clearInterval(heartbeat); clearInterval(poll); streams.delete(stream); });
      return;
    }

    if (route.operationId === 'fundamental/logIn') {
      const now = Date.now();
      lease = {
        identity: result.identity ?? result.data,
        sessionToken: crypto.randomBytes(32).toString('base64url'),
        controlLeaseToken: crypto.randomBytes(32).toString('base64url'),
        deadline: nowMonotonic() + LEASE_IDLE_TIMEOUT_MS,
        expiresAt: now + LEASE_IDLE_TIMEOUT_MS,
        pins: 0,
      };
      scheduleExpiry();
      result.data = { ...(result.data ?? {}), sessionToken: lease.sessionToken, controlLeaseToken: lease.controlLeaseToken, leaseExpiresAt: new Date(lease.expiresAt).toISOString() };
    } else if (route.operationId === 'fundamental/logOut') {
      closeStreams();
      lease = null;
      if (expiryTimer) clearTimeout(expiryTimer);
    } else if (route.access === 'session') renewLease();

    assertResponseData(route, result.data ?? {});

    if (route.operationId.startsWith('commit/')) {
      if (route.operationId === 'commit/setting/backup/export' && typeof result.data?.savePayload === 'string') {
        const bytes = Buffer.from(result.data.savePayload, 'utf8');
        response.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="bokemo-backup.bokemo"',
          'Cache-Control': 'no-store',
          'X-BoKemo-Revision': String(result.revision),
          'X-BoKemo-Schema-Version': String(SCHEMA_VERSION),
        });
        response.end(bytes);
        return;
      }
      const commitBody = {
        ...baseEnvelope(result.requestId ?? id), previousRevision: result.previousRevision, revision: result.revision,
        committedAt: result.committedAt ?? new Date().toISOString(), data: result.data ?? {},
        effects: result.effects ?? [], changedResources: result.changedResources ?? [],
      };
      assertEnvelope(route, commitBody);
      return sendJson(response, 200, commitBody);
    }
    const cacheable = route.method === 'GET'
      && !['fundamental/status', 'read/observation', 'read/observation/compact', 'read/observation/popupEventStream'].includes(route.operationId);
    const etag = cacheable ? `"${Number.isInteger(result.revision) ? `rev-${result.revision}-` : ''}${crypto.createHash('sha256').update(JSON.stringify(result.data ?? {})).digest('base64url')}"` : null;
    if (etag && request.headers['if-none-match'] === etag) {
      response.writeHead(304, { ETag: etag, 'Cache-Control': 'private, no-cache' });
      response.end();
      return;
    }
    const readBody = {
      ...baseEnvelope(id), ...(Number.isInteger(result.revision) ? { revision: result.revision } : {}),
      observedAt: result.observedAt ?? new Date().toISOString(), data: result.data ?? {},
    };
    assertEnvelope(route, readBody);
    return sendJson(response, 200, readBody, etag ? { ETag: etag, 'Cache-Control': 'private, no-cache' } : {});
  }

  function writeDescriptor() {
    const directory = options.connectionDirectory;
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    descriptorPath = path.join(directory, 'api-v1-connection.json');
    const temporary = `${descriptorPath}.tmp-${process.pid}`;
    fs.writeFileSync(temporary, JSON.stringify({ endpoint: `http://127.0.0.1:${port}${API_PREFIX}`, token: bearerToken, apiVersion: API_VERSION }), { mode: 0o600 });
    fs.renameSync(temporary, descriptorPath);
    fs.chmodSync(descriptorPath, 0o600);
  }
  function removeDescriptor() {
    if (!descriptorPath) return;
    try { fs.unlinkSync(descriptorPath); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    descriptorPath = null;
  }

  async function enable() {
    if (options.allowEnable !== true) throw new Error('api_v1_not_public');
    if (enabled) return getSettings();
    admissionClosed = false;
    bearerToken = crypto.randomBytes(32).toString('base64url');
    server = http.createServer((request, response) => void handle(request, response).catch(() => {
      if (!response.headersSent) sendJson(response, 500, errorEnvelope(requestId(), 'internal_error', 'The API request failed.'));
    }));
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    port = server.address().port;
    writeDescriptor();
    enabled = true;
    return getSettings();
  }

  async function disable() {
    admissionClosed = true;
    const activeServer = server;
    server = null;
    closeStreams();
    if (activeServer) await new Promise(resolve => activeServer.close(resolve));
    if (lease) {
      try { await options.invokeApplication('fundamental/logOut', { reason: 'disabled', identity: lease.identity }); } catch { /* preserve last durable account save */ }
    }
    lease = null;
    enabled = false;
    bearerToken = null;
    port = null;
    if (expiryTimer) clearTimeout(expiryTimer);
    removeDescriptor();
    return getSettings();
  }

  function getSettings() {
    return { supported: options.allowEnable === true, enabled, host: '127.0.0.1', port, apiVersion: API_VERSION, connectionFile: descriptorPath };
  }

  async function shutdown() { shuttingDown = true; await disable(); }
  return { enable, disable, shutdown, getSettings, get isShuttingDown() { return shuttingDown; }, get activeOperations() { return activeOperations; } };
}

module.exports = { createApiV1, API_PREFIX, API_VERSION, SCHEMA_VERSION, LEASE_IDLE_TIMEOUT_MS };
