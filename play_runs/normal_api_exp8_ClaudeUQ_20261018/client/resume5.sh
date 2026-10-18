#!/bin/bash
# resume5.sh: D5 gate loop, stall re-plans off (slot-unlock re-plan at Lv24 only) until BOSS OPEN, then boss7x, release, D6-D7
cd "$(dirname "$0")"; source ./env.sh; export DEST=5 EBIG=45
AUTOGA=success:x NST=100 STMAX=600 PT=1 K=1 python3 hl4.py 700 6 1 >> ../logs/d5.log 2>&1
if grep -q "BOSS KILLED" ../logs/d5.log; then echo CHAIN_DONE 5 killed-in-stage >> ../logs/chain.out
else tail -3 ../logs/d5.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP 5 no-boss-open >> ../logs/chain.out; exit 1; }
  ./boss7x.sh 5 || exit 1; fi
python3 release.py >> ../logs/release.log 2>&1; tail -1 ../logs/release.log >> ../logs/chain.out
echo "$(date +%H:%M) D5 done calls $(python3 t.py N)" >> ../notes.md
./run25.sh 6 7
