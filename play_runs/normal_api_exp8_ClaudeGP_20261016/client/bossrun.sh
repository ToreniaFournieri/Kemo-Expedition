#!/bin/bash
cd "$(dirname "$0")"; source ./env.sh; D=$1
for i in 1 2 3; do
  PASSES=5 ABTB=200 G=0.6 ./boss.sh $D 30 > ../logs/boss${D}_$i.out 2>&1
  grep -q "BOSS KILLED" ../logs/boss${D}_$i.out && break
done
echo BOSSRUN_DONE $D $(python3 t.py N) $(grep -l "BOSS KILLED" ../logs/boss${D}_*.out) >> ../logs/chain.out
