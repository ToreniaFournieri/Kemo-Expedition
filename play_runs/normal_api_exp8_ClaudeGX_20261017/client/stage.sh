#!/bin/bash
# stage.sh dest [loops=200] : set destination, then hl4 gate loop with arrival re-plan (ARRIVE=1) and replan.py re-plans until BOSS OPEN
cd "$(dirname "$0")"; source ./env.sh; D=$1; N=${2:-200}
python3 - <<P > ../logs/d$D.log 2>&1
import t
c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':$D,'destinationMode':'fixed','depthLimit':'${DL:-all}'},tag='dest'); print('DEST',$D,c,(j.get('error') or {}).get('code'))
P
ARRIVE=1 AUTOGA=success:x NST=${NST:-4} PT=1 K=1 python3 hl4.py $N 6 1 >> ../logs/d$D.log 2>&1
tail -4 ../logs/d$D.log | cut -c1-250
