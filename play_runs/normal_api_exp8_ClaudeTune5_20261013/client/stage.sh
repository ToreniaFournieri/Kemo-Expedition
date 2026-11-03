#!/bin/bash
# stage.sh dest [loops=200] : arrive (route check + re-plan if < GATH) then the gate loop with AUTOGA until the boss gate is open
cd "$(dirname "$0")"; source ./env.sh; D=$1; N=${2:-200}
export GATH=${GATH:-85} QR=${QR:-100} TBB=${TBB:-180}
./arrive.sh $D > ../logs/d$D.log 2>&1
AUTOGA=success:big NST=${NST:-2} PT=1 K=1 python3 hl2.py $N 6 1 >> ../logs/d$D.log 2>&1
