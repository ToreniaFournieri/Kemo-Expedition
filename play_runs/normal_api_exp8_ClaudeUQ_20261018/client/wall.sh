#!/bin/bash
# wall.sh ROOM HP D : elite.sh ROOM HP, then 2 max success GAs guarded gateDamage(ROOM,HP)>=0.95, then resume the dest loop + boss + next dests
cd "$(dirname "$0")"; source ./env.sh; R=$1; H=$2; D=$3; export DEST=$D EBIG=45
./elite.sh $R $H
for i in 1 2; do GROOM=$R STARTHP=$H OG='{"gateDamage":0.95}' FORCEBIG=1 ESKIP=-1 BIGMAX=1 LOWOBJ=none python3 replan.py 2 success 2>&1 | grep -E "METER|GA|APPLY" | sed -E 's/ evals [0-9]+//; s/ pts .* cross/ cross/' | cut -c1-400; done
python3 bs.py 500 success 1 21
echo "$(date +%H:%M) wall $R done" >> ../notes.md
[ "$NORESUME" = 1 ] && exit 0
AUTOGA=success:x NST=4 PT=1 K=1 python3 hl4.py 400 6 1 >> ../logs/d$D.log 2>&1
if grep -q "BOSS KILLED" ../logs/d$D.log; then echo CHAIN_DONE $D killed-in-stage >> ../logs/chain.out
else tail -3 ../logs/d$D.log | grep -q "BOSS OPEN" || { echo CHAIN_STOP $D no-boss-open >> ../logs/chain.out; exit 1; }
  ./boss7x.sh $D || exit 1; fi
[ $D -le 7 ] && { python3 release.py >> ../logs/release.log 2>&1; tail -1 ../logs/release.log >> ../logs/chain.out; }
echo "$(date +%H:%M) D$D done calls $(python3 t.py N)" >> ../notes.md
[ -n "$NEXTD" ] && ./run25.sh $NEXTD
