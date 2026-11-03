#!/bin/bash
# resume5.sh: D5 gate loop with stall re-plans off (STMAX large) until BOSS OPEN, then boss prep/attack, then chain D6-D8
cd "$(dirname "$0")"; source ./env.sh; export DEST=5 EBIG=45
AUTOGA=success:x NST=40 STMAX=240 PT=1 K=1 python3 hl4.py 400 6 1 >> ../logs/d5.log 2>&1
tail -3 ../logs/d5.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP 5 no-boss-open >> ../logs/chain.out; exit 1; }
for i in 1 2 3; do PASSES=2 ./boss.sh 5 30 > ../logs/boss5_$i.out 2>&1; grep -q "BOSS KILLED" ../logs/boss5_$i.out && break; done
grep -q "BOSS KILLED" ../logs/boss5_$i.out || { echo CHAIN_STOP 5 boss-not-killed >> ../logs/chain.out; exit 1; }
echo CHAIN_DONE 5 $(python3 t.py N) >> ../logs/chain.out; echo "$(date +%H:%M) D5 done calls $(python3 t.py N)" >> ../notes.md
./run25.sh 6 7 8
