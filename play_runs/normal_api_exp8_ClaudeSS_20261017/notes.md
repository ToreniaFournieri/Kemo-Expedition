Sat Oct 17 17:30:31 JST 2026 start: signup+open 10 calls
17:41 D1 done calls 89
17:52 D2 done calls 187
18:05 D3 done calls 283
18:44 D4 done calls 458
- 18:44 D4 boss: route 0 % (defeat 71 %), bossDamage GA high 27->57 % share, guarded max success GAs noisy/noChange (guardStats reached 21/24, 52/55; qs progress never switched), route 0.8 %; killed on attack loop 4 (natural luck)
- 19:15-20:00 D5 5f WALL (Lv21-22): 4f-4 elite Salvata (Dragon, r.fire 0.5, fire-reflect, magic-seal) 100 % defeat; party arrives at 35 % HP after heatwave 4f.
  Cause: the 4f gate GA scope ends at 4f-3 (endsAt clearGate) -> it built a fire-ranged build that cannot pass the 4f-4 elite the next gate needs.
  4 max progress GAs noisy/noChange (progress dilutes the elite's HP share by 1/19); seeded max GA with 10 GX/GP D5 builds noChange (all seeds quickRate 0);
  stagedEquipmentTuning on 4,2,3,5: bottleneck 4f-4 found, nothing accepted (fire-protect-breaker noItem).
- 20:05 directedBuild meleeBurst/progress/high (allDeities, all components, AER FULL): good 0.761->0.777, 2 sword-saints, Draw 14 % (survive to timeout). Applied.
- 20:35 resume D5 loop, stall re-plans off until Lv24 slot unlock
20:39 D5 done calls 1053
- 20:33 Lv24 slot-unlock re-plan: max GA 0 -> 41 % (qs progress->success at gen 17), max GA 39 -> 60 %; 5f opened, BOSS OPEN at call 1028 / ~4.3 d. levelProbe at Lv22 had said Lv24 = 0 % (greedy fill only)
- 22:05 D6 boss: guarded success (signal auto) passes noisy at route 0-0.2 % (verdict stays on success -> never applied); switched boss4 to progress guarded by bossDamage (GX v3). resume6.sh
22:22 D6 done calls 1329
- 22:23 D6 BOSS KILLED call 1329, 5.61 d, Lv26 (boss6_r2: bossDamage high .82->.98, progress guarded max x2 .27->.64->.72, route 2 %, kill on attack loop 2)
- 22:55 replan: low-p (<15 %) first big GA uses objective progress again (successSignal auto at max only flips below 6.25 %)
- 23:22 D7 boss: boss4 try1 bossDamage .89 (boss-only Draw 86 %), progress guarded 2 passes, route 0 %. Switched to boss7x.sh (max bossDamage GA, guarded progress, attack 40 loops always)
23:36 D7 done calls 1683
- 23:36 D7 BOSS KILLED call 1683, 7.61 d, Lv28 (boss7x try2: max bossDamage .92->.9997 (boss-only 99.6 %), progress guarded .85x max .62->.91, route 39 %, kill loop 4)
- 00:05 D8 2f wall (p~.5, k6): GA noChange/noisy, directedBuild free noChange, rapidRanged/meleeBurst worse. resume8.sh: loop + sparse re-plans
00:53 D8 done calls 2642
- 00:53 D8 BOSS KILLED (diary 10-31T05:00:12Z, 13.85 d, call 2642), Lv31, real 7h23; boss8x try1: max bossDamage .89->.995, progress guarded .41->.62, route 4.8 %, kill loop 4
