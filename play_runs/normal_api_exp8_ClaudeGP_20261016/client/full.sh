#!/bin/bash
# full.sh D : stage (arrive + gate loop with tuning + A/B re-plans) then boss prep+attack
cd "$(dirname "$0")"; D=$1
./stage.sh $D ${2:-250}
if tail -3 ../logs/d$D.log | grep -q "BOSS OPEN"; then ./boss.sh $D ${3:-30}; fi
