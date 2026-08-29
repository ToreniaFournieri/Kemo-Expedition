import { getBattleKernelAbiVersion, getBattleRngVersion } from './battleKernel.ts';
import { BATTLE_PROTOCOL_VERSION } from './generated/battleProtocol.generated.ts';

export const MAX_BATTLE_SEED = 0xffff_ffff_ffff_ffffn;

export type BattleReplayMetadata = {
  protocolVersion: number;
  abiVersion: number;
  rngVersion: number;
  seedHex: string;
  randomDrawCount: number;
};

export function requireBattleSeed(seed: unknown): bigint {
  if (typeof seed !== 'bigint') throw new TypeError('Battle seed must be a bigint');
  if (seed < 0n || seed > MAX_BATTLE_SEED) {
    throw new RangeError('Battle seed must be an unsigned 64-bit bigint');
  }
  return seed;
}

export function requireBattleRngVersion(version: unknown): number {
  if (!Number.isInteger(version) || version !== getBattleRngVersion()) {
    throw new RangeError(`Unsupported battle RNG version: ${String(version)}`);
  }
  return version as number;
}

export function formatBattleSeed(seed: unknown): string {
  return requireBattleSeed(seed).toString(16).padStart(16, '0');
}

export function createBattleReplayMetadata(
  seed: unknown,
  rngVersion: unknown,
  randomDrawCount: number,
): BattleReplayMetadata {
  const validatedSeed = requireBattleSeed(seed);
  const validatedVersion = requireBattleRngVersion(rngVersion);
  if (!Number.isSafeInteger(randomDrawCount) || randomDrawCount < 0) {
    throw new RangeError('Battle random draw count must be a non-negative safe integer');
  }
  return {
    protocolVersion: BATTLE_PROTOCOL_VERSION,
    abiVersion: getBattleKernelAbiVersion(),
    rngVersion: validatedVersion,
    seedHex: formatBattleSeed(validatedSeed),
    randomDrawCount,
  };
}
