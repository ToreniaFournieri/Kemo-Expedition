const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// SpecRef: 9.1.4.12 | API account storage | generation-based manifest-last durability

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;
const ENVIRONMENTS = new Set(['dev', 'beta', 'orca', 'prod', 'desktop']);

function validateIdentity(identity) {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) throw new Error('invalid_identity');
  if (!USER_ID_PATTERN.test(identity.userId ?? '')) throw new Error('invalid_user_id');
  if (!ENVIRONMENTS.has(identity.environment)) throw new Error('invalid_environment');
  if (!['normal', 'orca'].includes(identity.gameMode)) throw new Error('invalid_game_mode');
  const offset = identity.gameMode === 'orca' ? (identity.levelOffsetForOrca ?? 5) : null;
  if (offset !== null && (!Number.isInteger(offset) || offset < 0 || offset > 20)) throw new Error('invalid_level_offset');
  return { userId: identity.userId, environment: identity.environment, gameMode: identity.gameMode, levelOffsetForOrca: offset };
}

function createApiAccountStore({ userDataPath, beforeManifestWrite = null }) {
  const usersRoot = path.join(userDataPath, 'users');

  function resolveAccount(identity) {
    const normalized = validateIdentity(identity);
    const modeDirectory = normalized.gameMode === 'orca' ? `orca${normalized.levelOffsetForOrca}` : 'normal';
    return { normalized, directory: path.join(usersRoot, normalized.environment, modeDirectory, normalized.userId) };
  }

  function readJson(filePath, fallback) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch (error) { if (error?.code === 'ENOENT') return fallback; throw error; }
  }

  function writeAtomic(filePath, content, mode = 0o600) {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    try {
      fs.writeFileSync(temporaryPath, content, { encoding: 'utf8', mode, flag: 'wx' });
      fs.renameSync(temporaryPath, filePath);
      fs.chmodSync(filePath, mode);
    } finally {
      // Best-effort cleanup: a failure here must never mask the write/rename outcome above.
      try { fs.unlinkSync(temporaryPath); } catch { /* the temporary file is already gone or unremovable */ }
    }
  }

  // SpecRef: 5.1 | Records made unreachable may be deleted only after the manifest that drops them is durable.
  // Every commit writes a new control generation; without this the account directory grows by one full save and control file
  // per commit (tens of GB over a long API run). Also removes generations and temporary files left by an interrupted commit.
  const GENERATION_FILE_PATTERN = /^(?:save-[0-9a-f-]{36}\.bokemo|control-[0-9a-f-]{36}\.json)(?:\.tmp-\d+-\d+)?$|^manifest\.json\.tmp-\d+-\d+$/;

  function removeFile(filePath) {
    try { fs.unlinkSync(filePath); } catch { /* already gone or unremovable: retried by the next sweep */ }
  }

  function sweepUnreferencedGenerations(directory, manifest) {
    let entries;
    try { entries = fs.readdirSync(directory); } catch { return; }
    for (const entry of entries) {
      if (entry === manifest.saveFile || entry === manifest.controlFile || !GENERATION_FILE_PATTERN.test(entry)) continue;
      removeFile(path.join(directory, entry));
    }
  }

  function exists(identity) {
    const { directory } = resolveAccount(identity);
    return fs.existsSync(path.join(directory, 'manifest.json'));
  }

  function create(identity, savePayload) {
    const { normalized, directory } = resolveAccount(identity);
    if (exists(normalized)) throw new Error('already_exists');
    const createdAt = new Date().toISOString();
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const generation = crypto.randomUUID();
    const saveFile = `save-${generation}.bokemo`;
    const controlFile = `control-${generation}.json`;
    writeAtomic(path.join(directory, saveFile), savePayload);
    writeAtomic(path.join(directory, controlFile), JSON.stringify({ revisionHighWater: 0, inGameTime: Date.now(), receipts: [], tombstones: [], confirmations: [], popupEvents: [], deliveries: [] }));
    writeAtomic(path.join(directory, 'manifest.json'), JSON.stringify({ schemaVersion: 1, identity: normalized, generation, saveFile, controlFile, createdAt, updatedAt: createdAt }));
    return normalized;
  }

  function load(identity) {
    const { normalized, directory } = resolveAccount(identity);
    const manifest = readJson(path.join(directory, 'manifest.json'), null);
    if (!manifest) return null;
    if (manifest.schemaVersion !== 1 || typeof manifest.saveFile !== 'string' || typeof manifest.controlFile !== 'string') throw new Error('invalid_manifest');
    const record = {
      identity: normalized,
      savePayload: fs.readFileSync(path.join(directory, manifest.saveFile), 'utf8'),
      control: readJson(path.join(directory, manifest.controlFile), { revisionHighWater: 0, receipts: [], tombstones: [], confirmations: [], popupEvents: [], deliveries: [] }),
    };
    sweepUnreferencedGenerations(directory, manifest);
    return record;
  }

  // `control` is the control metadata object or its already-serialized JSON (the renderer sends JSON over IPC).
  // A null payload is a trusted authority assertion that save state is unchanged; keep the manifest
  // reference to the existing save while committing new control metadata and receipts atomically.
  function commit(identity, savePayload, control) {
    const { normalized, directory } = resolveAccount(identity);
    const manifestPath = path.join(directory, 'manifest.json');
    const manifest = readJson(manifestPath, null);
    if (!manifest) throw new Error('not_found');
    if (savePayload !== null && typeof savePayload !== 'string') throw new Error('invalid_save_payload');
    if (savePayload === null) {
      if (manifest.schemaVersion !== 1 || !/^save-[0-9a-f-]{36}\.bokemo$/.test(manifest.saveFile ?? '') || !/^control-[0-9a-f-]{36}\.json$/.test(manifest.controlFile ?? '')
        || JSON.stringify(validateIdentity(manifest.identity)) !== JSON.stringify(normalized)) throw new Error('invalid_manifest');
      if (!fs.statSync(path.join(directory, manifest.saveFile)).isFile()) throw new Error('invalid_save_file');
    }
    const generation = crypto.randomUUID();
    const saveFile = savePayload === null ? manifest.saveFile : `save-${generation}.bokemo`;
    const controlFile = `control-${generation}.json`;
    if (savePayload !== null) writeAtomic(path.join(directory, saveFile), savePayload);
    writeAtomic(path.join(directory, controlFile), typeof control === 'string' ? control : JSON.stringify(control));
    beforeManifestWrite?.({ identity: normalized, generation });
    writeAtomic(manifestPath, JSON.stringify({ ...manifest, identity: normalized, generation, saveFile, controlFile, updatedAt: new Date().toISOString() }));
    if (typeof manifest.saveFile === 'string' && manifest.saveFile !== saveFile) removeFile(path.join(directory, manifest.saveFile));
    if (typeof manifest.controlFile === 'string' && manifest.controlFile !== controlFile) removeFile(path.join(directory, manifest.controlFile));
  }

  return { create, load, commit, exists, resolveAccount };
}

module.exports = { createApiAccountStore, validateIdentity, USER_ID_PATTERN };
