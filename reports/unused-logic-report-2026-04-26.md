# Unused Logic Check Report (2026-04-26)

## Scope
- Repository: `Kemo-Expedition`
- Language: TypeScript / TSX (`src/**`)

## What was done
1. Validated likely-unused exported symbols by cross-file reference counting (`outside-reference count = 0`).
2. Removed these unlikely-used exports from runtime modules.
3. Deleted declarations that became fully unused after unexporting (to keep `noUnusedLocals` passing).
4. Rebuilt the project to confirm no TypeScript/build regressions.

## Cleanup Result
- Removed external exports for previously flagged unlikely-used symbols across:
  - `src/data/*`
  - `src/game/*`
  - `src/types/index.ts`
- Removed now-dead declarations:
  - `getExpeditionEnemyMultipliers` (`src/data/dungeons.ts`)
  - `getEnemyById`, `getRandomNormalEnemy`, `getRandomEliteEnemy` (`src/data/enemies.ts`)
  - `getItemsByTier`, `getItemsByCategory`, `getRandomItemFromTier` (`src/data/items.ts`)
  - `getItemAutoEquipmentSelectionValue` (`src/game/gameState.ts`)
  - `hasDefeatedAnyDungeonBoss` (`src/game/lootGate.ts`)
  - `ExpeditionState` (`src/types/index.ts`)

## Verification
- `npm run build` passed after cleanup.

## Notes
- This change intentionally narrows runtime/public API surface by removing likely-dead exports.
- If any external integration depends on these symbols, re-export only the required subset in a follow-up.
