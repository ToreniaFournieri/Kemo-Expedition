#!/bin/bash
# chain.sh D : stage D (until BOSS OPEN, max 3 stage passes) then boss (D<=3 boss.sh, D>=4 boss7x recipe); after a kill at D>=3 release side-party uniques
cd "$(dirname "$0")"; source ./env.sh; D=$1; export EBIG=$([ $D -ge 4 ] && echo 45 || echo 1e12); export DEST=$D
rel(){ [ $D -ge 3 ] && [ $D -le 7 ] && python3 release.py >> ../logs/release.log 2>&1; tail -1 ../logs/release.log >> ../logs/chain.out; }
for s in 1 2 3; do
  if [ $s = 1 ]; then ./stage.sh $D ${SL:-200} > ../logs/d$D.out 2>&1; else AUTOGA=success:x NST=${NST:-4} PT=1 K=1 python3 hl4.py ${SL:-200} 6 1 >> ../logs/d$D.log 2>&1; fi
  grep -q "BOSS KILLED" ../logs/d$D.log && { echo CHAIN_DONE $D killed-in-stage $(python3 t.py N) >> ../logs/chain.out; rel; exit 0; }
  tail -3 ../logs/d$D.log | grep -q "BOSS OPEN" && break
done
tail -3 ../logs/d$D.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP $D no-boss-open >> ../logs/chain.out; exit 1; }
if [ $D -le 3 ]; then
  for i in 1 2 3; do
    PASSES=2 G=0.6 ./boss.sh $D 30 > ../logs/boss${D}_$i.out 2>&1
    grep -q "BOSS KILLED" ../logs/boss${D}_$i.out && break
  done
  grep -q "BOSS KILLED" ../logs/boss${D}_$i.out || { echo CHAIN_STOP $D boss-not-killed >> ../logs/chain.out; exit 1; }
  echo CHAIN_DONE $D $(python3 t.py N) >> ../logs/chain.out
else
  ./boss7x.sh $D || exit 1
fi
rel; exit 0
