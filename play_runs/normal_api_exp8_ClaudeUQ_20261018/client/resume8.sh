#!/bin/bash
# resume8.sh: D8 loop, stall re-plans sparse (slot re-plan at Lv30) until BOSS OPEN, then boss7x
cd "$(dirname "$0")"; source ./env.sh; export DEST=8 EBIG=45 TBX=180
AUTOGA=success:x NST=${NST:-100} STMAX=${STMAX:-600} PT=1 K=1 python3 hl4.py 900 6 1 >> ../logs/d8.log 2>&1
grep -q "BOSS KILLED" ../logs/d8.log && { echo CHAIN_DONE 8 killed-in-stage >> ../logs/chain.out; echo "$(date +%H:%M) D8 done calls $(python3 t.py N)" >> ../notes.md; exit 0; }
tail -3 ../logs/d8.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP 8 no-boss-open >> ../logs/chain.out; exit 1; }
./boss7x.sh 8 && echo "$(date +%H:%M) D8 done calls $(python3 t.py N)" >> ../notes.md
