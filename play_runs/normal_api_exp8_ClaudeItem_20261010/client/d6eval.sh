#!/bin/bash
# d6eval.sh tag : export, tiers, attacker plan + 3 illusion breakers, boss-only dmg, full route (f6 gate, f7 clear)
cd "$(dirname "$0")"; tag=$1; T=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin; IS=/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeItem_20261010/tools/itemswap.mjs; export SIDE=1
python3 -c "import t; print(t.export_save('$tag.kemoz'))"; ./tiers.sh $tag.kemoz
node $T/proxyopt.mjs $tag.kemoz ${tag}A.json "4,2,3,5" "${W:-fire:2,ice:1,thunder:0.3,none:1}" 2>&1 | grep -o "calls.*"
node $IS $tag.kemoz 6 60 ${tag}A.json 6309-0-0 "4" ${tag}I1.json 2>&1 | tail -1
node $IS $tag.kemoz 6 60 ${tag}I1.json 6309-0-0 "3" ${tag}I2.json 2>&1 | tail -1
node $IS $tag.kemoz 6 60 ${tag}I2.json 6309-0-0 "2" ${tag}I3.json 2>&1 | tail -1
echo I3 $(node $T/dmgplan.mjs $tag.kemoz 6 150 ${tag}I3.json 2>&1 | tail -1)
for f in 6 7; do echo f$f $(PLAN=${tag}I3.json node $T/lever.mjs $tag.kemoz 6 $f 300 2>&1 | tail -1); done
