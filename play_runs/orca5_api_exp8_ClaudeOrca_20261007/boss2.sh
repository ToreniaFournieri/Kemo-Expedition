#!/bin/bash
# usage: boss2.sh D tag : boss.py scan -> apply best proxy plan -> 3-seed openopt4 -> apply best -> step 2h blocks until boss dead
cd "$(dirname "$0")"; export BOKEMO_PLAY_DIR=$PWD ORCA=5 DEITY="Goddess of Fertility"; D=$1; tag=$2
best=$(python3 boss.py $D $tag 40 | grep BEST | awk '{print $2}'); echo $best
python3 runplan2.py $best 0
python3 -c "import t;t.export_save('${tag}b.kemoz')"
for sd in 1 2 3; do (SEED=$sd$D D=$D node openopt4.mjs ${tag}b.kemoz plans/${tag}b_$sd.json 700 > r_${tag}b_$sd.txt 2>&1 &); done
sleep 20; while pgrep -f "openopt4.mjs ${tag}b" >/dev/null; do sleep 10; done
b=1; bs=-9; for sd in 1 2 3; do l=$(grep final r_${tag}b_$sd.txt); echo $l; v=$(echo "$l" | python3 -c "
import sys,re,json
s=sys.stdin.read(); m=re.search(r'\{.*\}',s); r=json.loads(m.group(0)) if m else {'kills':0,'reach':0}; print(r['kills']*r['reach']+0.001*r['reach'])"); if python3 -c "import sys;sys.exit(0 if $v>$bs else 1)"; then bs=$v; b=$sd; fi; done
python3 runplan2.py plans/${tag}b_$b.json 0
python3 untilboss.py $D 7200 40
