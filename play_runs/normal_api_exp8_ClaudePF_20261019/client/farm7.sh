#!/bin/bash
# farm7.sh: farm D7 4f-3 (batch sorties) to Lv30, then depth all, slot re-plan (boss recipe boss7x) and D8 chain
cd "$(dirname "$0")"; source ./env.sh; export DEST=7
STOPLV=30 PT=1 K=${K:-6} HPF2=0 python3 hl4.py ${N:-400} 6 0 >> ../logs/farm7.log 2>&1
grep -q "LEVEL REACHED" ../logs/farm7.log || { echo CHAIN_STOP 7 farm-no-lv30 >> ../logs/chain.out; exit 1; }
echo "$(date +%H:%M) D7 farm Lv30 calls $(python3 t.py N)" >> ../notes.md
python3 t.py POST /commit/expedition/1/changeExpedition '{"depthLimit":"all"}' > /dev/null
mv ../logs/boss7x.log ../logs/boss7x_a.log
./boss7x.sh 7 || exit 1
python3 release.py >> ../logs/release.log 2>&1; tail -1 ../logs/release.log >> ../logs/chain.out
echo "$(date +%H:%M) D7 done calls $(python3 t.py N)" >> ../notes.md
./run25.sh 8
