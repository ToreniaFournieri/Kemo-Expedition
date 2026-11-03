#!/bin/bash
# replan6.sh tag d : export, tier count, boss/route sweep
cd "$(dirname "$0")"; tag=$1; d=$2
python3 -c "import t; print(t.export_save('$tag.kemoz'))"
node -e "
import('/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin/lib.mjs').then(({T})=>{const s=T.loadSave('$tag.kemoz'); const c={}; for(const v of Object.values(s.global.inventory)){ if(v.status!=='owned')continue; const t=Math.floor(v.item.id/1000); c[t]=(c[t]||0)+v.count;} const p=s.parties[0]; console.log(JSON.stringify(c),'lv',p.level, JSON.stringify(p.expeditionStats));})"
T=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin; BF=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeRenew_20261009/tools/bossfight.mjs; export SIDE=1
echo none $(node $T/lever.mjs $tag.kemoz $d 6 150 2>&1 | tail -1) $(node $BF $tag.kemoz $d 100|tail -1)
for W in ${WS:-fire:1.5,ice:1,thunder:0.3,none:1 fire:0.5,ice:2,thunder:0.2,none:1 fire:0.5,ice:0.5,thunder:2,none:1 fire:1,ice:1,thunder:1,none:1}; do n=v$(echo $W|tr -dc 0-9|cut -c1-6); node $T/proxyopt.mjs $tag.kemoz $tag$n.json "4,2,3,5" "$W" 2>&1 | grep -o "calls.*"; echo $tag$n $(PLAN=$tag$n.json node $T/lever.mjs $tag.kemoz $d 6 150 2>&1 | tail -1) $(node $BF $tag.kemoz $d 100 $tag$n.json|tail -1); done
