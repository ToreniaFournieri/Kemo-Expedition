#!/bin/bash
# arrive.sh dest [depth=all] : change destination, measure the route (1 call), tuning-first re-plan (tw.py success big) only if < GATH %
cd "$(dirname "$0")"; source ./env.sh; D=$1; DL=${2:-all}
python3 - <<P
import t
c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':$D,'destinationMode':'fixed','depthLimit':'$DL'},tag='dest'); print('DEST',$D,'$DL',c,(j.get('error') or {}).get('code'))
P
R=$(python3 bs.py 300 success | tee /dev/stderr | python3 -c "import sys,re; m=re.search(r'rate ([0-9.]+)',sys.stdin.read()); print(int(float(m.group(1))*100) if m else 0)")
if [ "$R" -lt "${GATH:-85}" ]; then GATH=${GATH:-85} python3 tw.py success big 2>&1 | grep -E "^TUNE|^TW|^GA|after|APPLY|counters|finalTuning|STOPHI" | cut -c1-300; else echo "route $R % >= ${GATH:-85}: no re-plan"; fi
