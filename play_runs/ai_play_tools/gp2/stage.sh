#!/bin/bash
# stage.sh D [cycles=200] : set destination D (depth all) and run the hl4 gate loop until BOSS OPEN / boss killed
cd "$(dirname "$0")"; source "${GP2_ENV:?set GP2_ENV}"; D=$1; L=$BOKEMO_PLAY_DIR/logs; mkdir -p $L
python3 - <<P >> $L/d$D.log 2>&1
import t
c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':$D,'destinationMode':'fixed','depthLimit':'${DL:-all}'},tag='dest'); print('DEST',$D,c,(j.get('error') or {}).get('code'))
P
PT=1 K=1 python3 hl4.py ${2:-200} ${OB:-6} 1 >> $L/d$D.log 2>&1
tail -3 $L/d$D.log | cut -c1-250
