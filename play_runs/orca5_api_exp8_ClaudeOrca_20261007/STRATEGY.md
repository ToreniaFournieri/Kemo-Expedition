# ClaudeOrca: v0.10.1 Orca (+5) API strategy
Recorded before signup (2026-10-07).

Goal order: (1) defeat Expedition 8 boss, (2) minimise in-game time, (3) minimise API calls, 8 h real-time cap.

## Evidence read
- Orca history: v0.9.7 Orca runs (108/109/154) only reached D4 boss gate (30 d, Lv28) with the old guide build and no optimiser;
  FULL auto-equipment beat manual gear after ~Lv10; `depthLimit all` is dangerous near gate unlocks; long all-depth advances accumulate defeats.
- Normal-mode v0.10.1 record runs (Fable 28.1 d/449 calls, Slot2 29.5 d, Sortie2 34.2 d, U1 41.9 d, Magic 50 d) and ai_play_tools README.
- Orca = enemies +5 levels, first-strike/upgrade-all-abilities => harder than Normal; expect each wall to need more level and gear. Total time
  likely 1.5-2.5x Normal, so EXP (levels) is the hidden clock even more.

## Concept: "Fable-Prime for Orca"
Reuse the proven Normal formation and opening, but judge every step in the twin (loaded with the Orca save) instead of trusting Normal numbers.
- Formation: Kemo lord/lord, Laika guardian/guardian in front (order 6,1,4,2,3,5), Ursan ninja/ranger x3 (abyssal_sea, precise), Selfin alchemist/wizard.
- Opening: signUp orca/+5 environment orca, 5 changeBuild + party/1 {order, deity}. Mirage only if the first twin check says D1-D2 improve; else Fortification.
- Spend all stored sorties early via `sortie {numberOfSortie}` (cheap EXP) but only at full HP and never during a gate streak.
- 12 h `elapsed` steps (43200 max), observing every 2 steps.
- `depthLimit Xf-3` / `Xf-4` for elite gates (Fable's last-minute discovery) from the first elite wall, before spending 20-50 build calls on plans.
- Wall loop: export -> pipe.sh (proxyopt attackers + hpopt supports + deity/weight levers) -> apply only if the rating moves >10 points.
- Deity per wall: Mirage (D1-2) -> Fortification -> Fertility (release PT3 first) -> Restoration/Precision at D6-D8.
- Near D8 boss use short steps and check Global Diary `bossFirstClear` to stop the clock accurately.
- Keep call count low: diff-only plans, few observations, no per-step exports.
