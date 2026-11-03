#!/bin/bash
# usage: pipe.sh tag dungeon gatef [weights]   (export must already exist as $tag.kemoz)
cd /home/user/Kemo-Expedition/play_runs/orca5_api_exp8_ClaudeOrca_20261007
T=../ai_play_tools/twin; tag=$1; d=$2; f=$3; W=${4:-"fire:1,ice:1,thunder:1,none:1"}; N=${5:-250}
export SIDE=1
node $T/pstats.mjs $tag.kemoz | cut -c1-100
node $T/proxyopt.mjs $tag.kemoz ${tag}A.json "4,2,3,5" "$W" 2>&1 | grep -E "calls"
node $T/hpopt.mjs $tag.kemoz ${tag}H.json "1,6" | tail -1
python3 - <<P
import json
a=json.load(open('${tag}H.json'))['calls']; b=json.load(open('${tag}A.json'))['calls']
json.dump({'calls':a+b},open('${tag}C.json','w')); print('H',len(a),'A',len(b))
P
for p in none A H C; do echo plan $p; if [ $p = none ]; then PL=""; else PL=${tag}$p.json; fi
 PLAN=$PL node $T/lever.mjs $tag.kemoz $d $f $N "fort|God of Fortification|" "fert|Goddess of Fertility|" "rest|Goddess of Restoration|" "prec|Goddess of Precision|" 2>&1 | tail -5; done
