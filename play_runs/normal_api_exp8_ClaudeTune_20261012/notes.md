# ClaudeTune run notes (live)
Start: signUp 2026-10-11T21:29Z in-game (revision 7 after opening), build 41, Electron ud /tmp/bokemo-tune.

## Findings
- T1 (D1 boss, call 62-69): stagedEquipmentTuning had no candidate at all (runs=1100 = baseline + one quick run): early
  inventory has no elemental, resist or ability items, and tuning has no raw-power step. 0.7 s per call.
  gaSearch `success` returned noChange (0 % -> 0 %: every run reaches the boss and Draws, so the success fitness's
  rooms-reached tie-break is flat), while gaSearch `bossDamage` went 0 % -> 49 % success (share 0.18 -> 0.89).
  Suggestion: the `success` fitness could use the boss damage share as its tie-break when runs reach the boss.
- T2 (D2, call 211): after any applyBuildResult PT1 is SEMI, so new drops are never equipped until the next search/tuning.
  I lost ~8 game hours at D2 gate 3 (22 % forecast; one GA -> 97 %). Re-plan on every gate stall from the start.
- T3: tuning cannot pass at high success: minImprovement/minGateImprovement are relative (+7 %), so from 93.5 % up no
  candidate can qualify. Tuning calls above ~90 % are wasted (wall.sh now skips them).
- T4: tuning at 0 % `success`: both scores 0 -> ratio 1, so a candidate needs a non-zero quick score to count. At bosses
  `success` tuning is flat; `bossDamage` gives a signal.
- T5 (D2-D4): accepted tunings were offense-element switches: D2 e.ice +39 %, e.none +31 %; D3 e.ice +21 %, e.none +29 %;
  D4 gate 2 e.fire +99 % (0 -> 17.6 -> 33.8 % with GA) — the biggest single lever at that gate.
- T6 (D4): tuning's element choice is local to the bottleneck room. It switched rangers 3/4 to fire for the 1f-4 elite
  (fire-weak), but D4 5f-6f and boss #243 are Felidian (r.fire 0.67, boss c.fire-defense x4/5): the live log shows
  fire arrows doing 1/2 of char 2's thunder damage. Later bossDamage tuning with offenseElementRequest e.thunder found no
  qualifying candidate because the thunder items were a tier lower.
- T7 (D4 boss): step 5 (500 runs, final seed) said +38.8 % for an r.fire swap, step 6 (1000 runs, baseline seed) +9.7 %,
  gain 0.018 < 2 SE 0.0354 -> rejected. Several r.fire candidates at +15..50 % quick were all rejected by the luck check.
- T8 (D4 boss, cid 6 guardian bossDamage): four different candidates (r.thunder+r.fire 3305 in slot 6 or 0,
  a.null-corrode 3302 slot 3, a.anti-overwatch 4303 slot 4) all scored exactly +0.2186 on the quick seed. Suspicious:
  maybe any change of the guardian shifts the same thing (RNG path or a recomputed cache).
  RESOLVED offline (tools/tunecheck.ts on d6a.kemoz): the current build simulated as `state` and as fresh arrays gives the
  same score; the ties are coarse 100-run counts (one success = 1 pt = ~3 % relative) where most guardian swaps leave the
  outcomes unchanged. Not a bug, but quickRuns=100 makes `minImprovement` 0.07 = 2-3 extra successes.
- T9: removeAllEquipment rejects `simulation`/`confirmation` (400 `simulation is not a known member`); 6 wasted calls.
- T10: gaSearch `minDefeat` at a 0 % boss returns a 100 % Draw build (verdict veryGood) — useless for a boss.
- T11 (winner's curse): steps 2-4 record the best of up to ~50 candidates scored on 100 quick runs, so recorded
  improvements are inflated: D5 gate +21..27 % quick -> +1..4 % in step 5 -> -2..-11 % in step 6 (several tunings
  ended with a negative final improvement). Suggest quickRuns >= 300 by default, or re-score the recorded candidates on a
  fresh seed before step 5.
- T12: `bossDamage` tuning's bottleneck is a route room whenever runs end on the route (prepareObjectiveState opens all
  gates and runs the full route). Offline on the GA37 D8 save: bottleneck 3f-4, not the boss. So step 2's element order and
  step 4's breaker priority follow route enemies, not the boss. Spec 7.1.5/9.1.3 say "simulates the boss room".
