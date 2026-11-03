#!/bin/bash
# boss.sh : bossDamage tuning-first (+ big bossDamage GA when boss kill < GATH), then big success GA for the route, meters
cd "$(dirname "$0")"; source ./env.sh
GATH=${GATH:-85} python3 tw.py bossDamage big 2>&1 | grep -E "^TUNE|^TW|^GA|after  Succ|APPLY|abilit|Element|final" | cut -c1-240
python3 bs.py 300 bossDamage
[ "${ROUTE:-1}" = 1 ] && FORCEGA=1 python3 tw.py success big - 2>&1 | grep -E "^GA|after|APPLY" | cut -c1-240
python3 bs.py 300 bossDamage; python3 bs.py 300 success
