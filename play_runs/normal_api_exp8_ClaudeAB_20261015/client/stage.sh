#!/bin/bash
# stage.sh dest [loops=200] : arrive (route meter; ab.py success if < GATH) then hl3 gate loop with AUTOGA (tuning + A/B) until boss open
cd "$(dirname "$0")"; source ./env.sh; D=$1; N=${2:-200}
python3 - <<P > ../logs/d$D.log 2>&1
import t
c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':$D,'destinationMode':'fixed','depthLimit':'${DL:-all}'},tag='dest'); print('DEST',$D,c,(j.get('error') or {}).get('code'))
P
R=$(python3 bs.py 300 success | tee -a ../logs/d$D.log | python3 -c "import sys,re; m=re.search(r'rate ([0-9.]+)',sys.stdin.read()); print(int(float(m.group(1))*100) if m else 0)")
if [ "$R" -lt "${GATH:-85}" ]; then python3 ab.py success ${ABTB:-120} ${ABR:-2} >> ../logs/d$D.log 2>&1; fi
AUTOGA=success:x NST=${NST:-6} PT=1 K=1 python3 hl3.py $N 6 1 >> ../logs/d$D.log 2>&1
tail -4 ../logs/d$D.log | cut -c1-250