- T13: tied quick improvements for different items in the same slot (D5: a.anti-overwatch 4303 and a.dryproof 4203 in
  slot 3 both +0.2692; r.fire 5305 vs 4306 in slot 6 both +0.0753; D4 guardian four candidates +0.2186). With shared dice the
  gain comes from removing the slot's current item, not from what is put in. Natural, but it means step 4 "ability" gains
  are often "drop this item" gains, and the ability label is misleading.
- T14 (D4/D5 farming): `success`-tuned gate builds died on the route at D4/D5 5f-6f normal rooms; a 12 h farm at 4f-4
  (K=6 batched, 2400 s loops, ~42 calls) then GA x2 took D5 boss gate 10 % -> 66 % and the boss 26 % -> 72 %.
- T15: `steps.finalTuning[].improvement` after a swap is the gain over the candidate it replaced, not over the current
  build (D6 cid 2: finalTuning e.thunder +0.0484, step 6 +0.7466). Reads like a contradiction; document it or report
  both numbers.
- T16 (D6 gate 3): GA noChange x2 at 63 %; `elem.py` showed the GA had made ninja/ranger char 4 a pilgrim/sword-saint
  melee (92 melee attack) and picked Fertility (r.fire x1.5 on all). Manual `changeBuild` ninja/ranger + `autoEquipment
  FULL immediate` (2 calls) -> 71.7 % at once; tuning on top found nothing more and the GA kept ~70 % (noChange).
  FULL refresh is a cheap in-game power source; tuning alone never adds raw power.
