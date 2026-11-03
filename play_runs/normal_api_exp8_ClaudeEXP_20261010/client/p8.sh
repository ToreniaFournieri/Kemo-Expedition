#!/bin/bash
# p8.sh tag f : export, HP(0.2)+thunder3 plan, none/H/attackers eval at gate f (+f+1), GA seeded
cd "$(dirname "$0")"; tag=$1; f=$2; d=${D:-8}; T=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin; export SIDE=1
python3 -c "import t; print(t.export_save('$tag.kemoz'))"; tail -3 batch_calls.jsonl | grep -o '"igt": "[^"]*"' | tail -1
node -e "
import('$T/lib.mjs').then(({T})=>{const s=T.loadSave('$tag.kemoz'); const c={}; for(const v of Object.values(s.global.inventory)){ if(v.status!=='owned')continue; const t=Math.floor(v.item.id/1000); c[t]=(c[t]||0)+v.count;} const p=s.parties[0]; console.log(JSON.stringify(c),'lv',p.level);})"
echo none $(node $T/lever.mjs $tag.kemoz $d $f 200 2>&1 | tail -1)
node $T/hpopt.mjs $tag.kemoz ${tag}H.json "1,6" none 0.2 | tail -1 | cut -c1-30
W=${W:-fire:0.5,ice:0.5,thunder:3,none:1}
node $T/proxyopt.mjs $tag.kemoz ${tag}A.json "4,2,3,5" "$W" 2>&1 | grep -o "calls.*"
node $T/proxyopt.mjs $tag.kemoz ${tag}HA.json "4,2,3,5" "$W" ${tag}H.json 2>&1 | grep -o "calls.*"
for p in H A HA; do echo $p $(PLAN=${tag}$p.json node $T/lever.mjs $tag.kemoz $d $f 200 2>&1 | tail -1); done
ALGO=ga OBJ=gate2 FS=$f,$((f+1)) LAMBDA=0.001 NQ=100 NC=250 node $T/wallopt3.mjs $tag.kemoz $d $f 7 ${G:-15} ${tag}G.json ${tag}HA.json 2>&1 | tail -1
for ff in $f $((f+1)); do echo G f$ff $(PLAN=${tag}G.json node $T/lever.mjs $tag.kemoz $d $ff 200 2>&1 | tail -1); done
