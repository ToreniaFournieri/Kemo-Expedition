#!/bin/bash
# chain.sh D : stage D (until BOSS OPEN, max 3 stage passes) then boss prep+attack, up to 3 boss tries; never boss prep without BOSS OPEN
cd "$(dirname "$0")"; source ./env.sh; D=$1; export EBIG=$([ $D -ge 4 ] && echo 45 || echo 1e12)
for s in 1 2 3; do
  if [ $s = 1 ]; then ./stage.sh $D ${SL:-200} > ../logs/d$D.out 2>&1; else AUTOGA=success:x NST=${NST:-4} PT=1 K=1 python3 hl4.py ${SL:-200} 6 1 >> ../logs/d$D.log 2>&1; fi
  grep -q "BOSS KILLED" ../logs/d$D.log && { echo CHAIN_DONE $D killed-in-stage >> ../logs/chain.out; exit 0; }
  tail -3 ../logs/d$D.log | grep -q "BOSS OPEN" && break
done
tail -3 ../logs/d$D.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP $D no-boss-open >> ../logs/chain.out; exit 1; }
for i in 1 2 3; do
  PASSES=2 G=0.6 ./boss.sh $D 30 > ../logs/boss${D}_$i.out 2>&1
  grep -q "BOSS KILLED" ../logs/boss${D}_$i.out && break
done
grep -q "BOSS KILLED" ../logs/boss${D}_$i.out || { echo CHAIN_STOP $D boss-not-killed >> ../logs/chain.out; exit 1; }
echo CHAIN_DONE $D $(python3 t.py N) >> ../logs/chain.out; tail -3 ../logs/boss${D}_$i.out >> ../logs/chain.out
