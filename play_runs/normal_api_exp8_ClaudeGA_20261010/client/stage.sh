#!/bin/bash
# stage.sh d [S k] : go to dungeon d, GA, gate loop w/ AUTOGA, boss GA medium, boss loop
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=.. ORD=1 DEI=1 EXTRA=${EXTRA:-{\"timeBudgetSeconds\":100}}; d=$1; S=${2:-1200}; k=${3:-6}
python3 t.py POST /commit/expedition/1/changeExpedition "{\"destination\":$d,\"destinationMode\":\"fixed\"}" | head -1
python3 ga.py success ${E1:-medium} | head -1
AUTOGA=success:${E1:-medium} STALL=0 python3 run.py $S $k ${N1:-60} 4 2>&1 | grep -v "^10-\|^11-\|^12-" | grep -v "before\|after\|calls" | tail -40
python3 ga.py bossDamage ${E2:-high} | head -1
python3 ga.py success ${E2:-high} | head -1
STALL=0 python3 run.py $S $k ${N2:-40} 3 0 2>&1 | tail -4
