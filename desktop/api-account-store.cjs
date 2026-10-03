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
  const GENERATION_FILE_PATTERN = /^(?:save-[0-9a-f-]{36}\.bokemo|control-[0-9a-f-]{36}\.json|receipts-[0-9a-f-]{36}\.jsonl)(?:\.tmp-\d+-\d+)?$|^manifest\.json\.tmp-\d+-\d+$/;

  function removeFile(filePath) {
    try { fs.unlinkSync(filePath); } catch { /* already gone or unremovable: retried by the next sweep */ }
  }

  function sweepUnreferencedGenerations(directory, manifest) {
    let entries;
    try { entries = fs.readdirSync(directory); } catch { return; }
    for (const entry of entries) {
      if (entry === manifest.saveFile || entry === manifest.controlFile || entry === manifest.receiptJournal?.file || !GENERATION_FILE_PATTERN.test(entry)) continue;
      removeFile(path.join(directory, entry));
    }
  }

  // SpecRef: 9.1.4.12 | Receipts are append-only: the control file holds everything else, and the journal holds one JSON
  // receipt per line. The manifest names the valid byte length, how many leading lines were evicted, and the live count,
  // so bytes appended by an interrupted commit are ignored and overwritten by the next one.
  const RECEIPT_JOURNAL_FILE_PATTERN = /^receipts-[0-9a-f-]{36}\.jsonl$/;
  const RECEIPT_JOURNAL_COMPACTION_SKIP = 4096;

  function validJournalDescriptor(journal) {
    return journal && RECEIPT_JOURNAL_FILE_PATTERN.test(journal.file ?? '')
      && [journal.bytes, journal.skip, journal.count].every((value) => Number.isSafeInteger(value) && value >= 0);
  }

  function readJournalLines(directory, journal) {
    if (!validJournalDescriptor(journal)) throw new Error('invalid_receipt_journal');
    const text = fs.readFileSync(path.join(directory, journal.file)).subarray(0, journal.bytes).toString('utf8');
    const lines = text.length === 0 ? [] : text.slice(0, -1).split('\n');
    if (text.length > 0 && !text.endsWith('\n') || lines.length !== journal.skip + journal.count) throw new Error('invalid_receipt_journal');
    return lines.slice(journal.skip);
  }

  function readReceiptJournal(directory, journal) {
    return readJournalLines(directory, journal).map((line) => JSON.parse(line));
  }

  // Returns the manifest's next journal descriptor (and, through `staleFile`, a journal file the manifest will drop).
  // Throws receipt_journal_mismatch when the caller's picture of the journal differs from the durable one.
  function applyReceiptSync(directory, manifest, generation, sync) {
    const lines = sync.appended;
    if (!Array.isArray(lines) || lines.some((line) => typeof line !== 'string' || line.includes('\n'))) throw new Error('invalid_request');
    const current = manifest.receiptJournal;
    const writeFresh = (liveLines) => {
      const file = `receipts-${generation}.jsonl`;
      writeAtomic(path.join(directory, file), liveLines.map((line) => `${line}\n`).join(''));
      return { file, bytes: Buffer.byteLength(liveLines.map((line) => `${line}\n`).join('')), skip: 0, count: liveLines.length };
    };
    if (sync.full === true) return { journal: writeFresh(lines), staleFile: current?.file ?? null };
    if (!validJournalDescriptor(current) || sync.baseCount !== current.count || !Number.isSafeInteger(sync.evicted) || sync.evicted < 0 || sync.evicted > current.count) {
      throw new Error('receipt_journal_mismatch');
    }
    const skip = current.skip + sync.evicted;
    const count = current.count - sync.evicted + lines.length;
    if (skip > RECEIPT_JOURNAL_COMPACTION_SKIP) {
      const live = readJournalLines(directory, current).slice(sync.evicted).concat(lines);
      return { journal: writeFresh(live), staleFile: current.file };
    }
    const added = lines.map((line) => `${line}\n`).join('');
    const file = path.join(directory, current.file);
    const descriptor = fs.openSync(file, 'r+');
    try {
      fs.ftruncateSync(descriptor, current.bytes);
      fs.writeSync(descriptor, added, current.bytes, 'utf8');
    } finally { fs.closeSync(descriptor); }
    return { journal: { file: current.file, bytes: current.bytes + Buffer.byteLength(added), skip, count }, staleFile: null };
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
    if (manifest.receiptJournal) record.control.receipts = readReceiptJournal(directory, manifest.receiptJournal);
    sweepUnreferencedGenerations(directory, manifest);
    return record;
  }

  // `control` is the control metadata object or its already-serialized JSON (the renderer sends JSON over IPC).
  // A null payload is a trusted authority assertion that save state is unchanged; keep the manifest
  // reference to the existing save while committing new control metadata and receipts atomically.
  function commit(identity, savePayload, control, receiptSync = null) {
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
    // With a receipt sync the control omits `receipts`; without one the control carries them and any journal is retired.
    const synced = receiptSync ? applyReceiptSync(directory, manifest, generation, receiptSync) : null;
    writeAtomic(path.join(directory, controlFile), typeof control === 'string' ? control : JSON.stringify(control));
    beforeManifestWrite?.({ identity: normalized, generation });
    const { receiptJournal: _previousJournal, ...manifestBase } = manifest;
    writeAtomic(manifestPath, JSON.stringify({ ...manifestBase, ...(synced ? { receiptJournal: synced.journal } : {}), identity: normalized, generation, saveFile, controlFile, updatedAt: new Date().toISOString() }));
    if (typeof manifest.saveFile === 'string' && manifest.saveFile !== saveFile) removeFile(path.join(directory, manifest.saveFile));
    if (typeof manifest.controlFile === 'string' && manifest.controlFile !== controlFile) removeFile(path.join(directory, manifest.controlFile));
    const staleJournal = synced ? synced.staleFile : manifest.receiptJournal?.file;
    if (typeof staleJournal === 'string') removeFile(path.join(directory, staleJournal));
  }

  return { create, load, commit, exists, resolveAccount };
}

module.exports = { createApiAccountStore, validateIdentity, USER_ID_PATTERN };
