#!/bin/bash
# farm.sh depth loops [S] : farm at depth with a success GA, then depth all + bossDamage/success GA
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=.. ORD=1 DEI=1 EXTRA='{"timeBudgetSeconds":100}'; S=${3:-2520}
python3 t.py POST /commit/expedition/1/changeExpedition "{\"depthLimit\":\"$1\"}" | head -1
DEI=0 python3 ga.py ${FOBJ:-success} medium | head -1
STALL=0 python3 run.py $S 6 $2 6 0 2>&1 | grep "OBS\|calls" | tail -3
python3 t.py POST /commit/expedition/1/changeExpedition '{"depthLimit":"all"}' | head -1
./polish.sh
