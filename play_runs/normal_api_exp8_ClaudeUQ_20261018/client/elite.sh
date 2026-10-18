#!/bin/bash
# elite.sh ROOM [startHp] : max gateDamage GA on ROOM (at startHp), then max progress GA guarded gateDamage >= 0.85 x share, then meter route
cd "$(dirname "$0")"; source ./env.sh; R=$1; H=${2:-}; export GROOM=$R TBX=${TBX:-240}
[ -n "$H" ] && export STARTHP=$H
python3 bs.py 300 gate:$R 1 21
FORCEBIG=1 ESKIP=-1 BIGMAX=1 python3 replan.py 1 gateDamage | grep -E "METER|GA|APPLY" | sed -E 's/ evals [0-9]+//; s/ pts .* cross/ cross/' | cut -c1-330
SH=$(python3 - <<P
import t,json,os
b={'numberOfRun':300,'objective':'gateDamage','gateRoom':'$R','seed':21}
if os.environ.get('STARTHP'): b['startHp']=float(os.environ['STARTHP'])
c,j=t.rpost('/read/expedition/1/simulationRun',b,tag='bs'); print(round(0.85*j['data']['rate'],3))
P
)
echo "guard gateDamage $R >= $SH"
OG="{\"gateDamage\":$SH}" FORCEBIG=1 ESKIP=-1 BIGMAX=1 python3 replan.py 1 progress | grep -E "METER|GA|APPLY" | sed -E 's/ evals [0-9]+//; s/ pts .* cross/ cross/' | cut -c1-330
python3 bs.py 300 success 1 21
