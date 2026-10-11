## 7. AUTOMATION

### 7.1 AUTOMATION EQUIPMENT

#### 7.1.1 AUTO equipment logic
- The behavior of automatic equipment is controlled by `m.auto_equipment`.
 
| Mode     | Description                    |
| -------- | ------------------------------ |
| `OFF`  | No automatic equipment processing is performed. Characters keep their current equipment unless changed manually.  |
| `SEMI` | Automatically **Run `7.1.3 SEMI: Upgrading existing equipment`**. |
| `FULL` | Automatically **Run `7.1.2 FULL: Equipment logic`**.    |

- Processing priority: Characters are processed sequentially in party order: Row1 → Row2 → … → Row6…

#### 7.1.2 FULL: Equipment logic

##### 7.1.2.1 Dirty check

**1. Compare the current Inventory revision numbers with the revision numbers recorded at the party's previous FULL Auto Equipment run.**
- For each individual item, ignore quantity changes while the item remains available.
  - Example: 1 → 2 does not count as a change.
- Treat newly available items as relevant changes.
  - Example: 0 → 1+ counts as a change.
  - Example: 1+ → 0 **does not** count as a change.
- When a relevant equipment Inventory change occurs, increment `equipmentInventoryRevision`.
- When a relevant jewel Inventory change occurs, always increment `jewelInventoryRevision`.
  - Example: 
    - 0 → 1+ = relevant
    - 1 → 2 = irrelevant
    - 1+ → 0 = irrelevant
- A party checks jewelInventoryRevision only when that party is `Jewel Priority Party: true`.
- Each party records the revision numbers used during its most recent FULL Auto Equipment run.

```
Global: equipmentInventoryRevision = 152 jewelInventoryRevision = 87
Party 1: lastFullEquipmentRevision = 152 lastFullJewelRevision = 87
Party 2: lastFullEquipmentRevision = 149 lastFullJewelRevision = 85
...
```

**2. Check whether any member of the target party has one or more empty equipment slots**

- Run the FULL Auto Equipment process only if at least one of the following conditions is met:
the applicable Inventory revision number has changed since the party's previous FULL Auto Equipment run, or
at least one party member has an empty equipment slot.
- Otherwise, skip the FULL Auto Equipment process.
- After completing a FULL Auto Equipment run, update the party's recorded revision numbers to the current global revision numbers.

##### 7.1.2.2 Simulation: the equipment change 
**1. `<TBA>`**
- This step is not required in the current version and is omitted at runtime.
- This Step ID is reserved for future implementation.

**2. Determine the target item categories**
- For each replaceable equipment slot, determine the target item category according to the class's ideal equipment build order.
  - A replaceable equipment slot is either:
    - an empty equipment slot, or
    - a slot containing an item that is neither locked nor Super Rare.
- Empty slots are treated as missing categories. Existing replaceable equipment slots are also reevaluated against the corresponding category.
- This order represents the target balance of equipment categories for that class.
- The system checks the character’s current equipment and selects the earliest category in the order that is still missing.
- In other words, auto-equipment attempts to move the character’s equipment composition closer to the ideal category balance defined by the class.

- Example:
  - If a Duelist already has two `i.sword` items equipped, the system evaluates the order and selects the next missing categories.
  - If the 3rd and 4th slots are empty, the selected categories will be:
    - 3rd slot → `i.gauntlet` (from `i.NoA`)
    - 4th slot → `i.armor`
  - because these are the earliest categories in the order that are not yet satisfied.

- class.duelist, class.sword-saint:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon` |
| 6 | `i.armor` |
| 7 | `i.NoA` |
| 8 | `i.weapon` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |

- class.samurai:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon` |
| 6 | `i.NoA` |
| 7 | `i.weapon` |
| 8 | `i.weapon` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.NoA` |
| 12 | `i.weapon` |
| 13 | `i.armor` |
| 14 | `i.robe` |
| 15 | `i.NoA` |
| 16 | `i.weapon` |
| 17 | `i.armor` |
| 18 | `i.robe` |

- class.ranger, class.ninja:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon` |
| 6 | `i.arrow` |
| 7 | `i.NoA` |
| 8 | `i.weapon` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |
| 16 | `i.NoA` |

