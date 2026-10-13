#!/bin/bash
# go.sh dest [depth=all] [gaEffort=medium] : change destination, tuning-first re-plan, then the gate loop
cd "$(dirname "$0")"; source ./env.sh; D=$1; DL=${2:-all}; E=${3:-medium}
python3 - <<P
import t
c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':$D,'destinationMode':'fixed','depthLimit':'$DL'},tag='dest'); print('DEST',$D,'$DL',c,(j.get('error') or {}).get('code'))
P
python3 tw.py success $E 2>&1 | grep -E "^TUNE|^TW|^GA|after|APPLY|abilit|Element" | cut -c1-260
