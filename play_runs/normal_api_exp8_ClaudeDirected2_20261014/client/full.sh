#!/bin/bash
# full.sh D [gateLoops=200] : stage (arrive + gate loop) -> boss prep -> attack loop; log in ../logs/full$D.log
cd "$(dirname "$0")"; source ./env.sh; D=$1
./stage.sh $D ${2:-200}
tail -3 ../logs/d$D.log
if grep -q "BOSS OPEN" ../logs/d$D.log; then
  ./boss.sh > ../logs/boss$D.log 2>&1; cat ../logs/boss$D.log | grep -E "^bossDamage|^success|DIRAPPLY|GA verdict|accepted=True" | cut -c1-200
  PT=1 K=1 python3 hl2.py ${3:-30} 6 0 2>&1 | tail -8
fi
