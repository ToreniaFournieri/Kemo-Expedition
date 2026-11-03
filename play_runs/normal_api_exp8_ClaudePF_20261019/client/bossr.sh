#!/bin/bash
# bossr.sh D [guard=0.6] [loops=40]: route-first boss recipe (GP D6): 2 big success GAs guarded gateDamage(boss)>=G, meter, attack loop; on kill release + continue NEXTD
cd "$(dirname "$0")"; source ./env.sh; D=$1; G=${2:-0.6}; export DEST=$D TBX=${TBX:-240}
for i in 1 2 3; do
  { echo "== rtry $i $(date +%H:%M)"
    for k in 1 2; do OG="{\"bossDamage\":$G}" FORCEBIG=1 ESKIP=-1 BIGMAX=1 LOWOBJ=none python3 replan.py 1 success | grep -E "METER|GA|APPLY" | cut -c1-260; done
    python3 bs.py 500 bossDamage 1 21; python3 bs.py 500 success 1 21
    PT=1 K=1 python3 hl4.py ${3:-40} 6 0 | tail -4
  } >> ../logs/boss${D}r.log 2>&1
  grep -q "BOSS KILLED" ../logs/boss${D}r.log && break
done
grep -q "BOSS KILLED" ../logs/boss${D}r.log || { echo CHAIN_STOP $D bossr-not-killed >> ../logs/chain.out; exit 1; }
echo CHAIN_DONE $D $(python3 t.py N) >> ../logs/chain.out
[ $D -le 7 ] && { python3 release.py >> ../logs/release.log 2>&1; tail -1 ../logs/release.log >> ../logs/chain.out; }
echo "$(date +%H:%M) D$D done calls $(python3 t.py N)" >> ../notes.md
[ -n "$NEXTD" ] && ./run25.sh $NEXTD
