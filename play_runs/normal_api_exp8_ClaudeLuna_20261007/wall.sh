#!/bin/bash
# usage: wall.sh tag dungeon f "deity1;deity2" ; weights sets scanned; builds plan = HP + attackers per weight set
S=/home/user/Kemo-Expedition/play_runs/normal_api_exp8_ClaudeLuna_20261007; T=/home/user/Kemo-Expedition/play_runs/ai_play_tools/twin
tag=$1; d=$2; f=$3; DEITIES=${4:-"Goddess of Fertility;God of Fortification"}; AT=${5:-"4,2,3,5"}; N=${N:-300}
cd $T; export SIDE=1
node lv.mjs $S/$tag.kemoz
node hpopt.mjs $S/$tag.kemoz $S/${tag}H.json "1,6" | tail -1
i=0
for w in "fire:2,ice:.5,thunder:.5,none:1" "thunder:2,fire:.5,ice:.5,none:1" "ice:2,fire:.5,thunder:.5,none:1" "none:1,fire:.3,ice:.3,thunder:.3" "fire:1,ice:1,thunder:1,none:1"; do
  i=$((i+1)); node proxyopt.mjs $S/$tag.kemoz $S/${tag}_w$i.json "$AT" "$w" >/dev/null 2>&1
  python3 -c "
import json;a=json.load(open('$S/${tag}H.json'))['calls'];b=json.load(open('$S/${tag}_w$i.json'))['calls'];json.dump({'calls':a+b},open('$S/${tag}_c$i.json','w'));print('w$i',len(b),'+hp',len(a),'$w')"
  IFS=';' read -ra DS <<< "$DEITIES"
  for dd in "${DS[@]}"; do
    for pl in w c; do
      printf "  %s %s : " "$pl$i" "$dd"
      PLAN=$S/${tag}_$pl$i.json node lever.mjs $S/$tag.kemoz $d $f $N "x|$dd|" 2>&1 | tail -1
    done
  done
done
