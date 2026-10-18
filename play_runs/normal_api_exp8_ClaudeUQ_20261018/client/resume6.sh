#!/bin/bash
cd "$(dirname "$0")"; source ./env.sh; D=6; export DEST=6 EBIG=45
AUTOGA=success:x NST=4 STMAX=36 PT=1 K=1 python3 hl4.py 500 6 1 >> ../logs/d6.log 2>&1
if grep -q "BOSS KILLED" ../logs/d6.log; then echo CHAIN_DONE 6 killed-in-stage >> ../logs/chain.out
else tail -3 ../logs/d6.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP 6 no-boss-open >> ../logs/chain.out; exit 1; }
  ./boss7x.sh 6 || exit 1; fi
python3 release.py >> ../logs/release.log 2>&1; tail -1 ../logs/release.log >> ../logs/chain.out
echo "$(date +%H:%M) D6 done calls $(python3 t.py N)" >> ../notes.md
./run25.sh 7
