#!/bin/bash
# chain.sh D : stage D then boss prep+attack, retry boss up to 3 times until killed
cd "$(dirname "$0")"; source ./env.sh; D=$1
./stage.sh $D > ../logs/d$D.out 2>&1
for i in 1 2 3; do
  PASSES=5 ABTB=200 G=0.6 ./boss.sh $D 30 > ../logs/boss${D}_$i.out 2>&1
  grep -q "BOSS KILLED" ../logs/boss${D}_$i.out && break
done
echo CHAIN_DONE $D >> ../logs/chain.out; tail -3 ../logs/boss${D}_$i.out >> ../logs/chain.out
