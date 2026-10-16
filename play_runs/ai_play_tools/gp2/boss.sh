#!/bin/bash
# boss.sh D [attackCycles=30] : boss4 prep, then an attack loop (no re-plans) when READY/MARGINAL
cd "$(dirname "$0")"; source "${GP2_ENV:?set GP2_ENV}"; D=$1; L=$BOKEMO_PLAY_DIR/logs; mkdir -p $L
python3 boss4.py 2>&1 | tee -a $L/boss$D.log | cut -c1-260
if tail -1 $L/boss$D.log | grep -qE "^(READY|MARGINAL)"; then REPLAN=0 STOPCLEAR=1 PT=1 K=1 python3 hl4.py ${2:-30} 6 0 2>&1 | tee -a $L/boss$D.log | tail -4 | cut -c1-250; fi
