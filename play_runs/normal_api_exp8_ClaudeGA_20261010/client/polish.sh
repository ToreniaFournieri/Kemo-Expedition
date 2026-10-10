#!/bin/bash
# polish.sh [boss]: build-only pass, gear pass, success x2 (bossDamage first when boss)
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=.. ORD=1 DEI=1 EXTRA='{"timeBudgetSeconds":110}'
[ "$1" = boss ] && python3 ga.py bossDamage high | head -1
COMP=mainClass,subClass,lineage,predisposition,raceGender python3 ga.py ${OBJ:-success} high | head -1
for i in 1 2; do python3 ga.py success high | head -1; done
