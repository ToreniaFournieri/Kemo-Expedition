/// <reference lib="webworker" />

import type { PersistenceWorkerRequest, PersistenceWorkerResponse } from '../game/savePersistence.ts';
import { encodePersistedState } from '../game/storageCompression.ts';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<PersistenceWorkerRequest>) => {
  const request = event.data;
  const receivedAt = performance.timeOrigin + performance.now();
  try {
    const compressionStartedAt = performance.now();
    const encodedPayload = encodePersistedState(request.jsonPayload);
    const compressionCompletedAt = performance.now();
    const completedAt = performance.timeOrigin + compressionCompletedAt;
    const response: PersistenceWorkerResponse = { type: 'complete', requestId: request.requestId, revision: request.revision,
      encodedPayload, queueLatencyMs: Math.max(0, receivedAt - request.submittedAt),
      compressionMs: Math.max(0, compressionCompletedAt - compressionStartedAt), completedAt };
    self.postMessage(response);
  } catch (error) {
    const response: PersistenceWorkerResponse = { type: 'error', requestId: request.requestId, revision: request.revision,
      message: error instanceof Error ? error.message : String(error) };
    self.postMessage(response);
  }
};

export {};
