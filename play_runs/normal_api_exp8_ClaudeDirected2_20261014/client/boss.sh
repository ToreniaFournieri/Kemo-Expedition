#!/bin/bash
# boss.sh : directedBuild(bossDamage) + bossDamage tuning-first (+ big GA when boss kill < GATH); then a big success GA ONLY when the route is > 0 %
# (a progress-scored success GA at route 0 % reverts the boss build: Tune5 trap, repeated at D6 here), meters
cd "$(dirname "$0")"; source ./env.sh
python3 bs.py 300 bossDamage
GATH=${GATH:-85} python3 rp.py bossDamage ${DIRS:-rapidRanged} 2>&1 | grep -E "DIR|composition|TUNE|TW|GA |after  Succ|APPLY|abilit|Element|final" | cut -c1-260
python3 bs.py 300 bossDamage
R=$(python3 bs.py 300 success | tee /dev/stderr | python3 -c "import sys,re; m=re.search(r'rate ([0-9.]+)',sys.stdin.read()); print(1 if m and float(m.group(1))>0 else 0)")
if [ "${ROUTE:-1}" = 1 ] && [ "$R" = 1 ]; then FORCEGA=1 python3 tw.py success big - 2>&1 | grep -E "^GA|after|APPLY" | cut -c1-240; python3 bs.py 300 bossDamage; python3 bs.py 300 success; else echo "route 0 %: success GA skipped"; fi
