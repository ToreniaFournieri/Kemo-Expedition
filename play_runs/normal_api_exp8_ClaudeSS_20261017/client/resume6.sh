#!/bin/bash
# resume6.sh: D6 boss prep (boss4 v5: progress guarded by bossDamage) + attack, up to 4 tries, then chain D7-D8
cd "$(dirname "$0")"; source ./env.sh; export DEST=6 EBIG=45
for i in 1 2 3 4; do PASSES=2 MARGP=0.002 ./boss.sh 6 30 > ../logs/boss6_r$i.out 2>&1; grep -q "BOSS KILLED" ../logs/boss6_r$i.out && break; done
grep -q "BOSS KILLED" ../logs/boss6_r$i.out || { echo CHAIN_STOP 6 boss-not-killed >> ../logs/chain.out; exit 1; }
echo CHAIN_DONE 6 $(python3 t.py N) >> ../logs/chain.out; echo "$(date +%H:%M) D6 done calls $(python3 t.py N)" >> ../notes.md
TBX=300 ./run25.sh 7 8
