#!/bin/bash
# usage: opt.sh tag F [iters] [deity]  -> exports save, runs gear climb on gate floor F, prints result. plan in plans/<tag>.json
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=$PWD
tag=$1; F=$2; IT=${3:-500}; DT=${4:-"God of Fortification"}
python3 -c "import t;t.export_save('$tag.kemoz')"
ORCA=5 DEITY="$DT" node q1.mjs $tag.kemoz ${D:-1} $( [ $F = 6 ] && echo beforeBoss || { [ $F = 7 ] && echo all || echo ${F}f-3; } ) 200 | head -1
F=$F ORCA=5 DEITY="$DT" node openopt3.mjs $tag.kemoz plans/$tag.json $IT 2>&1 | tail -n 2
