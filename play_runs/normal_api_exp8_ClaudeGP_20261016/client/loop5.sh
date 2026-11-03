#!/bin/bash
# loop5.sh D loops : gate loop with AUTOGA = directedBuild free (high, unique+lineage) then tuning + big GA
cd "$(dirname "$0")"; source ./env.sh
export DIRS=${DIRS:-free} DEFF=${DEFF:-high} DCOMP=uniqueCharacter,raceGender,mainClass,subClass,lineage,predisposition DDEI=2 TB=${TB:-100} GATH=${GATH:-85} QR=100 TBB=180
AUTOGA=success:big NST=${NST:-6} PT=1 K=1 python3 hl2.py ${2:-200} 6 1 >> ../logs/d$1.log 2>&1
