/// <reference lib="webworker" />

import { simulateAfkWorkerChunk } from '../game/afkWorkerSimulation';
import type { AfkWorkerChunkFailure, AfkWorkerChunkRequest, AfkWorkerChunkResponse } from '../game/afkWorkerProtocol';

const workerScope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<AfkWorkerChunkRequest>) => {
  const request = event.data;
  let response: AfkWorkerChunkResponse;
  try {
    response = simulateAfkWorkerChunk(request);
  } catch (error) {
    response = {
      schemaVersion: 1,
      requestId: request?.requestId ?? -1,
      ok: false,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    } satisfies AfkWorkerChunkFailure;
  }
  workerScope.postMessage(response);
};

export {};
