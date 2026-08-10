const crypto = require('node:crypto');
const http = require('node:http');

const API_PREFIX = '/experimental/v1';
const API_VERSION = 'experimental/v1';
const SCHEMA_VERSION = 1;
const LEASE_IDLE_TIMEOUT_MS = 300_000;
const MAX_BODY_BYTES = 1_000_000;

function apiError(code, message, retryable = false, details) {
  return { error: { code, message, retryable, ...(details ? { details } : {}) } };
}

function timingSafeEqualString(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function createExperimentalApi(options) {
  let server = null;
  let bearerToken = null;
  let port = null;
  let enabled = false;
  let busy = false;
  let shuttingDown = false;
  let lease = null;
  let expiryTimer = null;

  const nowMonotonic = () => Number(process.hrtime.bigint() / 1_000_000n);
  const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

  function send(response, status, payload, extraHeaders = {}) {
    response.writeHead(status, { ...jsonHeaders, ...extraHeaders });
    response.end(JSON.stringify(payload));
  }

  function renewLease() {
    if (!lease) return;
    lease.deadline = nowMonotonic() + LEASE_IDLE_TIMEOUT_MS;
    lease.expiresAt = Date.now() + LEASE_IDLE_TIMEOUT_MS;
    scheduleExpiry();
  }

  function scheduleExpiry() {
    if (expiryTimer) clearTimeout(expiryTimer);
    if (!lease || busy) return;
    const delay = Math.max(1, lease.deadline - nowMonotonic());
    expiryTimer = setTimeout(() => void expireLease(), delay);
  }

  async function expireLease() {
    if (!lease || busy) return;
    if (nowMonotonic() < lease.deadline) return scheduleExpiry();
    lease = null;
    try { await options.invokeRenderer('set-control', { active: false, reason: 'inactivity' }); } catch { /* renderer recovery occurs on its next registration */ }
  }

  function authenticate(request) {
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
    return timingSafeEqualString(authorization.slice(7), bearerToken);
  }

  async function readJson(request, allowMissing = false) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) throw new Error('request_too_large');
      chunks.push(chunk);
    }
    if (chunks.length === 0) {
      if (allowMissing) return undefined;
      throw new Error('missing_body');
    }
    const contentType = String(request.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') throw new Error('invalid_content_type');
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  function validateLease(request) {
    if (!lease) return { status: 409, body: apiError('no_active_lease', 'No Experimental API control lease is active.') };
    const supplied = request.headers['x-bokemo-control-lease'];
    if (!timingSafeEqualString(supplied, lease.token)) {
      return { status: 403, body: apiError('control_lease_invalid', 'The supplied control lease is invalid.') };
    }
    if (!busy && nowMonotonic() >= lease.deadline) {
      void expireLease();
      return { status: 409, body: apiError('control_lease_expired', 'The control lease has expired.') };
    }
    if (lease.releasing) return { status: 409, body: apiError('control_releasing', 'The control lease is being released.', true) };
    return null;
  }

  async function rendererCall(operation, payload) {
    const result = await options.invokeRenderer(operation, payload);
    if (!result || typeof result !== 'object') throw new Error('invalid_renderer_response');
    return result;
  }

  async function handleStatus(request, response) {
    if (request.method !== 'GET') return send(response, 405, apiError('method_not_allowed', 'This endpoint requires GET.'), { Allow: 'GET' });
    if (request.url !== `${API_PREFIX}/status`) return send(response, 400, apiError('invalid_request', 'Query parameters are not supported.'));
    if (!request.headers.authorization) {
      return send(response, 200, { apiVersion: API_VERSION, authenticationRequired: true, status: 'available' });
    }
    if (!authenticate(request)) return send(response, 401, apiError('authentication_failed', 'The supplied bearer token is invalid.'));
    let runtime;
    try { runtime = await rendererCall('status', {}); } catch {
      return send(response, 503, apiError('runtime_unavailable', 'The authoritative renderer is unavailable.', true));
    }
    const owned = lease && timingSafeEqualString(request.headers['x-bokemo-control-lease'], lease.token);
    return send(response, 200, {
      apiVersion: API_VERSION,
      schemaVersion: SCHEMA_VERSION,
      game: { version: options.version, build: options.build, environment: options.environment },
      runtime: { status: busy ? 'busy' : runtime.status, revision: runtime.revision ?? null },
      control: { status: lease ? 'leased' : 'available', ownedByCaller: Boolean(owned), leaseExpiresAt: lease?.expiresAt ?? null },
    });
  }

  async function handleAcquire(request, response) {
    if (request.method !== 'POST') return send(response, 405, apiError('method_not_allowed', 'This endpoint requires POST.'), { Allow: 'POST' });
    if (!authenticate(request)) return send(response, 401, apiError('authentication_failed', 'Bearer authentication is required.'));
    let body;
    try { body = await readJson(request, true); } catch { return send(response, 400, apiError('invalid_request', 'The request body is invalid.')); }
    if (body !== undefined) {
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => key !== 'client')) return send(response, 400, apiError('invalid_request', 'Unknown or invalid acquisition property.'));
      if (body.client !== undefined) {
        const client = body.client;
        if (!client || typeof client !== 'object' || Array.isArray(client) || Object.keys(client).some((key) => !['name', 'version'].includes(key))) return send(response, 400, apiError('invalid_request', 'Client metadata is invalid.'));
        if (typeof client.name !== 'string' || client.name.trim().length < 1 || client.name.trim().length > 64 || (client.version !== undefined && (typeof client.version !== 'string' || client.version.trim().length < 1 || client.version.trim().length > 64))) return send(response, 400, apiError('invalid_request', 'Client metadata is invalid.'));
      }
    }
    if (busy) return send(response, 409, apiError('runtime_busy', 'The runtime is busy.', true));
    if (lease) return send(response, 409, apiError('control_already_leased', 'Experimental API control is already leased.', true, { leaseExpiresAt: lease.expiresAt }));
    let runtime;
    try { runtime = await rendererCall('set-control', { active: true, reason: 'acquire' }); } catch {
      return send(response, 503, apiError('runtime_unavailable', 'The renderer could not enter API-controlled mode.', true));
    }
    if (runtime.status !== 'ready') return send(response, 503, apiError(runtime.status === 'save_error' ? 'save_error' : 'runtime_loading', 'The runtime is not ready.', runtime.status !== 'save_error'));
    const acquiredAt = Date.now();
    lease = { token: crypto.randomBytes(32).toString('base64url'), acquiredAt, expiresAt: acquiredAt + LEASE_IDLE_TIMEOUT_MS, deadline: nowMonotonic() + LEASE_IDLE_TIMEOUT_MS, releasing: false };
    scheduleExpiry();
    return send(response, 200, { apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, lease: { token: lease.token, acquiredAt, expiresAt: lease.expiresAt, idleTimeoutMs: LEASE_IDLE_TIMEOUT_MS }, runtime: { status: 'ready', revision: runtime.revision } });
  }

  async function handleOwned(request, response, operation) {
    if (request.method !== (operation === 'observation' ? 'GET' : 'POST')) {
      const allow = operation === 'observation' ? 'GET' : 'POST';
      return send(response, 405, apiError('method_not_allowed', `This endpoint requires ${allow}.`), { Allow: allow });
    }
    if (!authenticate(request)) return send(response, 401, apiError('authentication_failed', 'Bearer authentication is required.'));
    const leaseFailure = validateLease(request);
    if (leaseFailure) return send(response, leaseFailure.status, leaseFailure.body);
    if (busy) return send(response, 409, apiError('runtime_busy', 'Another API operation is executing.', true));
    let body;
    try {
      body = operation === 'observation' ? undefined : await readJson(request, operation === 'release');
      if (operation === 'observation' && request.url !== `${API_PREFIX}/observation`) throw new Error('query');
    } catch { return send(response, 400, apiError('invalid_request', 'The request input is invalid.')); }
    if (operation === 'release' && body !== undefined && (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)) return send(response, 400, apiError('invalid_request', 'Release accepts only an empty object.'));
    busy = true;
    if (operation === 'release') lease.releasing = true;
    try {
      const result = await rendererCall(operation, body ?? {});
      if (result.error) return send(response, result.status ?? 500, result);
      if (operation === 'release') {
        const releasedAt = Date.now();
        lease = null;
        if (expiryTimer) clearTimeout(expiryTimer);
        return send(response, 200, { apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, release: { releasedAt, reason: 'client_request', statePersisted: true }, runtime: { status: 'ready', revision: result.revision, controlStatus: 'available' } });
      }
      renewLease();
      return send(response, 200, { apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, ...result });
    } catch {
      if (operation === 'release' && lease) { lease.releasing = false; renewLease(); }
      return send(response, 503, apiError('runtime_unavailable', 'The authoritative renderer is unavailable.', true));
    } finally {
      busy = false;
      scheduleExpiry();
    }
  }

  async function handle(request, response) {
    response.setHeader('Access-Control-Allow-Origin', 'null');
    const pathname = (() => { try { return new URL(request.url, 'http://127.0.0.1').pathname; } catch { return ''; } })();
    if (pathname === `${API_PREFIX}/status`) return handleStatus(request, response);
    if (pathname === `${API_PREFIX}/control/acquire`) return handleAcquire(request, response);
    const routes = new Map([
      [`${API_PREFIX}/control/release`, 'release'],
      [`${API_PREFIX}/build-options`, 'build-options'],
      [`${API_PREFIX}/observation`, 'observation'],
      [`${API_PREFIX}/command`, 'command'],
      [`${API_PREFIX}/sortie`, 'sortie'],
    ]);
    const operation = routes.get(pathname);
    if (operation) return handleOwned(request, response, operation);
    return send(response, 404, apiError('not_found', 'The requested endpoint does not exist.'));
  }

  async function enable() {
    if (enabled) return getSettings();
    bearerToken = crypto.randomBytes(32).toString('base64url');
    server = http.createServer((request, response) => void handle(request, response));
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    port = server.address().port;
    enabled = true;
    return getSettings();
  }

  async function disable() {
    enabled = false;
    lease = null;
    bearerToken = null;
    port = null;
    if (expiryTimer) clearTimeout(expiryTimer);
    try { await options.invokeRenderer('set-control', { active: false, reason: 'disabled' }); } catch { /* no active renderer */ }
    const activeServer = server;
    server = null;
    if (activeServer) await new Promise((resolve) => activeServer.close(resolve));
    return getSettings();
  }

  function getSettings() {
    return { supported: true, enabled, host: '127.0.0.1', port, token: bearerToken, apiVersion: API_VERSION };
  }

  async function shutdown() {
    shuttingDown = true;
    await disable();
  }

  return { enable, disable, getSettings, shutdown, get isShuttingDown() { return shuttingDown; } };
}

module.exports = { createExperimentalApi, API_PREFIX, API_VERSION, SCHEMA_VERSION };
