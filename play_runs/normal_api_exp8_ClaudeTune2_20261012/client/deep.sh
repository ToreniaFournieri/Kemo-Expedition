#!/bin/bash
# deep.sh dest obj depth1 depth2 ...: for each depth set it, run one big full-comp GA pass of obj, print meters
cd "$(dirname "$0")"; source ./env.sh; D=$1; O=$2; shift 2
for d in "$@"; do
python3 - <<P
import t
c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':$D,'destinationMode':'fixed','depthLimit':'$d'},tag='dest'); print('DEPTH','$d',c)
P
./bga.sh $O 1 2>&1 | cut -c1-200
done
python3 bs.py 300 bossDamage
