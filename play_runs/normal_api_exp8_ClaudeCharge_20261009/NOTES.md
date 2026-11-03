# ClaudeCharge run notes (live)
Workspace: $SP/play (t.py client, run.py loop, lp.py, pipe.sh, runplan2.py, x*.kemoz exports, plans x*A/H/C/G.json)
Emulator: $SP/tools (api2.mjs bundle via build2.mjs; emu.mjs exact elapsed+commit emulator incl. extracted FULL/SEMI auto-equip;
  dtest.mjs policy sim, farm.mjs EXP/12h, applyplan.mjs, fullreset.mjs, setlv.mjs)
Electron: launch.sh (ud in $SP/play/ud), account ClaudeCharge (prod/normal). T0 signup 2026-10-09T05:10:03.712Z.

## Timeline
- D1 boss: 2026-10-09T23:11:03Z = 0.75 d, call 37 (plan A 8 calls took boss 2.4% -> 100%; should have rated at boss-open ~0.5 d)
- D2: gate 4 passed with plan H (4 calls); Lv10 slot unlock left empty slots (SEMI does not fill)
- D2 gates 5-6: GA plan x3G (13 calls) 96%/85% (plan C 34 calls only 55/30). Boss gate open 10-10 10:11 (1.21 d), call 73
- D2 boss: fast plans weak (A 9%); boss GA cold = survive-only 0%; seeded GA from A/C running (x4S, x4S2)

## Lessons
- depthLimit no-op for gates; Defeat keeps route EXP but HP 0 blocks sorties until a natural run completes
- auto-equip only after elapsed chunks (not after sorties); SEMI only upgrades in place, never fills new slots
- seeded/cold GA on gate objective >> proxyopt/hpopt at D2; boss objective needs damage seed

## Final
- D3 ≤1.79 d (c127), D4 3.62 (c227), D5 ≤5.45 (c289), D6 ≤10.28 (c488), D7 ≤15.02 (c642)
- D8 boss First Clear 2026-10-29T02:28:38Z = 19.89 d (Global Diary), kill inside call 804; 818 requests total. PT1 Lv32.
- Wall breaks came from fresh-export re-plans once a new item tier piled up (D6 tier 6, D7 tier 7, D8 tier 8).
