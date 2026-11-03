#!/bin/bash
# boss7x.sh D: max gateDamage(boss) GA -> progress GA guarded gateDamage>=0.85 share -> attack 40 loops regardless; repeat up to 3x
cd "$(dirname "$0")"; source ./env.sh; D=$1; export DEST=$D TBX=${TBX:-240}
for i in 1 2 3; do
  { echo "== try $i $(date +%H:%M)"
    python3 bs.py 500 bossDamage 1 21
    FORCEBIG=1 ESKIP=-1 BIGMAX=1 python3 replan.py 1 bossDamage | grep -E "GA|APPLY"
    SH=$(python3 bs.py 500 bossDamage 1 21 | tee /dev/stderr | python3 -c "import sys,re; m=re.search(r'rate ([0-9.]+)',sys.stdin.read()); print(round(0.85*float(m.group(1)),3) if m else 0.5)")
    OG="{\"bossDamage\":$SH}" FORCEBIG=1 ESKIP=-1 BIGMAX=1 python3 replan.py 1 progress | grep -E "GA|APPLY"
    python3 bs.py 500 success 1 21
    PT=1 K=1 python3 hl4.py 40 6 0 | tail -4
  } >> ../logs/boss${D}x.log 2>&1
  grep -q "BOSS KILLED" ../logs/boss${D}x.log && break
done
grep -q "BOSS KILLED" ../logs/boss${D}x.log || { echo CHAIN_STOP $D bossx-not-killed >> ../logs/chain.out; exit 1; }
echo CHAIN_DONE $D $(python3 t.py N) >> ../logs/chain.out
