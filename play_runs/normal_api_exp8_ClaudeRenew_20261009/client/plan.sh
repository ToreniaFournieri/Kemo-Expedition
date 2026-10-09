#!/bin/bash
# plan.sh tag d "f1,f2" [weights] [gens] : proxyopt A + hpopt H + C, lever eval per gate, GA(gate2) seeded from best -> tagG.json
cd "$(dirname "$0")"; T=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin; tag=$1; d=$2; FS=$3; W=${4:-"fire:1,ice:1,thunder:1,none:1"}; G=${5:-12}
export SIDE=1
node $T/proxyopt.mjs $tag.kemoz ${tag}A.json "4,2,3,5" "$W" 2>&1 | grep calls
node $T/hpopt.mjs $tag.kemoz ${tag}H.json "1,6" | tail -1
python3 -c "
import json;a=json.load(open('${tag}H.json'))['calls'];b=json.load(open('${tag}A.json'))['calls'];json.dump({'calls':a+b},open('${tag}C.json','w'))"
for f in ${FS//,/ }; do for pl in none A C; do PL=${tag}$pl.json; [ $pl = none ] && PL=""; echo "f$f $pl $(PLAN=$PL node $T/lever.mjs $tag.kemoz $d $f 150 2>&1 | tail -1)"; done; done
ALGO=ga OBJ=gate2 FS=$FS LAMBDA=${LAMBDA:-0.003} NQ=80 NC=200 node $T/wallopt3.mjs $tag.kemoz $d ${FS%%,*} 1 $G ${tag}G.json ${SEED:-${tag}C.json} 2>&1 | tail -1
for f in ${FS//,/ }; do echo "f$f G $(PLAN=${tag}G.json node $T/lever.mjs $tag.kemoz $d $f 150 2>&1 | tail -1)"; done
