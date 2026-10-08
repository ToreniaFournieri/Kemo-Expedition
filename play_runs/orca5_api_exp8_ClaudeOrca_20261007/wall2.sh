#!/bin/bash
# usage: wall2.sh D F tag : depth for gate F, export, hpopt+proxyopt (4 weight sets) candidates, rate each with lever, apply best (if beats current)
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=$PWD ORCA=5 SIDE=1 DEITY="Goddess of Fertility"; T=../ai_play_tools/twin; D=$1; F=$2; tag=$3
if [ $F = 6 ]; then DL=beforeBoss; else DL=${F}f-3; fi
python3 -c "import t;print(t.post('/commit/expedition/1/changeExpedition',{'depthLimit':'$DL'})[0]);t.export_save('$tag.kemoz')"
node $T/hpopt.mjs $tag.kemoz plans/${tag}h.json "1,6" >/dev/null 2>&1
W=("fire:1,ice:1,thunder:1,none:1" "fire:2,ice:1,thunder:1,none:1" "fire:1,ice:2,thunder:1,none:1" "fire:1,ice:1,thunder:2,none:1")
for i in 0 1 2 3; do ( node $T/proxyopt.mjs $tag.kemoz plans/${tag}a$i.json 4,2,3,5 "${W[$i]}" >/dev/null 2>&1
 python3 -c "
import json
a=json.load(open('plans/${tag}a$i.json'))['calls'];h=json.load(open('plans/${tag}h.json'))['calls']
json.dump({'calls':h+a},open('plans/${tag}c$i.json','w'))"
 for p in a$i c$i; do echo "$p $(PLAN=plans/$tag$p.json node $T/lever.mjs $tag.kemoz $D $F 200 'f||' 2>&1 | tail -n 1 | grep -o '"succ":[0-9.e-]*' | cut -d: -f2)" > plans/${tag}_$p.score; done ) & done; wait
echo "none $(PLAN= node $T/lever.mjs $tag.kemoz $D $F 200 'f||' 2>&1 | tail -n 1 | grep -o '"succ":[0-9.e-]*' | cut -d: -f2)" > plans/${tag}_none.score
cat plans/${tag}_*.score | sort -k2 -n -r | head -n 3
best=$(cat plans/${tag}_*.score | sort -k2 -n -r | head -n1 | awk '{print $1}')
if [ "$best" != none ]; then python3 runplan2.py plans/$tag$best.json 0; fi
