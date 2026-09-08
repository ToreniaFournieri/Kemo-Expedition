# AI Play usability findings — 2026/09/08

Observed in a fresh Desktop Orca v0.9.6 build 13 evaluation, `LaunchGuide` (`f7cd3535-d5be-4439-848c-2b53f0ea6f02`). The normal Expedition 1 boss was defeated on counted call 100; score **6,120**, actual sorties **5,120**, first winning sortie **5,082**. Gameplay stopped after the successful operation. This clears the regulation's objective, not every expedition in BoKemo.

See the [run report](../AI_play_report/006120_v0.9.6%2813%29_LaunchGuide_20260908.md) and [API evidence](../AI_play_report/LaunchGuide_20260908_evidence.json). Call numbers below refer to its authoritative ledger. Gameplay used only the official API; repository inspection was used to interpret behavior. Findings are separated from proposed changes so the evaluated runtime remains build 13.

## Completed: a first-launch guide

The [new guide](ai-play-quickstart.md), linked from the README, explains prerequisites, the working directory, dependency installation, npm argument forwarding, the build/launch sequence, connection-panel credentials, authenticated readiness, control acquisition, revision handling, lease recovery, idempotent retries, same-build resumption and terminal reporting. The README's obsolete 200-call limit was corrected to 20,000.

The live launch succeeded using the already-built assets:

```sh
./node_modules/.bin/electron . --environment=orca --ai-play=LaunchGuide
```

The connection panel was available without navigating the gameplay UI. Authenticated status returned Orca, build 13, ready, revision 0. GUI launch and the localhost client required normal host approval in this agent environment. Dependency installation from an empty machine was not tested; prerequisites were checked against `package.json`. This run does not establish the exact cause of Luna's earlier startup difficulty.

**Recommended next improvement:** offer an explicitly documented organizer connection handoff for API clients, so agents do not need computer-use access just to read the endpoint and token. Keep credentials out of ordinary logs and reports. This would need a scoped design and implementation; this task added documentation only.

## High priority: FULL can leave a character unable to attack

**Observed:** call 5 reported zero melee attacks for one Duelist and −1 ranged attacks for the Ranger. By call 18, XP remained 622 and several members still had zero/negative attack counts. Calls 10–18 consumed 900 actual sorties with no XP or item gain. A retained battle log at call 26 showed only three members making attacks before a room-1 draw.

**Source explanation:** FULL walks category priorities, but a candidate must have a strictly larger selection value than the current slot item even when the categories differ. Existing item IDs are also excluded from candidates. Consequently, a higher weapon/defense value can displace an attack-count item, and a later low-valued attack-count candidate cannot necessarily repair the composition. This is consistent with the current comparison rule; it is not presented as a proven implementation/spec mismatch.

**What helped:** legal class changes altered capacity, automatic equipment filled the new composition, and SEMI preserved it. Call 33 reached level 2. Later respecs and a front-row Guardian improved progress further. Locks helped retain attack-count items but also prevented their upgrades until unlocked. SEMI left newly unlocked capacity empty; the final level-11 snapshot records those empty slots.

**Recommendation:** clarify that FULL selects by the specified item heuristic and does not guarantee combat improvement. Warn when the proposed/resulting build has no effective attacks. Before changing the algorithm, decide whether category repair should override the cross-category value comparison. Any such change requires an explicit specification decision; it was not made during this run.

**Player/client lesson:** check attack counts and actual progress, not just attack values. Change strategy promptly when successive batches earn nothing. The nine zero-progress batches were an avoidable mistake by this player, not a necessary opening grind.

## High priority: required report data is absent from the API

The final observation exposes attack values/counts, raw defenses, evasion, elemental resistance and ability IDs/levels. It omits defense amplifiers, offense amplifiers and penetration needed by the status table in section 8.1.2.3. The automatic report contains accounting and an operation ledger but no final member status table or detailed strategic configuration summary.

This creates a compliance gap: after success, further gameplay observations are prohibited, and UI/internal-state inspection is prohibited throughout play. The completed report preserves the required table structure and marks unavailable fields `—`; it does not invent them. Exact builds and equipment variants are retained from the successful operation's observation.

**Recommendation:** include a complete, public final status-table snapshot in the successful operation/evaluation report and generate the full required report automatically. Reuse the authoritative display calculations in the runtime rather than requiring clients to reimplement them. Also make clear whether disclosed ability levels are base/display levels or effective battle levels.

## Medium priority: planned returns are labeled as wounded retreats

At calls 92–96, the party deliberately stopped at `3f-3`. The ending observation reported `finalOutcome: "Escape"`, 11 completed rooms, and substantial HP remaining. Call 92 ended at 860/1,083 HP; its aggregate outcome nevertheless reported `Wounded_Retreat: 100`. All five recovery batches reported that same aggregate category.

The run's aggregate 2,736 `Wounded_Retreat` outcomes therefore must not be read as 2,736 injuries. This makes route comparisons and automated diagnosis harder.

**Recommendation:** expose a separate return reason such as depth limit, injury threshold, draw, or gate while preserving existing outcome compatibility, or explicitly revise the documented outcome taxonomy. Forecast results should distinguish planned depth returns as well.

## Medium priority: evaluation reporting and terminal signals need polish

- **Filename padding:** the app wrote `6120_v0.9.6(13)_LaunchGuide_20260908.md`; regulation 12.1.2 requires a six-digit score. The delivered report was renamed to `006120_v0.9.6(13)_LaunchGuide_20260908.md` after evaluation retrieval and release. No writer fix was applied. Reading `/evaluation` again could recreate the original unpadded ledger file in this build.
- **Latest outcome is not the goal result:** the final operation won at run 12 and run 49, then its run 50 ended in defeat. Thus `latestExpedition.finalOutcome` says `Defeat` while `evaluation.status` correctly says `succeeded`. This is expected under exact-batch semantics, but clients need an explicit instruction to use the evaluation result. The guide includes one.
- **Terminal availability:** the final observation has no legal actions, yet `normalSortieAvailable` and `godBattleAvailable` remain true. The dispatcher still rejects terminal gameplay and Gods Battles were never attempted. These contradictory-looking flags should be labeled as underlying gameplay availability or suppressed for terminal evaluations.
- **Response size:** every gameplay response includes the cumulative operation ledger in `evaluation`. Its growth is unnecessary for ordinary decision-making and becomes more significant with a 20,000-call budget. A compact summary plus a separately retrieved ledger would reduce repeated data; measure before changing the contract.

## Follow-up investigations from source/API evidence

**Selectable races:** the initial observation's `selectableRaceIds` includes `kemoria` and `orcinian`, while their source definitions have `selectable: false`. The build validator checks that a race exists, without an explicit selectable check. These races were not selected or tested in this evaluation. Review catalog/validation parity with the UI before treating every advertised ID as a legal selection.

**Party-local timestamps:** the global `simulatedAt` remaining frozen is required. However, distinct completed batches at calls 92–100 also returned the same `latestExpedition.completedAt` despite their elapsed Cycle durations. Review chronology and side-quest timestamp semantics across batches; the evidence alone does not establish which field should change under the party-local clock contract.

## Validation and scope

The live run verified launch, authentication, readiness, lease recovery, previews, forecasts, strategic configuration, actual sorties, success accounting, final report creation and control release. The score reconciles to the ledger and exact completed batch counts. No runtime changes or build increment were made as part of this playtest; the guide and findings are documentation. The earlier build-13 limit change was already tested and built before the evaluation started. The full product test suite and clean-machine onboarding were not rerun for these documentation changes.
