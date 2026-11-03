#!/bin/bash
# usage: wall.sh tag D F [weights] [deity]  -> export, proxyopt+hpopt plan (plans/<tag>C.json), prints gate rating for none / C
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=$PWD ORCA=5; T=../ai_play_tools/twin
tag=$1; D=$2; F=$3; W=${4:-"fire:1,ice:1,thunder:1,none:1"}; DT=${5:-"God of Fortification"}; export DEITY="$DT"
python3 -c "import t;t.export_save('$tag.kemoz')"
node $T/proxyopt.mjs $tag.kemoz plans/${tag}A.json "4,2,3,5" "$W" 2>&1 | grep calls
node $T/hpopt.mjs $tag.kemoz plans/${tag}H.json "1,6" | tail -n 1 | cut -c1-80
python3 - <<P
import json
a=json.load(open('plans/${tag}H.json'))['calls']; b=json.load(open('plans/${tag}A.json'))['calls']
json.dump({'calls':a+b},open('plans/${tag}C.json','w')); print('H',len(a),'A',len(b))
P
for p in none C; do if [ $p = none ]; then PL=""; else PL=plans/${tag}C.json; fi; echo plan $p; PLAN=$PL node $T/lever.mjs $tag.kemoz $D $F ${N:-250} "fort|God of Fortification|" 2>&1 | tail -n 1 | cut -c1-120; done
