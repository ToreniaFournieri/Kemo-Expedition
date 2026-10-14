#!/bin/bash
# farm2.sh dest loops stopLv tag: farm loop at the current depth (K=1), AUTOGA = directedBuild free + tuning + big GA every NST=6 obs; stops at STOPLV
cd "$(dirname "$0")"; source ./env.sh
export DIRS=${DIRS:-free} DEFF=high DCOMP=uniqueCharacter,raceGender,mainClass,subClass,lineage,predisposition DDEI=2 TB=100 GATH=${GATH:-85} QR=100 TBB=240
AUTOGA=success:big NST=${NST:-6} STOPLV=$3 STOPCLEAR=0 PT=1 K=1 python3 hl2.py $2 6 0 > ../logs/$4.log 2>&1
grep OBS ../logs/$4.log | tail -2 | cut -c1-200; tail -1 ../logs/$4.log
