#!/bin/bash
# boss.sh tag d "weights"  : export (if no file), dmgplan none / A / C(hp+A)
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=$PWD/.. SIDE=1; T=../../ai_play_tools/twin; tag=$1; d=$2; W=${3:-"none:2,fire:1,ice:1,thunder:1"}
[ -f $tag.kemoz ] || python3 -c "import t;print(t.export_save('$tag.kemoz'))"
echo none $(node $T/dmgplan.mjs $tag.kemoz $d 100 none 2>&1 | tail -1)
node $T/proxyopt.mjs $tag.kemoz ${tag}A.json "4,2,3,5" "$W" 2>&1 | grep -o "calls.*"
node $T/hpopt.mjs $tag.kemoz ${tag}H.json "1,6" ${tag}A.json | tail -1 | cut -c1-40
echo A $(node $T/dmgplan.mjs $tag.kemoz $d 100 ${tag}A.json 2>&1 | tail -1)
echo H $(node $T/dmgplan.mjs $tag.kemoz $d 100 ${tag}H.json 2>&1 | tail -1)
