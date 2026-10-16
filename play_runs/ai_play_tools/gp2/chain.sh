#!/bin/bash
# chain.sh D : stage D until BOSS OPEN (max 3 loop passes), then boss prep + attack (max 3 tries). Never boss prep without BOSS OPEN.
cd "$(dirname "$0")"; source "${GP2_ENV:?set GP2_ENV}"; D=$1; L=$BOKEMO_PLAY_DIR/logs; mkdir -p $L
for s in 1 2 3; do
  if [ $s = 1 ]; then ./stage.sh $D ${SL:-200} > $L/d$D.out 2>&1; else PT=1 K=1 python3 hl4.py ${SL:-200} ${OB:-6} 1 >> $L/d$D.log 2>&1; fi
  grep -q "BOSS KILLED" $L/d$D.log && { echo CHAIN_DONE $D killed-in-stage $(python3 t.py N) >> $L/chain.out; exit 0; }
  tail -3 $L/d$D.log | grep -q "BOSS OPEN" && break
done
tail -3 $L/d$D.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP $D no-boss-open >> $L/chain.out; exit 1; }
for i in 1 2 3; do
  ./boss.sh $D ${BL:-30} > $L/boss${D}_$i.out 2>&1
  grep -q "BOSS KILLED" $L/boss${D}_$i.out && { echo CHAIN_DONE $D $(python3 t.py N) >> $L/chain.out; exit 0; }
done
echo CHAIN_STOP $D boss-alive $(python3 t.py N) >> $L/chain.out; exit 1
