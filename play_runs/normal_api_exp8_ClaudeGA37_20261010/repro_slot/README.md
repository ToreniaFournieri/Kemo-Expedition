# Repro: gaSearch leaves a free, valuable slot empty (build 38, 2026-10-11)

This replaces report finding "Bug 1". The array-length explanation was wrong:
- `decode()` pads every slot list to `maxEquipSlots` (`gaSearch.ts` ~l.466-480);
- `individual()` keeps that padded genome (~l.880).

What remains is a search-quality problem, and it is deterministic with a fixed `seed`.

## Process (API only, about 20 calls, about 3 min real time)

1. **Load the account.** Load `ClaudeGA37`, or import `../final.kemoz.gz` into any account. Set PT1 to destination 8, `fixed`, depth `all`.
2. **Empty one slot.** `removeEquipment` on the last filled slot of the test character.
   - Char 2 (ranger): slot 10, bow `0/7217/0/0`.
   - Char 5 (caster): slot 8, `0/6221/3/0`.
3. **Measure the build without searching.** Send `gaSearch` with no changeable component:
   - `targets:[{characterId:1,changeableComponents:{}}]`, `objective:"bossDamage"`;
   - `gaParameters:{seed:777, verifyRuns:1000}`.

   `verification.before` is the build's exact rate. It repeats to the last digit and takes about 1 s.
4. **Search with fixed seeds.** One search per seed 1-6, all with the same body:
   - all 6 targets with `equipment` and `jewels`;
   - `considerItemsScope:"global"`, `considerOrderChange:false`, `considerDeityChange:"none"`, `objective:"bossDamage"`;
   - `gaParameters:{effort:"medium", seed:S, timeBudgetSeconds:300}`. With this budget the search ends by generation count, not CPU time.

   For each search, check whether `changeSummary` contains `commit/build/character/{cid}/equip` with `targetSlot` = the empty slot. Seed 1 run twice must give the same `changeSummary` and the same `evaluations`.
5. **Controls.** `equip` each candidate into the empty slot, then measure as in step 3. Remove it again after each one.
6. **Restore** the original item.

The script is `../client/repro_slot.py`, run with env `CID=2|5`, `DEST=8`, `CANDS=...`. The logs are `run_cid2_d8.log` and `run_cid5_d8.log`; the call ledger is `batch_calls.jsonl`.

## Results

| Character, slot | Measured rate, empty | Measured rate, original back | Seeds that fill the slot | Seeds returning `noChange` |
|---|---:|---:|---:|---:|
| char 2 (ranger), slot 10 | 0.052 | 0.274 (+22.2 pt) | 2/6 (seeds 1, 5) | 3/6 (seeds 2, 4, 6) |
| char 5 (caster), slot 8 | 0.138 | 0.241 (+10.3 pt) | 3/6 (seeds 3, 4, 6) | 2/6 (seeds 2, 5) |

- **Determinism.** Seed 1 run twice gave an identical result for both characters (char 2: 458 evaluations both times; char 5: 429).
- **Char 2 control candidates** (gain over the empty slot): `0/8107/3/0` gave +8.1 pt and `0/6309/1/0` gave +3.9 pt. `0/7107/5/0` could not be tested: it is worn elsewhere, and the equip returned `illegal_action`.
- **The key point.** In 5 of the 12 searches the GA returned `noChange`, so it found no improvement at all. Yet putting the removed item back is worth +10 to +22 pt.

## Likely cause and ideas (for Pool A)

- **Mutation odds.** A `replace` mutation picks a random target (1/6), then a random slot (1/9-1/11), then a random key over everything the character can equip. Only part of that pool suits the slot (for example a bow for a ranger), so a useful fill is rare within about 400 evaluations.
- **Repair step.** Holes are only re-filled when a gene is invalid. An empty (`null`) gene is never treated as a hole.
- **Ideas:**
  - treat empty slots as holes in `decode()` (fill them greedily or at random from compatible items);
  - weight `replace` toward empty slots;
  - add a final greedy pass that tries the top-N compatible items in each empty slot before verification.