- class.striker:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon` |
| 6 | `i.arrow` |
| 7 | `i.NoA` |
| 8 | `i.weapon` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |
| 16 | `i.NoA` |

- class.wizard, class.alchemist:

| order | item category |
|-|-|
| 1 | `i.weapon`  |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon`  |
| 6 | `i.weapon`  |
| 7 | `i.NoA` |
| 8 | `i.weapon`  |
| 9 | `i.weapon`  |
| 10 | `i.robe` |
| 11 | `i.armor`  |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.weapon` |
| 15 | `i.robe` |


- class.sage:

| order | item category |
|-|-|
| 1 | `i.weapon`  |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon`  |
| 6 | `i.weapon`  |
| 7 | `i.NoA` |
| 8 | `i.weapon`  |
| 9 | `i.weapon`  |
| 10 | `i.robe` |
| 11 | `i.NoA` |
| 12 | `i.weapon` |
| 13 | `i.armor` |
| 14 | `i.NoA` |
| 15 | `i.weapon` |

- class.guardian:

| order | item category |
|-|-|
| 1 | `i.armor` |
| 2 | `i.weapon` |
| 3 | `i.robe` |
| 4 | `i.NoA` |
| 5 | `i.weapon` |
| 6 | `i.shield` |
| 7 | `i.armor` |
| 8 | `i.robe` |
| 9 | `i.weapon` |
| 10 | `i.shield` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |

