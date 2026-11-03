# ClaudeUpd: v0.10.1 (31) Normal API strategy -- "Test New Updates"
Written before signup, 2026-10-10. Goals: (1) D8 boss, (2) min in-game time, (3) min API calls, 8 h real time.
Records: ClaudeRenew 17.09 d / 2,647 calls (build 30, renewed bosses). ClaudeCharge 19.89 d / 818 calls (build 27).

## What is new in build 31 (commit c64d5011)
| Update | How this run uses it |
|---|---|
| `commit/progress/elapsed` returns `parties[]` with `currentHp`, `chargeStock`, `controls.sortie` | The loop skips the sortie call when `controls.sortie.available` is false (`party_exhausted` after a Defeat, no charge). Renew wasted 186 calls on 409 sorties. |
| sortie / godsBattle responses return `currentHp`, `chargeStock`, `controls` | Logged per loop; used to see whether a sortie batch ended on HP 0. |
| `read/build/character/{status,...}` take `characterId` (one or array up to 36) | One call reads all six PT1 characters (verify a plan, find empty slots after Lv10/14/20). |
| `read/observation/party` adds `currentHp`, `experienceRatio`, `deityRank`, ... | Level/EXP check without the fragile compact read. |
| Spec 2.1: new party takes no deity if its default is in use | Already in code; plan PT1's deity moves around the PT3 (Fertility) unlock. |

## Run concept
Renew's fast play (short charge loops, plan at every boss-open and stall, farm depth for drops), plus the two
"opportunities" Renew listed, plus call savings from the new response fields:
1. **Same party/opening (9 calls)**: Laika guardian/guardian front, Kemo lord/lord, 3 Ursan/Leporian ninja/ranger
   abyssal_sea precise, Selfin alchemist/wizard utopia introspective; order [6,1,4,2,3,5], Mirage.
2. **Loop = elapsed S + sortie 6** (the server runs as many as the charge allows). Skip the sortie when the
   elapsed response says it is unavailable. S by charge tier: 1200 s at D1, 900-1080 s later; 2520 s when a grind is
   long and time is not the bottleneck.
3. **Plan at boss-open and at every stall** (two identical gate observations): export -> proxyopt/hpopt/lever ->
   seeded GA -> apply only for a real gain. Boss weights from Renew's table (D2 none, D3 ice, D4 thunder, D5 ice,
   D6 fire + Restoration, D7 fire, D8 thunder + HP supports).
4. **D6 from the first hour: farm at 4f-4** (deepest depth with <=5% Defeat) and **try Restoration early**; boss-only
   GA as soon as tier-6 drops pile up. D7: 3f-3 farm, then fire plan. D8: hpopt W0.2 + thunder3, then mdopt W0.5
   for gate 5 / boss gate attrition.
5. Gate progress is a consecutive streak: never grind a gate below ~60%/run; farm + re-plan instead.
6. Kill time from Global Diary `bossFirstClear`.

## Targets
- Time: <= 16 d (beat 17.09 d by fixing D6).
- Calls: <= 1,800 (Renew 2,647): no party_exhausted sorties, 1 batched character read instead of 6.
