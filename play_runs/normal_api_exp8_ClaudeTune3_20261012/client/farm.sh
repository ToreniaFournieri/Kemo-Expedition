#!/bin/bash
# farm.sh dest depth loops tag : set depth, big experience GA, batched farm loop (K=6, 2400 s), back to depth all + big success GA
cd "$(dirname "$0")"; source ./env.sh; D=$1; DL=$2; N=$3; TAG=$4
python3 - <<P
import t
c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':$D,'destinationMode':'fixed','depthLimit':'$DL'},tag='dest'); print('DEPTH',$D,'$DL',c,(j.get('error') or {}).get('code'))
P
FORCEGA=1 python3 tw.py experience big - 2>&1 | grep -E "^GA|after|APPLY" | cut -c1-240
PT=1 K=${K:-6} HPF=0.9 HPF2=0 S0=2400 SMIN=2400 STOPCLEAR=0 python3 hl.py $N 6 0 > ../logs/$TAG.log 2>&1
grep OBS ../logs/$TAG.log | tail -2 | cut -c1-200; tail -1 ../logs/$TAG.log
