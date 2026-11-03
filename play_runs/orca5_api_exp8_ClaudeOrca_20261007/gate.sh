#!/bin/bash
# usage: gate.sh D F tag [iters] : set depth for gate floor F (F=6 beforeBoss, 7 all), export, 3-seed climb in parallel, apply best, report
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=$PWD ORCA=5; D=$1; F=$2; tag=$3; IT=${4:-1000}; DT=${DEITY:-"Goddess of Fertility"}
if [ $F = 6 ]; then DL=beforeBoss; elif [ $F = 7 ]; then DL=all; else DL=${F}f-3; fi
python3 -c "import t;print(t.post('/commit/expedition/1/changeExpedition',{'depthLimit':'$DL'})[0]);t.export_save('$tag.kemoz')"
export DEITY="$DT"
for sd in 1 2 3; do (SEED=$sd$F WP=4 NQ=80 NC=250 D=$D F=$F node openopt3.mjs $tag.kemoz plans/${tag}_$sd.json $IT > r_${tag}_$sd.txt 2>&1 &); done
sleep 20; while pgrep -f "openopt3.mjs $tag.kemoz" >/dev/null; do sleep 10; done
best=""; bs=-999; for sd in 1 2 3; do s=$(grep -o '"succ":[0-9.e-]*' r_${tag}_$sd.txt | tail -n 1 | cut -d: -f2); p=$(grep -o '"progress":[0-9.]*' r_${tag}_$sd.txt | tail -n 1 | cut -d: -f2); echo "seed $sd succ $s prog $p"; v=$(python3 -c "print($s+0.01*$p)"); if python3 -c "import sys;sys.exit(0 if $v>$bs else 1)"; then bs=$v; best=$sd; fi; done
echo best $best; python3 runplan2.py plans/${tag}_$best.json 0
