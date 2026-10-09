# Expedition 9 design proposal — ダーセン原野 - 追憶 (Darsen Field - Reminiscence)

Status: proposal (Planner). Spec 4.1 / 4.2 are human-owned; nothing here changes them.
Current D9 (build 29) is a stub: deploy `test`, enemy level 43, item tier 1, D1's enemies reused (`src/data/dungeons.ts`, "Expedition 9 temporarily reuses Expedition 1's enemy assignments"), war-themed floors, terrains already assigned.

Sources: AI run reports on v0.10.1 builds 3–27 (Charge, Rec, SQ2, SQ, Side, Fable, Orca5, Magic, Sortie2, U1, Slot2), Spec 4.1, 5.1.3.1, 6.1.

---

## 1. What the AI runs tell us

Eleven runs reached the D8 boss in 19.9–50 game days (Orca +5: 254 d). The same problems show up in almost every report.

| # | Finding (reports) | Player-experience problem | What D9 should do |
|---|---|---|---|
| 1 | **Walls are route attrition, not single fights.** Full-HP rooms are won ~100%, while route reach is 2–15% (U1, Sortie2, Orca5, Fable, Magic). D8: boss-only kills 95–97%, but only 5–12% of runs reach the boss (Charge). | The real threat is invisible. No room shows it, and the gate shows only "N consecutive". Players see "0/3" for days. | Make HP across rooms a **visible, controllable resource** in D9: supply points, rations, a hospital. |
| 2 | **The boss dies 70–100% once reached** (all runs). | The climax is the least interesting fight. | Make the route gentler and the boss harder. Give the boss a **readable puzzle**. |
| 3 | **Element weights are the biggest lever** (2% → 73%, Sortie2). But an unannounced thunder-null room at D7 3F-1 cost **6.5 days blind** (Side). | A hard zero with no warning is a trap. A soft counter that the floor announces is a puzzle. | No hard null/absorb on route rooms. Use only soft counters (×2/3), announced by the terrain or the enemy tag. Put the one hard counter on the boss, where the START log shows it at once. |
| 4 | **The meta has converged.** Every run uses Laika guardian, Kemo lord, 2 Ursan ninja/rangers, a Leporian, and a caster. Caster burst was a negative result (Magic). Uniques give +10–30% to one character (U1). | Races and classes are varied on paper only. | Floors take turns favoring melee, ranged, and magic. Feature **Murid** (Skuva's race: stealth, penetration) and melee. |
| 5 | **From D6 on, item tier is the clock, not level** (Charge). EXP farming is slower than a plan (SQ2). | At the end, the game is waiting, and only external tooling makes it faster. | Give players a path to gear they can control: gold → war-issue gear. |
| 6 | **30k–240k gold per party sits unused,** with stacks of 99× junk (Side, Orca5, SQ2). | Rewards feel empty. | Add D9 gold sinks: rations and requisition. |
| 7 | **PT2–PT6 sit idle.** They serve only as gear pools (U1). PT1 got ~1 side quest in 37 days (SQ2, Side). | Five parties are scenery. | A war has several fronts. Side parties could support PT1 (phase 3). |
| 8 | **Any Draw, Retreat, or Defeat resets the streak,** even a sortie Defeat (Fable, U1). The biggest gate lever, `depthLimit Xf-3`, feels like an exploit (Fable, Side). | Bad luck costs days. | Test a gate checkpoint on D9 (§7). |

**Design rules derived from this**
1. Each floor asks **one readable question** and has **at least 2 valid answers** (formation, gear, deity, or object).
2. The standard meta party is disfavored on **at most 2 floors**.
3. Route rooms have **no hard immunities**. Each enemy shows one threat in its name tag.
4. A failure should cost **something**, not always the whole run (soft-fail objects).
5. Every object and enemy rule leaves a line in the battle log, so the player can see why a run ended.

---

## 2. Concept: the memory of D1

D9 is **D1 in the past**. It shows the Caninian plains during the war that turned the capital into D1-F6's "Caninian Ruin-City". The party walks through that memory, from the trenches to the capital on its last day.

The assigned terrains already mirror D1 in reverse:

| D9 floor | terrain | D1 floor with the same terrain |
|---|---|---|
| F5 Defensive line | `terrain.predation` | F2 Predator Territory |
| F6 Caninian Capital | `terrain.rejuvenation` | F1 Windy Prairie |

So the reuse of D1 enemies can become **intentional**: D1's beasts are now war animals, and D1's named Caninians appear alive and young.

| D1 (ruin) | D9 (memory) |
|---|---|
| Boss ヴェルグ (Verg), Caninian guardian, `a.ice-absorb`, `a.true-sight` | **D9 boss**: Verg, captain of the capital guard, still ice-absorbing (players who remember D1 are rewarded) |
| F4 special elites サクラ (`a.execution`), エメラ (`a.deflection`) | Imperial officers on D9-F1 and F5 |
| Beast / Aerial / Insect_Swarm | War-hounds, messenger hawks, field swarms (`軍用` name prefix) |
| Gods: Seiran (restoration) | Gods Battle: **Skuva**, God of Dusk (Murid ninja), the "twilight" of the empire |

**Factions.** The party is a third side, crossing a battlefield that two armies fight over.
- **Imperial army** (defenders, Caninian): they don't retreat. `a.resurrect` at Lv30+.
- **The Federation (連邦軍)** (besiegers): a coalition. Murid sappers and scouts, Felidian skirmishers, Ursan heavies.
- **Echoes (残影)**: distortions of the memory that copy the party (`a.mimic`, `a.oblivion`). They appear only on F6.

---

## 3. Floor plan (keeps the assigned terrains)

| F | Floor | Terrain (existing) | Question | Valid answers | Enemy mix | Object |
|---|---|---|---|---|---|---|
| 1 | 塹壕の先 Across the trenches | `duelist-domain`: melee always hits | Can you fight up close? | Melee classes (sword-saint, samurai, duelist); Defender / `bulwark`2 against their melee; Murid `stealth` | Imperial trench infantry (Caninian melee), war-hounds | — |
| 2 | 軍道 Military Road | `heavy-wind`: ranged NoA ×0.75 | Can you win without your snipers? | Magic, melee, `output-stabilizer` | Federation column, messenger hawk | Messenger (F2-2), Supply Depot (F2-3) |
| 3 | ダーデン原野 Darsen Field | `sniper-domain`: ranged always hits | Who shoots first? | First-strike, Fertility, `deflection` / `illusion`, HP | Federation riflemen (ranger, striker, ninja) | Artillery Battery (F3-1..3) |
| 4 | 連邦軍野営地 Federation Encampment | `enemy-high-ground`: enemy +1d3 initiative | Can you take the first hit? | Defense / HP, Fortification, Defender | Federation officers, Murid sappers | Messenger (F4-2), Supply Depot (F4-3), Field Hospital (F4-4) |
| 5 | 帝都防衛線 Defensive line | `predation`: physical ×1.3 against targets below 50% HP | Can you arrive above half HP? | HP planning, rations, Restoration, the hospital | Imperial line (resurrect), Ursan heavies; Emera at F5-4 | — |
| 6 | ケイナイアンの帝都 Caninian Capital | `rejuvenation`: heal 2% of missing HP per room | The guard and the walls | The boss puzzle (§6) | Imperial Guard "shield wall", Echoes, Verg | Imperial Standard (boss room) |

- F1–F3 rotate the favored attack type (melee → anti-ranged → ranged). The standard sniper party is weak only on F1 and F2.
- F4–F5 are the attrition stretch, and the objects give the player tools for it.
- F6 is gentler on the route (rejuvenation, "coming home"). The hardest fight is the boss, not reaching it (finding 2).

---

## 4. Objects (room features)

**How to build them:** an object is a **room-scoped terrain-like effect**. It uses the same START, COMBAT, and END hooks as terrains, and logs with an `[物]` actor label. It is **not** a second combatant, because battles stay 1 party vs 1 enemy (Spec 6.1). The floor map shows it the same way it shows terrain.

| ID | Object | Where | Rule | Why (finding) | Priority |
|---|---|---|---|---|---|
| O1 | **補給所 Supply Depot** | F2-3, F4-3 | END on Victory: heal 15% of missing HP. With rations (O7): +1 ration. | Attrition gets a visible checkpoint the player can plan around (1) | Must |
| O2 | **伝令 Messenger** (enemy tag, new `a.escape`) | F2-2 hawk, F4-2 Murid runner | If the battle would end in Draw, the messenger **escapes**. The run continues with no EXP or drop, but this run's floor elite gains `a.command`+1. If the party kills it **before it acts** (the "has not acted yet" flag that ambush and overwatch already use), the elite loses one ability ("指揮系統が乱れた"). | A soft fail: a mistake costs something but not the run. It gives a clear reason to bring speed (rule 4) | Strong |
| O3 | **砲兵陣地 Artillery Battery** | F3-1..3 | At COMBAT timing 9, the battery shells **every side that has not acted yet** for 4% of max HP. If both sides have acted, nothing happens. | Speed is rewarded through a rule the log shows, with no hidden math (3) | Must |
| O4 | **野戦病院 Field Hospital** | F4-4 (commander) | Win the room: the hospital is captured. Heal 25% of missing HP at the start of F5. | A direct answer to the F5 `predation` cliff (1) | Optional |
| O5 | **軍旗 Imperial Standard** | F6-4 boss | See §6 | Gives the boss a puzzle (2) | Must (boss) |
| O6 | **追憶の欠片 Memory Fragment** | 1 per floor, from that floor's elite (sure on the first kill, rare after that) | 6/6 unlocks Global Diary lore entries (the fall of the capital, linked to D1-F6) and an alternative Gods Battle condition for Skuva. | Collection and story, plus a reason to look at D1 again | Must |
| O7 | **糧食 Rations** (carried) | Bought at home from the Quartermaster, max 3 per run, **D9 only** | At END of a room, if party HP ≤ 40%: use 1 ration, heal 20% of max HP. This happens **before** the Retreat check (≤30%). Logged. | A gold sink (6). It turns attrition into a planning lever (1). It turns Retreats into continued runs, which also keeps sortie batches going (Charge: Defeats end batches) | Strong |

**Not included:**
- Random hazards that hit either side by chance. Players don't like variance they can't respond to.
- Anything that changes how Draw works outside the Messenger tag.

---

## 5. Enemy design

### Roster
D9 enemy IDs follow the existing formula `100 + (pool - 1) × 36 + row`, so D9 uses **388–423**.

| Slot | Type | Role | Threat shown in the tag |
|---|---|---|---|
| A | Caninian (Imperial army) | Melee line, F1 / F5 / F6 | `a.resurrect` (Lv30+): first kill → 1 HP. Multi-hit (NoA) beats one big hit |
| B | **Federation** (new composite type) | Coalition, F2–F4 | Each master row has one fixed racial ability from a short list: Murid `stealth`, Felidian `first-strike`, Ursan `bulwark`. It is fixed per row and shown in the name, not random |
| C | Beast / Aerial / Insect_Swarm (war animals) | D1 echo, all floors | Existing D1 abilities. Names: 軍用 + D1 name (cheap localization) |
| D | **Echo (残影)** (new type, or a Ghost variant) | F6 only | `a.mimic` (copies one party ability), `a.oblivion` |

**F6 Imperial Guard "shield wall":** physical defense ×1.5. It can be answered with Murid `c.penet`, magic, or `m.armor-break`. That gives Murid a role without forcing the race.

### Named elites (the D1 cast, alive)

| Room | Name | Class | Signature | Question it peaks |
|---|---|---|---|---|
| F1-4 | サクラ Sakura, Imperial lieutenant | duelist.lord | `a.execution`: punishes arriving low | Melee floor, HP at entry |
| F3-4 | Federation sniper captain (Murid) | ninja.ranger | `a.stealth`, `a.overwatch` | Who shoots first |
| F4-4 | Federation commander (Ursan) | lord.duelist | `a.command`2, +1 if the messenger escaped | Taking the first hit; the messenger chain |
| F5-4 | エメラ Emera, line captain | lord.striker | `a.deflection`2, `a.resurrect` | Arriving above half HP |
| F6-4 | **ヴェルグ Verg** (boss) | guardian.lord | §6 | — |

### Enemy rules
1. One readable threat per enemy, shown in the name tag. Don't stack hidden abilities.
2. Route rooms have soft resistances only (×2/3 at most). There are no nulls or absorbs on the route.
3. Each floor's question peaks at its elite, which is also its gate floor.
4. Reuse existing abilities where possible. Only `a.escape` (Messenger) and maybe the Standard rule are new.

---

## 6. The boss: ヴェルグ, the last captain

**Goal:** the hardest single fight in D9, decided by composition and order rather than raw HP.

- **Imperial Standard (軍旗).** While the standard stands, Verg takes ×1/2 damage (the same scale as `a.defender`3). The standard falls after the party lands **N successful hits of any type** in that battle. Log: "軍旗が倒れた！ ヴェルグの守りが崩れる".
  - Because the combat is a single round, the party has a puzzle: break the standard **early**. Use high-NoA first-strikers such as ninjas (or Fertility), then let the heavy hitters land (resonance casters, big single hits).
  - This rewards something other than the sniper meta: hit count before power.
- **Ice-absorb, carried over from D1.** It is announced in the START log. This is the one hard counter in D9: it is on the boss, it is telegraphed, and it is a callback to D1.
- **`a.true-sight`** (as in D1): no fog or illusion tricks against him.
- **Optional:** a two-stage boss (6-4a with the standard, 6-4b "last stand" with `a.rage`2, HP carried over). It needs a new room type, so it is not in phase 1.

**Target numbers:** at a "ready" build, reach to the boss ≥ 30% and boss kill 30–60%. D8 today: reach 5–12%, kill 95%.

### Gods Battle: Skuva (God of Dusk, Murid ninja)
- Condition: the boss is defeated and either the usual Boss Rares **or** 6/6 Memory Fragments (O6).
- Gimmick: `a.stealth`. Melee attacks miss when Skuva is low, so the finish needs ranged or magic. That is the mirror of F1's melee floor.
- Reward: the existing Skuva items 8517 / 8518 (`c.unlock_Murid_ability`).

---

## 7. Gate experiment: "captured positions" (陣地確保)

D9 only. When a Clear-Gate streak reaches **⌈N/2⌉**, that position is captured. After that, a failed run resets the count to the checkpoint, not to 0. The gate shows it as "陣地確保 4/7".

Expected runs to unlock (p = success rate per run):

| N | p | Streak today | With checkpoint |
|---|---:|---:|---:|
| 3 (5F gate) | 0.3 | 51.5 | 17.8 |
| 3 | 0.7 | 6.4 | 4.9 |
| 7 (1F gate) | 0.5 | 254 | 44 |

The checkpoint helps most **exactly where runs stall** (low p, days at "0/3"). It is never harder than today. Gate counts can be raised on D9 to compensate. The twin can compare both rules on the same seed before the change ships.

A rejected alternative is a tug-of-war counter (+1 / −1). It needs p > 0.5 to make any progress, which makes walls *harder*.

---

## 8. Rewards and item concept

D9 currently drops tier-1 items, a placeholder. The recommendation:

- **Common / Uncommon: 追憶 "Memento" gear.** These are D1 item names reforged at tier 9 (e.g. 追憶のつる巻き弓). They support the theme and reuse D1 naming.
- **Elite: officer's insignia (将校). Boss: imperial regalia (帝国).**
- **Quartermaster (補給係):** clearing D9-F4 adds a shop lineup that sells tier-9 war-issue items and rations for gold (20k–60k per item).
  - It addresses finding 5: the item-tier clock becomes partly controllable.
  - It addresses finding 6: gold gets a use.

---

## 9. Side parties: "second front" (phase 3, needs an architecture check)

While PT1 is in D9, each 10 Clears by a side party (PT2–PT6, any D1–D8) give +1 ration for PT1's next D9 run, up to the cap. This gives idle parties a job (finding 7).

**Risk:** parallel AFK processing may give a different valid FIFO order between parties (Spec 1). Read the side parties' lifetime Clear counts as a **snapshot when PT1's run starts** (read-only), and never write across workers.

---

## 10. Readability support (small UI and API additions that make D9 fair)

- **Expedition view:** "最多終了地点 5F-2 (撤退 41%)", the room where most recent runs ended. This makes attrition visible (finding 1).
- **Battle log:** every object effect logs with `[物]`. The Messenger, Standard, and Artillery outcomes appear as one line each.
- **API:** D9 adds `rations`, `memoryFragments` (n/6), and `standardBroken` to the run summary. `bossDefeated` per party is already requested by every report.

---

## 11. Rollout and validation

| Phase | Content | Change tier |
|---|---|---|
| 1 | Roster 388–423, named elites, boss Verg with the Standard and ice-absorb, objects O1 / O3 / O6, Memento drops. Deploy stays `test` | Release / cross-system |
| 2 | Messenger `a.escape`, rations and the Quartermaster, Field Hospital, the checkpoint gate | Release / cross-system |
| 3 | Second front (side parties) | Cross-system, after the AFK determinism review |

**Metrics to check with AI runs** (the twin, `roomtab`, and the Charge emulator already exist):
1. Reach to the boss vs boss kill rate, at a ready build. Target: reach ≥ 30%, kill 30–60%.
2. First failing room (`roomtab`). No single room should cause more than 50% of failures. No room should have 0 wins for a common build.
3. Build diversity. The best plans for ≥ 3 different formations should be within 20% of each other.
4. Days at the D9 wall for the standard sniper meta vs a melee / Murid formation.
5. Object effect: the share of runs where the Supply Depot, Hospital, or Rations changed the outcome (from log counts).
6. Messenger escape rate, and the elite win rate with and without an escape.
7. Gold spent per day in D9.
8. Gate days: streak vs checkpoint, in the twin with the same seed.

## 12. Open questions for the designer

1. Item tier: real tier 9, or Memento (D1 names at tier 9)?
2. Keep enemy level 43? That puts the F5 elite at 50 and the boss at 53.
3. Story: should the party stay a neutral third side, or march with one army?
4. Is the gate checkpoint allowed as a D9-only experiment?
5. Are rations D9-only, or a later global system?
