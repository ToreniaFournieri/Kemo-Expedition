#!/bin/bash
# usage: nxt.sh D F tag [iters] [deity]: set depth for gate floor F, optimize gear, apply plan, farm 1 block
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=$PWD; D=$1; F=$2; tag=$3
if [ $F = 6 ]; then DL=beforeBoss; elif [ $F = 7 ]; then DL=all; else DL=${F}f-3; fi
python3 -c "import t;print(t.post('/commit/expedition/1/changeExpedition',{'depthLimit':'$DL'})[0])"
D=$D ./opt.sh $tag $F ${4:-500} "${5:-God of Fortification}"
python3 runplan2.py plans/$tag.json 0
