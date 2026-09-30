/// <reference lib="webworker" />

import type { PersistenceWorkerRequest, PersistenceWorkerResponse } from '../game/savePersistence.ts';
import { encodePersistedState, encodeStoredState } from '../game/storageCompression.ts';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<PersistenceWorkerRequest>) => {
  const request = event.data;
  const receivedAt = performance.timeOrigin + performance.now();
  try {
    const compressionStartedAt = performance.now();
    // Exported backups keep the portable codec; internal saves use native deflate.
    const encode = request.codec === 'portable'
      ? (jsonPayload: string) => Promise.resolve(encodePersistedState(jsonPayload))
      : encodeStoredState;
    const [encodedPayload, ...encodedRecordPayloads] = await Promise.all([
      encode(request.jsonPayload),
      ...(request.logRecords ?? []).map((record) => encode(record.jsonPayload)),
    ]);
    const encodedLogRecords = (request.logRecords ?? []).map((record, index) => ({
      key: record.key,
      encodedPayload: encodedRecordPayloads[index]!,
    }));
    const compressionCompletedAt = performance.now();
    const completedAt = performance.timeOrigin + compressionCompletedAt;
    const response: PersistenceWorkerResponse = { type: 'complete', requestId: request.requestId, revision: request.revision,
      encodedPayload, encodedLogRecords, queueLatencyMs: Math.max(0, receivedAt - request.submittedAt),
      compressionMs: Math.max(0, compressionCompletedAt - compressionStartedAt), completedAt };
    self.postMessage(response);
  } catch (error) {
    const response: PersistenceWorkerResponse = { type: 'error', requestId: request.requestId, revision: request.revision,
      message: error instanceof Error ? error.message : String(error) };
    self.postMessage(response);
  }
};

export {};
