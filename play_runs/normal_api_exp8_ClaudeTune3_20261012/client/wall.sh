#!/bin/bash
# wall.sh [gaObjective=success] [effort=medium] [tuneCids=4,2,3,5] [tuneObjective=same]: in-game re-plan at a wall:
# gaSearch (all components, global scope) for power/build, then stagedEquipmentTuning per attacker on top
# (skipped when the GA forecast is already >= SKIP % success; tuning's 7 % relative bar cannot pass there anyway).
cd "$(dirname "$0")"; source ./env.sh
O=${1:-success}; E=${2:-medium}; C=${3:-4,2,3,5}; TO=${4:-$O}
COMP=${COMP:-equipment,jewels,mainClass,subClass,lineage,predisposition,raceGender} python3 ga.py $O $E | head -4
S=$(python3 -c "import json,re;d=json.load(open('$BOKEMO_PLAY_DIR/ga_last_1.json'));a=d['forecast']['after'];m=re.search(r'Success ([0-9.]+)%',a if isinstance(a,str) else '');print(int(float(m.group(1))) if m else 0)")
if [ "$C" != "-" ] && [ "$S" -lt "${SKIP:-80}" ]; then python3 tune.py $C $TO 1 | grep -v "^  before"; else echo "tune skipped (GA forecast $S %)"; fi
