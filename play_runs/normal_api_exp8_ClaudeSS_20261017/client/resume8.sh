#!/bin/bash
# resume8.sh: D8 gate loop (stall re-plan every ~10 obs, TBX 180) until BOSS OPEN, then boss7x recipe
cd "$(dirname "$0")"; source ./env.sh; export DEST=8 EBIG=45 TBX=180
AUTOGA=success:x NST=10 STMAX=60 PT=1 K=1 python3 hl4.py 600 6 1 >> ../logs/d8.log 2>&1
grep -q "BOSS KILLED" ../logs/d8.log && { echo CHAIN_DONE 8 killed-in-stage >> ../logs/chain.out; echo "$(date +%H:%M) D8 done calls $(python3 t.py N)" >> ../notes.md; exit 0; }
tail -3 ../logs/d8.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP 8 no-boss-open >> ../logs/chain.out; exit 1; }
TBX=180 ./boss7x.sh 8
