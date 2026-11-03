#!/bin/bash
# boss.sh D [attackLoops=30] : boss4 prep then attack loop when READY/MARGINAL
cd "$(dirname "$0")"; source ./env.sh; D=$1; export DEST=$D
python3 boss4.py 2>&1 | tee ../logs/boss$D.log | cut -c1-300
if tail -1 ../logs/boss$D.log | grep -qE "^(READY|MARGINAL)"; then PT=1 K=1 python3 hl4.py ${2:-30} 6 0 2>&1 | tee -a ../logs/boss$D.log | tail -6 | cut -c1-250; fi