- class.lord, class.pilgrim:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.armor` |
| 3 | `i.robe` |
| 4 | `i.weapon` |
| 5 | `i.NoA` |
| 6 | `i.weapon` |
| 7 | `i.armor` |
| 8 | `i.robe` |
| 9 | `i.weapon` |
| 10 | `i.shield` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |

**Group Item category**

| category | name | short name | Included Item Categories |
|-----|----|----|----|
| `i.weapon` | 武器 | 武 | `i.ranged`, `i.magic`, `i.melee` |
| `i.NoA` | 回数 | 回 | `i.archery`, `i.catalyst`, `i.gauntlet` |

- **Item selection from a specific item category**
- When auto-equipment selects items from a specific item category, the following procedure is used:

**Decide the combat style**
  - The combat style determined is used to resolve all `i.weapon` and `i.NoA` category selections during this process.
    - Only combat styles enabled by corresponding `c.equip_*` bonuses are considered.
    - If multiple `c.equip_*` bonuses are present, compare all enabled combat style scores and select the highest one.
      - If `c.equip_ranged`: Ranged: total sum of (`c.arrow_x1.x` - 1), (`c.bolt_x1.x` - 1), and (`c.archery_x1.x` - 1).
      - If `c.equip_magic` Magic: total sum of (`c.wand_x1.x` - 1), (`c.grimoire_x1.x` - 1) , and (`c.catalyst_x1.x` - 1).
      - If `c.equip_melee`: Melee: total sum of (`c.sword_x1.x` - 1), (`c.katana_x1.x` - 1) , and (`c.gauntlet_x1.x` - 1).
      - Note: Only one `c.*` bonus of the exact same name applies.
      - Example: If character has `c.equip_ranged`, `c.equip_melee`, `c.sword_x1.4`, `c.arrow_x1.2`, `c.bolt_x1.2`, `c.gauntlet_x1.1`, Ranged: 0.4 (arrow 0.2 + bolt 0.2) and Melee: 0.5 (sword 0.4 + gauntlet 0.1) so "Melee" is selected.
      - Tie-breaker: Ranged > Magic > Melee

  - If Ranged: target `i.weapon` item categories are `i.arrow` and `i.bolt`, and target `i.NoA` item category is `i.archery`.
  - If Magic: target `i.weapon` item categories are `i.wand` and `i.grimoire`, and target `i.NoA` item category is `i.catalyst`.
  - If Melee: target `i.weapon` item categories are `i.sword` and `i.katana`, and target `i.NoA` item category is `i.gauntlet`.
  - If no `c.equip_ranged`,`c.equip_magic`, `c.equip_melee`: resolve `i.weapon`, `i.archery`, `i.catalyst`, and `i.gauntlet` (`i.NoA`) to `i.shield`. 
   

**3. Initialize the simulation memory.**
- Record the **item IDs** of locked and Super Rare items as **Memory A**.
- Record all **`c.*` bonus effects** provided by the locked and Super Rare items as **Memory B**.
  - Intention: Prevent duplicate bonuses in the final simulated equipment set.
- Initialize the `simulated equipment set` as a copy of the character's current equipment set.
- All equipment and jewel changes during this section are applied only to the `simulated equipment set` until the Commit phase.
  
**4. Search for candidate items**
- Exclude any candidate item that satisfies any of the following conditions:
  - Its item ID already exists in **Memory A**.
  - At least one of its `c.*` bonuses already exists in **Memory B**.
  - It has `c.antagonism` (to prevent the selection of items that introduce harmful effects).
- **For `i.gauntlet`, `i.archery`, and `i.catalyst`:**
  - From the inventory, search for the **highest ( modfied `target d. bonus` + `c.N_NoA+X`) bonus value item** in the target item category.
  - the value includes enhancement, super rare multiplier calculation.
- **Other item categories:**
  - From the inventory, search for the **highest modified `target d. bonus` value item** in the target item category.
  - the value includes enhancement, super rare multiplier calculation.
- `modified core concept`:
  - Respect corresponding c bonus for item like `c.sword_x1.x`.
  - Use exactly the same modified value displayed in the character's item list. (with `c.sword_x2.0`) "究極の神鋼の短剣 近攻+1111" -> Use: 1111.
  - "究極の神鋼の短剣" in inventory is "近攻+555", not use this value.
 
|category | `target d. bonus` |
|-----|----------|
|`i.armor` | + `d.physical_defense` |
|`i.robe` | + `d.magical_defense` |
|`i.shield ` | + `d.HP` |
|`i.sword` | + `d.melee_attack` |
|`i.katana` | + `d.melee_attack` |
|`i.gauntlet` | + `d.melee_NoA` |
|`i.arrow` | + `d.ranged_attack` |
|`i.bolt` | + `d.ranged_attack`  |
|`i.archery` | + `d.ranged_NoA` |
|`i.wand` | + `d.magical_attack` |
|`i.grimoire` | + `d.magical_attack` |
|`i.catalyst` | + `d.magical_NoA`  |

**5. Register the selected candidate item**
- Add the selected item's **item ID** to **Memory A**.
- Add **each `c.*` bonus** of the selected item to **Memory B**.

**6. Repeat**
- Repeat Steps 4 and 5 until all potential equipment slots for the target item category have been evaluated or no eligible items remain.

**7. Upgrade equipment evaluation**
- For each item currently present in the `simulated equipment set`, check whether another eligible item with the same item ID exists in Inventory with a higher enhancement level.
- If a higher-enhancement version exists, replace the corresponding item in the `simulated equipment set` with the eligible version having the highest enhancement level.
- Locked items and Super Rare items are not replaced by this process.

**8. Evaluate jewel allocation for the simulated equipment set**
- Consider jewels currently assigned to the character.
- If the target party is the `Jewel Priority Party`, also consider eligible jewels available in Inventory.

8-1. Check all jewels currently owned by that party member.
   - Record these equipped jewels as **Memory J**.

8-2. Determine the corresponding jewel category based on the table below.
   - Check Inventory for available jewels and **jewels currently equipped by the character**. Treat both sources as one candidate pool.
   - Exclude jewels with the same item type and rank.
   - Exclude jewels already stored in **Memory J**.
   - Internally store the remaining valid jewels as the list of potential jewel candidates.
   - Only one jewel is allowed per combination of item type and rank, per character.

8-3. Evaluate jewel assignment.
   - Compare the resulting candidate jewel set with **Memory J**. If the candidate jewel set is identical to Memory J, skip the assignment process.
   - Start from `i.armor`, following the Jewel Category Mapping order. 
   - Jewel assignment priority is from higher-grade jewels to lower-grade jewels.
   - Continue until either:
     - no available jewels remain, or
     - all eligible equipment slots have been assigned a jewel.

**Jewel Category Mapping**

| Item type | Auto-equipped jewel |
|---|---|
| `i.armor` | `j.fort` |
| `i.robe` | `j.ward` |
| `i.shield` | `j.shade` |
| `i.sword` | `j.might` |
| `i.katana` | `j.focus` |
| `i.gauntlet` | `j.fort` |
| `i.arrow` | `j.shade` |
| `i.bolt` | `j.might` |
| `i.archery` | `j.focus` |
| `i.wand` | `j.arcana` |
| `i.grimoire` | `j.arcana` |
| `i.catalyst` | `j.ward` |


##### 7.1.2.3 Evaluation: the equipment change**

1. `<TBA>` For this version, always accept the simulated equipment change.


##### 7.1.2.4 Commit: Equipment change**

1. Compare the current equipment set with the simulated equipment set and identify all differences.

2. Apply only the equipment and jewel changes identified in the comparison.


#### 7.1.3 SEMI: Upgrading existing equipment 
- If a party member already has an item equipped, and another eligible item (same item ID) exists with a higher enhancement, the equipped item is replaced.
- Jewels socketed in the currently equipped item remain unchanged.
- Only the equipment item itself is replaced.
- Super rare item is not replaced by this process. 
1. Evaluate eligible replacement candidates.
2. If a valid upgrade candidate is found, commit the equipment replacement.

#### 7.1.4 Auto-equipment notification 
- After the auto-equipment calculation:
  - Only changed equipment is displayed in the notification.
- notification logic. 
  - empty slot to equip item: PT2ニャンは 恐ろしい月鋼鏃の矢を装備した
  - exist item to equip another item: PT2ニャンは 恐ろしい月鋼鏃の矢 を 魔性の瞬撃の月鋼矢に装備しなおした 

#### 7.1.5 Staged Equipment Tuning

- **Read APIs:**
  - `read/build/character/stagedEquipmentTuning`
  - `read/expedition/{p}/simulationRun`

- This is a read API. It never changes the save. If the final check (step 6) passes, the result returns the changes as `changeSummary` (see `9.1.3`, 2-3-7).

- **Parameters:**
  - `baselineRuns` (constant: `1000`)
  - `quickRuns` (e.g., `100`, `300`, `1000`; default: `100`)
  - `finalTuningRuns` (e.g., `300`, `500`, `1000`; default: `500`)
  - `offenseElementRequest` (e.g., `e.fire`, `e.thunder`, `e.ice`, `e.none`; default: `noRequest`)
  - `offenseElementTrialRuns` (e.g., `0`, `3`, `6`; default: `3`)
  - `offenseElementCandidateCount` (e.g., `1`, `2`, `3`; default: `2`)
  - `defenseElementTrialRuns` (e.g., `0`, `5`, `10`; default: `5`)
  - `defenseElementCandidateCount` (e.g., `1`, `2`, `3`; default: `2`)
  - `abilityTrialRuns` (e.g., `0`, `20`, `40`; default: `20`)
  - `abilityCandidateCount` (e.g., `1`, `2`, `3`; default: `2`)
  - `minImprovement` (e.g., `0.03`, `0.07`, `0.10`; default: `0.07`)
  - `minGateImprovement` (e.g., `0.03`, `0.07`, `0.10`; default: `0.07`)
  - `objective`
    - Optional.
    - Default: `success`.
    - `success`, `minDefeat`, `bossDamage`
    - `bossDamage` simulates the boss room of the current destination even if the depth limit stops before the boss.
  - `seed`
    - Optional.
    - Integer.
    - Default: random.
    - Fixed seed for a reproducible result. The same `seed` on the same save revision gives the same result.

- **General rules:**
  - Items come from the Inventory and this character's own equipment. Equipment of other characters is never taken. Locked equipment is never changed.
  - Do not select multiple items with the same bonus, since duplicate bonuses do not stack (e.g., two items with `r.ice+0.20` give the same effect as one).
  - Setting a step's `...TrialRuns` to `0` skips that step.
  - **Jewels:**
    - Only slots whose item changed get a new Jewel. Jewels on unchanged slots are kept as they are.
    - For the changed slots, assign Jewels with the Jewel allocation logic of `7.1.2.2` step 8, using:
      - the Jewels freed from the items that left the character, and
      - eligible Jewels in the Inventory, even if the character's party is not the `Jewel Priority Party` (unlike AUTO).
    - Jewels on unchanged slots count as already used for the "one Jewel per item type and rank" rule.
    - Jewels on other characters are never taken. Locked equipment keeps its Jewel.
  - **Same dice:** Builds that are compared with each other are simulated with the same seed, so the difference comes from the build, not from luck.
    - Steps 2–4: every candidate uses `quickRuns` and one shared seed. The current build is also simulated once with `quickRuns` and that seed, and each candidate is compared with that result (not with the step 1 baseline).
    - Step 5: every build uses `finalTuningRuns` and a second shared seed, including the current build.
    - Steps 1 and 6: both use `baselineRuns` and a third shared seed.
    - These three seeds and the random item draws all derive from `seed`.
  - **Score** (per `objective`):
    - `success`: success rate (clear + return).
    - `minDefeat`: defeat rate. Lower is better.
    - `bossDamage`: average share of boss HP dealt in the boss room.
  - **Improvement:**
    - `success`, `bossDamage`: `ratio = candidateScore / currentScore`
    - `minDefeat`: `ratio = currentScore / candidateScore`
    - A score of `0` in the denominator is treated as `0.001`.
    - If both scores are `0`, `ratio = 1`.
    - `improvement = ratio - 1` (e.g., `ratio = 1.07` means a 7% improvement).
  - **Qualify:** In steps 2–4, a candidate qualifies only if `improvement >= minImprovement`.
  - **Luck check:** Used in step 6.
    - `gain = afterScore - beforeScore` (for `minDefeat`: `beforeScore - afterScore`).
    - `SE = sqrt(beforeScore × (1 - beforeScore) / runs + afterScore × (1 - afterScore) / runs)`
    - `SE` is how much the difference usually moves by luck alone. `gain > 2 × SE` means the gain is very unlikely to be luck.

1. Run a baseline simulation and find the bottleneck
   - Simulate the current build with `baselineRuns` runs (same as `read/expedition/{p}/simulationRun` with `numberOfRun=baselineRuns`).
   - Bottleneck room: the room in `detail` with the highest `Draw + Retreat + Defeat`.
     - If no run ends before the end of the route, use the boss room. If the boss room is out of reach, use the latest elite room.
   - Bottleneck enemies: the enemies of the bottleneck room. Steps 2–4 use them to decide what to try first.

2. Evaluate alternative offense elements
   - If `offenseElementRequest` is specified, use only the requested element and skip evaluating other elements.
   - Otherwise, choose up to `offenseElementCandidateCount` elements other than the current one from `e.ice`, `e.thunder`, `e.fire`, and `e.none`.
     - Try first the elements the bottleneck enemies resist least (e.g., an enemy with `r.fire_x1.3` and `r.ice_x1/5`: try `e.fire` before `e.ice`).
   - Do not mix equipment of different elements. When switching elements, replace all elemental equipment.
     - If a slot's category has no item of the new element (e.g., `i.sword` has only `e.fire`), use an item of the same category with no element.
   - Repeat this step `offenseElementTrialRuns` times, drawing new items for each trial.
   - Record the top `max(2, floor(offenseElementTrialRuns / 5))` candidates that qualify. If none qualify, record none.

3. Evaluate alternative defense elements
   - Build up to `defenseElementCandidateCount` combinations from `r.ice`, `r.thunder`, `r.fire`, and `r.none`, excluding the current combination.
     - Try first the combination that resists the bottleneck enemies' attack element (e.g., `r.thunder` against `e.thunder+20`).
   - Repeat this step `defenseElementTrialRuns` times, drawing new items for each trial.
   - Record the top `max(2, floor(defenseElementTrialRuns / 5))` candidates that qualify. If none qualify, record none.

4. Evaluate alternative item abilities
   - Check the abilities granted by the current equipment.
   - Try up to `abilityCandidateCount` items that grant abilities the character doesn't already have, each replacing one or more unlocked items.
     - Try first items that grant `a.X-breaker` when a bottleneck enemy has `a.X` (e.g., `a.illusion-breaker` against `a.illusion`).
   - Repeat this step `abilityTrialRuns` times, drawing new items for each trial. Do not draw an item that was already tried in this step.
   - Record the top `max(2, floor(abilityTrialRuns / 5))` candidates that qualify. If none qualify, record none.

5. Final tuning (greedy)
   - Start from the current build. Every simulation in this step uses `finalTuningRuns`.
   - Add pass:
     - Put all candidates recorded in steps 2–4 into one list, sorted by their improvement (best first).
     - Go through the list in order. Add each candidate to the build, and keep it only if the score improves compared with the build before adding it (`improvement > 0`).
     - The build holds at most one step 2 candidate and one step 3 candidate. Skip a step 2 or step 3 candidate if one from the same step is already kept.
     - Step 4 candidates can be combined (several ability items).
     - If a candidate needs a slot that an earlier kept candidate already changed, use another unlocked slot. If no unlocked slot is left, skip the candidate.
   - Swap pass:
     - For steps 2 and 3, try each other recorded candidate in place of the kept one. Keep the swap only if the score improves.
   - The result is the tuned build.
   - If no candidate is kept, there is no change.

6. Run the simulation after tuning (final check)
   - Simulate the tuned build with `baselineRuns` runs, using the same seed as step 1.
   - Accept the tuned build only if both are true:
     - `improvement >= minGateImprovement`
     - `gain > 2 × SE`
   - Otherwise, discard the changes and keep the original build. `changeSummary` is empty.
