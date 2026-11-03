# ClaudeTune2 notes (build 42)
- GAX env (not EXTRA) carries the big GA budget (pop 64, gen 200, quick 300, confirm 1000, 300 s): D4 gate3 40->76 %, gate 4/5 22->93 %, D4 boss-only bossDamage 17->97 % (after an `experience` GA at 5f-3 farm built Lv22).
- EXTRA leaking into tune.py -> 4x HTTP 400 (populationSize unknown member): tool bug of mine, 4 calls.
- stagedEquipmentTuning after a big GA: never accepted (0 of ~24), as in ClaudeTune.
- D4 boss down at 10-15T16:15, call 923 (route success 25-32 % while boss-only 96 %).
- Key: ga.py default COMP is equipment,jewels; D5 boss: equipment-only bossDamage GA broke route (2f-1 bottleneck, route 1 %); full-component success GA x2 -> route 64 %, boss-only 91 %.
- D5 boss down 10-17T04:35 (call 1223). D6 boss down 10-20T00:31 (call 1832, Lv27): bossDamage GA wrecks route (1f-1 room loses 65 % HP, sim success 0 whatever the depth); minDefeat GA = 100 % Draw build (useless, T10 again); recipe that worked: farm Lv27 with experience GA at 5f-3, bossDamage GA, then `success` GA at depth 5f-4 (signal 87 %), then success GA at `all` x3 -> route 10 % -> boss in 6 sorties. depthLimit "6f-3" invalid (400).
- gaSearch objective enum lacks `progress` (simulationRun has it): 400.
