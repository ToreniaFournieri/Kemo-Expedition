#!/bin/bash
# stage.sh d [n1] [n2]: go to dungeon d, GA, gate loop with AUTOGA until boss open, polish for boss, boss loop until Clear.
cd "$(dirname "$0")"; source ./env.sh; d=$1; L=$BOKEMO_PLAY_DIR/logs; mkdir -p $L; export COMP=${COMP:-equipment,jewels,mainClass,subClass,lineage,predisposition,raceGender}
if [ "$d" != "-" ]; then
  python3 t.py POST /commit/expedition/1/changeExpedition "{\"destination\":$d,\"destinationMode\":\"fixed\"}" | head -1
  python3 ga.py success ${E1:-medium} | head -3
fi
AUTOGA=success:high K=${K1:-3} HPF2=${HPF2:-0.6} S0=${S0:-1440} python3 hl.py ${2:-60} 3 1 2>&1 | tee $L/gate_$d.log
grep -q "BOSS OPEN\|CLEAR seen" $L/gate_$d.log || { echo "STOP: boss not open"; exit 1; }
grep -q "CLEAR seen" $L/gate_$d.log && exit 0
./polish.sh boss
K=${K2:-2} HPF2=${HPF2B:-0.8} S0=${S0:-1440} AUTOGA=success:high NST=2 python3 hl.py ${3:-30} 3 0 2>&1 | tee $L/boss_$d.log
