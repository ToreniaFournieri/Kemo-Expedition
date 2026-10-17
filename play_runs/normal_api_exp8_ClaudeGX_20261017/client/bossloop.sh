#!/bin/bash
# bossloop.sh D [blocks=8] [loops=24] : attack loop blocks; between blocks a guarded pair of big GAs
#   bossDamage with objectiveGuard progress>=PG, then progress with objectiveGuard bossDamage>=BG
cd "$(dirname "$0")"; source ./env.sh; D=$1; B=${2:-8}; L=${3:-24}
for i in $(seq 1 $B); do
  echo "== block $i $(date +%H:%M) calls $(python3 t.py N)"
  PT=1 K=1 python3 hl4.py $L 6 0 2>&1 | grep -E "OBS|BOSS|calls|ERR" | tail -3 | cut -c1-220
  grep -q "BOSS KILLED" <(tail -5 ../logs/bossloop_last.txt 2>/dev/null) && break
  python3 - <<P | grep -q killed && { echo "BOSS KILLED (diary)"; break; }
import t; c,j=t.gg('/read/observation/expedition'); p=j['data']['expeditionInfo']['parties'][0]
print('killed' if any(x['kind']=='godGate' for x in p['clearGates']) else 'alive', p['level'])
P
  FORCEBIG=1 ESKIP=-1 OG="{\"progress\":${PG:-0.45}}" python3 replan.py 1 bossDamage 2>&1 | grep -E "GAX|APPLY" | cut -c1-160
  FORCEBIG=1 ESKIP=-1 OG="{\"bossDamage\":${BG:-0.75}}" python3 replan.py 1 progress 2>&1 | grep -E "GAX|APPLY" | cut -c1-160
  python3 bs.py 500 success 1 21 | cut -c1-120; python3 bs.py 300 bossDamage | cut -c1-120
done
