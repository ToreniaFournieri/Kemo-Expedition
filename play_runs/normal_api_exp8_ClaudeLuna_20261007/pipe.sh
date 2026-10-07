#!/bin/bash
# usage: pipe.sh tag dungeon gatef [elemweights] [attackerIds]  (save $tag.kemoz must exist; runs optimisers, evaluates)
S=/home/user/Kemo-Expedition/play_runs/normal_api_exp8_ClaudeLuna_20261007
T=/home/user/Kemo-Expedition/play_runs/ai_play_tools/twin
tag=$1; d=$2; f=$3; W=${4:-"fire:1,ice:1,thunder:1,none:1"}; AT=${5:-"4,2,3,5"}
cd $T
node pstats.mjs $S/$tag.kemoz | cut -c1-110
export SIDE=1
node proxyopt.mjs $S/$tag.kemoz $S/${tag}A.json "$AT" "$W" 2>&1 | grep -E "proxy|calls"
node hpopt.mjs $S/$tag.kemoz $S/${tag}H.json "1,6" | tail -2
python3 - <<P
import json
a=json.load(open('$S/${tag}H.json'))['calls']; b=json.load(open('$S/${tag}A.json'))['calls']
json.dump({'calls':a+b},open('$S/${tag}C.json','w'))
P
echo base; node dmgplan.mjs $S/$tag.kemoz $d 300 none 2>&1 | tail -2
for p in H A C; do echo plan $p; node dmgplan.mjs $S/$tag.kemoz $d 300 $S/${tag}$p.json 2>&1 | tail -2; done
