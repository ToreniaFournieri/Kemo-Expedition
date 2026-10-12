# ClaudeTune3 notes (build 44)
- Game start (in-game) 2026-10-12T11:25:36Z; real start 20:23 JST.
- D1: 16 tunings (success + bossDamage), none recorded a candidate; runs=1300 (success) / 1600 (bossDamage) = baseline + current quick (+1 candidate). Inventory has 63 items incl. 1406 a.true-sight. Check later why steps 2-4 try nothing.
- D2 boss: char 3 bossDamage tuning accepted a.null-life-drain (2307), the only recorded ability candidate (counter map working). +10.7 %.
- D2 boss: medium GAs useless (route 0-1 %); one big success GA (pop64/gen200/300 s) 1 % -> 59 % route, boss-only 70 %. Use big GA at every wall.
- D1 boss 10-12T21:15 (0.41 d, call 124); D2 boss 10-13T10:00 (0.94 d, call 289); D3 boss 10-13T18:01 (1.27 d, call 427).
- D3 gates: char 4 tuning accepted +69 % (e.none switch on 2 slots + r.thunder) at 6f-2; char 2 e.ice switch +45 % at 3f-4. Tuning before a big GA does get accepted (4 of ~40 so far).
- D3 boss: bossDamage tuning accepted +7.4 % (e.thunder) but kill stayed 0 %; big bossDamage GA 0 -> 98 % boss-only (route 1 %); big success GA -> route 31 % / boss 76 %; Clear on the first sortie.
- tw.py bug (mine): bossDamage path skipped the GA whenever a tuning was accepted; now gated on the Success rate.
- D4 boss 10-14T19:53 (2.35 d, call 700): farm 12 h at 5f-3 (Lv18->21, experience GA) after the boss gate sat at 14 %; boss.sh: bossDamage tune accepted e.ice +8 % (kill 9->12 %), big bossDamage GA 51->99.8 % share, big success GA route 12->47 %, Clear on first sortie.
