#!/bin/bash
# usage: pipe.sh tag dungeon gatef   (exports save, runs optimisers, evaluates)
S=/private/tmp/claude-501/-Users-Torenia-Documents-ChatGPT-BoKemo/62fd7c8e-e861-4f59-9402-b1242a95aebe/scratchpad
T=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin
tag=$1; d=$2; f=$3; W=${4:-"fire:1,ice:1,thunder:1,none:1"}
$S/g.sh -c "import t;print(t.export_save('$S/$tag.kemoz'))"
cd $T
node pstats.mjs $S/$tag.kemoz | cut -c1-95
export SIDE=1
node proxyopt.mjs $S/$tag.kemoz $S/${tag}A.json "4,2,3,5" "$W" 2>&1 | grep -E "proxy|calls"
node hpopt.mjs $S/$tag.kemoz $S/${tag}H.json "1,6" | tail -2
python3 - <<P
import json
a=json.load(open('$S/${tag}H.json'))['calls']; b=json.load(open('$S/${tag}A.json'))['calls']
json.dump({'calls':a+b},open('$S/${tag}C.json','w'))
P
echo base; node lever.mjs $S/$tag.kemoz $d $f 250 "fort|God of Fortification|" "rest|Goddess of Restoration|" "fert|Goddess of Fertility|" 2>&1 | tail -4
for p in H A C; do echo plan $p; PLAN=$S/${tag}$p.json node lever.mjs $S/$tag.kemoz $d $f 250 "fort|God of Fortification|" "rest|Goddess of Restoration|" "fert|Goddess of Fertility|" 2>&1 | tail -4; done