- T17 (D6 boss, calls 1728-1745): "FULL refresh -> tune" on the GA's hybrid classes is harmful: `autoEquipment FULL
  immediate` on chars 2-5 (alchemist/ranger, sword-saint/ranger, ninja/ranger, sword-saint/wizard) follows each MAIN
  class's category order, so the rangers got melee/robe items: boss share 0.24 -> 0 (runs died at 1f-4), and with a zero
  score both tuning and the GA had no signal (all candidates 0 -> ratio 1 / noChange). Undo restored it, but char 2's
  undo first failed (409 `equipment_unavailable`) until chars 3-5 were undone (their FULL runs had taken its old items).
  FULL is only a safe power source when main class = the role (e.g. ninja/ranger, T16).
- T18 (D6 boss #315, live log): the party reached the boss with 4,260/11,778 HP (route attrition) and the boss's first
  magic thunder hit (13,482 on char 2) ended it after one round (46 % of boss HP dealt). Tuning kept proposing r.thunder
  (6314 / 4315+6314) for chars 2 and 3 (+7..54 % quick, +6..10 % final) but the luck check rejected them each time.
- T19: exact meter = gaSearch with `targets:[{characterId:1, changeableComponents:{}}]`, seed fixed, verifyRuns 1000
  (1 call, ~1 s). D6 boss share by deity: fertility 0.242, restoration 0.189, mirage 0.161, fortification 0.106,
  resonance 0.103 -> the GA's deity pick was already the best.
- T20: gaSearch `bossDamage` verdicts are often `noisy` (D6: +4.3 pt share, SE 2.6) because the share's variance uses the
  Bernoulli bound p(1-p); a per-run share variance would let real gains pass.
- T21 (D6 boss): with the boss room as the bottleneck (6f-4: 99/99 arrivals die), step 4 did try 6309
  a.illusion-breaker first for chars 4 and 2 (+18 % / +64 % quick) — the breaker priority works. Not kept by step 5.
  With route-room bottlenecks (2f-4 at gates) it never comes up.
- T22 (D6 boss down 8.33 d, call 1924): boss open 5.66 d; then 4f-4/5f-3 farms (12+12+12+24 h, Lv26 -> 28) with boss
  re-plans in between. Share by meter: 0.10 (Lv26) -> 0.24 (Lv27) -> 0.28 (Lv28, before re-plan) -> GA x2 0.42 -> tuning
  char 2 e.fire +19 % (accepted, 3 entries) 0.49 -> GA x2 0.58 / 5 % success -> first sortie Clear. Two of the useful GA
  results were `noisy` (applied with confirmation). 6309 stayed on the rangers (manual + FREEZE once).
- T23: my meter call (a gaSearch) replaced the party's kept GA result, so the next applyBuildResult was 409 illegal_action
  (as specified: one kept result per party). A read-only "measure" mode that keeps the stored result would help.
- T24 (D7 boss open 9.14 d, call 2087): share 0.245 -> GA 0.30 (noisy) -> noChange; tuning nothing accepted. GA37's
  "rebuild one attacker" lever backfired here: char 3 guardian/ranger (640 x7 ranged, pd 1602) -> ninja/ranger + FULL
  dropped the share to 0.15 (party HP/defense lost, Retreat 40 %); the GA from that basin got back only to 0.22.
  The tank gear was holding the party HP pool. Situational lever, measure with the meter before keeping it.
- T25 (D7 boss down 10.31 d, call 2240): Lv29 9 % -> Lv30 took 25 h of 5f-3 farming (GA `experience` build, ~3,100
  EXP/run, K=6/2400 s). At Lv30 one bossDamage GA took the share 0.23 -> 0.54, two more -> 0.68 (but 65 % Draw = boss
  timeout, success 1.9 %); then a `success` GA -> 28.8 % and the boss died in a natural run 3 loops later. Tuning
  (bossDamage, element candidates 3) recorded no element candidate at all on D7 and nothing passed.
- T26 (D8 gate 2): my loop's extra sorties at HPF2=0.6 started at reduced HP, but forecasts assume full HP and a gate is a
  consecutive streak, so each low-HP Retreat reset the streak (D8 gate 2: many T at 2f-3). Use HPF2 >= 0.95 at streak
  gates. Likely cost me time at every earlier gate as well.
- T27 (D8): the GA set char 4 to e.ice (Voidspawn resist ice x2/3); forced `offenseElementRequest e.thunder` produced
  one candidate only (its single ice item -> tier-3 thunder 3213, improvement 0): tuning's element switch is limited by
  owned items of the same category; it never swaps category to find a high-tier item of the wanted element.
- T28: `MINV=noisy` in my client applied a noisy result with negative gain (-2.4 pt) once; fixed to require gain > 0.
- T29 (D8 gate 4, 11.9 -> 13.5 d): 10 % per run at arrival; farm 3f-3 12 h (GA+tuning farm build 72 %, tuning e.thunder on
  char 4 accepted) -> 37 %; deity meter: mirage 0.365 > fertility 0.333 > restoration 0.324 > fortification 0.238.
  Rebuild char 3 (lord/ranger support) as ninja/ranger + FULL + thunder tuning: 0.365 -> 0.262, GA from there 0.339 (kept).
  Another 24 h farm (Lv31) -> meter 0.541, GA x2 -> 0.563. Retreat (party HP <= 30 %) on 2f normal rooms and the 3f-4
  elite is the main failure; gear tier, not build, is the limiter.
- T30 (D8 boss down 15.00 d): gate 4 (56 %) -> gate 5 (41 %) -> boss gate (25 %) fell in ~33 game hours of grinding with
  re-plans every 3 observations; the sortie that completed the boss-gate streak also killed the boss (Clear,
  `bossFirstClear` 2026-10-26T21:30:40Z, ledger line 3,059).
- T31 (post-run probes): same `seed` on the same revision -> identical tuning result (accepted, improvement, runs,
  forecasts); only `elapsedSeconds` differs. Tuning took median 1.7 s, max 9.6 s (403 calls); no timeout.
- T32: my client's call counter (tstate `n`) undercounts by 23 (concurrent writes from hl.py and its wall.sh subprocess);
  batch_calls.jsonl line count is the true number.
