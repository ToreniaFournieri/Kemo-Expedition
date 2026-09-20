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
      try { fs.unlinkSync(temporaryPath); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
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
    return {
      identity: normalized,
      savePayload: fs.readFileSync(path.join(directory, manifest.saveFile), 'utf8'),
      control: readJson(path.join(directory, manifest.controlFile), { revisionHighWater: 0, receipts: [], tombstones: [], confirmations: [], popupEvents: [], deliveries: [] }),
    };
  }

  function commit(identity, savePayload, control) {
    const { normalized, directory } = resolveAccount(identity);
    const manifestPath = path.join(directory, 'manifest.json');
    const manifest = readJson(manifestPath, null);
    if (!manifest) throw new Error('not_found');
    const generation = crypto.randomUUID();
    const saveFile = `save-${generation}.bokemo`;
    const controlFile = `control-${generation}.json`;
    writeAtomic(path.join(directory, saveFile), savePayload);
    writeAtomic(path.join(directory, controlFile), JSON.stringify(control));
    beforeManifestWrite?.({ identity: normalized, generation });
    writeAtomic(manifestPath, JSON.stringify({ ...manifest, identity: normalized, generation, saveFile, controlFile, updatedAt: new Date().toISOString() }));
  }

  return { create, load, commit, exists, resolveAccount };
}

module.exports = { createApiAccountStore, validateIdentity, USER_ID_PATTERN };
