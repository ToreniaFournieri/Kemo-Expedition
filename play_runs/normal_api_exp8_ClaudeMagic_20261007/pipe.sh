#!/bin/bash
# usage: pipe.sh tag dungeon gatef [weights] [attackers] [hpchars]
S=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeMagic_20261007
export BOKEMO_PLAY_DIR=$S BOKEMO_PLAY_USER=ClaudeMagic
T=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin
tag=$1; d=$2; f=$3; W=${4:-"fire:1,ice:1,thunder:1,none:1"}; A=${5:-"4,2,3,5,6"}; H=${6:-"1"}
cd $S; python3 -c "import t;print(t.export_save('$S/$tag.kemoz'))"
cd $T
node pstats.mjs $S/$tag.kemoz | cut -c1-110
export SIDE=1
node proxyopt.mjs $S/$tag.kemoz $S/${tag}A.json "$A" "$W" 2>&1 | grep -E "proxy|calls"
node hpopt.mjs $S/$tag.kemoz $S/${tag}H.json "$H" | tail -2
python3 - <<P
import json
a=json.load(open('$S/${tag}H.json'))['calls']; b=json.load(open('$S/${tag}A.json'))['calls']
json.dump({'calls':a+b},open('$S/${tag}C.json','w'))
P
for p in H A C; do echo plan $p; PLAN=$S/${tag}$p.json node lever.mjs $S/$tag.kemoz $d $f 250 "base||" 2>&1 | tail -2; done
