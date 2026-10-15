#!/bin/bash
# boss.sh D [attackLoops=30] : boss3 prep then attack loop only when READY
cd "$(dirname "$0")"; source ./env.sh; D=$1
python3 boss3.py 2>&1 | tee ../logs/boss$D.log | cut -c1-260
if tail -1 ../logs/boss$D.log | grep -qE "^(READY|MARGINAL)"; then PT=1 K=1 python3 hl3.py ${2:-30} 6 0 2>&1 | tail -6 | cut -c1-250; fi
