import type { ExpeditionDepthLimit } from '../../types/index.ts';

const DEPTH_LIMIT_POSITION = Object.freeze({
  '1f-3': Object.freeze({ floorNumber: 1, roomInFloor: 3 }),
  '1f-4': Object.freeze({ floorNumber: 1, roomInFloor: 4 }),
  '2f-3': Object.freeze({ floorNumber: 2, roomInFloor: 3 }),
  '2f-4': Object.freeze({ floorNumber: 2, roomInFloor: 4 }),
  '3f-3': Object.freeze({ floorNumber: 3, roomInFloor: 3 }),
  '3f-4': Object.freeze({ floorNumber: 3, roomInFloor: 4 }),
  '4f-3': Object.freeze({ floorNumber: 4, roomInFloor: 3 }),
  '4f-4': Object.freeze({ floorNumber: 4, roomInFloor: 4 }),
  '5f-3': Object.freeze({ floorNumber: 5, roomInFloor: 3 }),
  '5f-4': Object.freeze({ floorNumber: 5, roomInFloor: 4 }),
  beforeBoss: Object.freeze({ floorNumber: 6, roomInFloor: 3 }),
}) satisfies Readonly<Record<Exclude<ExpeditionDepthLimit, 'all'>, Readonly<{
  floorNumber: number;
  roomInFloor: number;
}>>>;

export function hasReachedExpeditionDepthLimit(
  depthLimit: ExpeditionDepthLimit,
  floorNumber: number,
  roomInFloor: number,
): boolean {
  if (depthLimit === 'all') return false;
  const position = DEPTH_LIMIT_POSITION[depthLimit];
  return position.floorNumber === floorNumber && position.roomInFloor === roomInFloor;
}
