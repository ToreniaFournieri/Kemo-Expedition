# Specification / Runtime Consistency Audit (2026-07-22)

## Scope and method

- Compared the specification's explicit obsolete markers with `src/**` runtime references.
- Traversed static TypeScript/TSX imports from `src/main.tsx` to find runtime-unreachable modules.
- Counted exported declarations across `src/**` and manually verified declarations with no consumers.
- Searched runtime code for compatibility markers (`legacy`, `obsolete`, and `deprecated`).
- Built the production application after the cleanup.

This is a static audit. Dynamic values restored from save data are not proof that a compatibility branch is dead, so save migrations are reported separately and retained.

## Corrected inconsistencies and obsolete fragments

| Finding | Resolution |
|-|-|
| `HomeScreen` attached the literal obsolete specification marker to the party-state progress label, even though the label is present in the Spec 8.3 UI example and the obsolete block applies to Progress Flavor Text. | Corrected the `SpecRef` anchor; the visible progress label remains. |
| `ENEMY_TYPE_SHORT_NAMES` eagerly captured localized labels at module load and had no runtime consumer. | Removed. Runtime callers continue to use `getEnemyTypeShortName`, which resolves the active language on demand. |
| `formatInstantExpeditionCharge` duplicated `.label` from `formatInstantExpeditionChargeDisplay` and had no runtime consumer. | Removed. |
| `getLanguage` exposed the module's active language but had no runtime consumer. | Removed. |
| `src/components/index.ts`, `src/data/index.ts`, and `src/game/index.ts` were unreachable barrel modules. | Removed. Runtime modules already import concrete modules directly. |

## Explicitly obsolete specification objects

The current specification has two related obsolete artifacts:

1. `Specification_5.2_PROGRESS_FLAVOR_TEXT.md` is marked **OBSOLETED** in full.
2. The **Flavor text** subsection in Spec 8.3 is under **OBSOLETED: REMOVE THIS FROM THE RUNTIME PROGRAM**.

No Progress Flavor Text selector, speaker resolver, or flavor-text cycle implementation was found in the runtime. Battle narration and terrain flavor logs remain valid: they implement battle specifications rather than the obsolete Progress Flavor Text object.

## Compatibility fragments retained intentionally

These fragments look old but are reached by current persistence/import paths. Removing them would risk breaking existing saves:

- lineage and predisposition ID aliases;
- renamed deity aliases;
- legacy party-cycle labels and state normalization;
- legacy bag migration and reward-bag fallback fields;
- obsolete class-ID migration in the save codec;
- old enemy-class and enemy-ID compatibility values;
- localized legacy battle-log and side-quest parsing tokens;
- legacy developer-news ID mapping.

They should only be removed after the product defines a minimum supported save version and migration telemetry confirms that older payloads no longer need them.

## Remaining consistency risks

- Spec 8.3 uses the broad heading ID `8.3` for many runtime anchors. The corrected progress-label anchor is descriptive, but there is no more-specific numbered heading for it.
- Compatibility code has no documented retirement version. This makes it impossible to distinguish permanently required import support from removable transitional code using static analysis alone.
- The changelog contains repeated Version/Build pairs and an out-of-order `0.8.5` history. This audit did not rewrite historical release records; those records need owner confirmation before renumbering.

## Verification result

- No runtime import points to the deleted barrel modules or declarations.
- No active runtime code implements the explicitly obsolete Progress Flavor Text feature.
- TypeScript and the Vite production build pass after cleanup.
