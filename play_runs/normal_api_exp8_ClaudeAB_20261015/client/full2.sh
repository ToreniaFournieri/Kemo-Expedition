#!/bin/bash
# full2.sh D [gateLoops] [attackLoops]: loop5 gates -> boss.sh -> route-first recovery if the route is 0 % -> attack loop
cd "$(dirname "$0")"; source ./env.sh; D=$1
./loop5.sh $D ${2:-200}
if tail -3 ../logs/d$D.log | grep -q "BOSS OPEN"; then
  ./boss.sh > ../logs/boss$D.log 2>&1; grep -E "^bossDamage|^success|DIRAPPLY|GA verdict|accepted=True" ../logs/boss$D.log | cut -c1-200
  export DIRS=free DEFF=high DCOMP=uniqueCharacter,raceGender,mainClass,subClass,lineage,predisposition DDEI=2 TB=100 GATH=85 QR=100 TBB=240
  for i in 1 2; do
    R=$(python3 bs.py 300 success | tee /dev/stderr | python3 -c "import sys,re; m=re.search(r'rate ([0-9.]+)',sys.stdin.read()); print(float(m.group(1)) if m else 0)")
    python3 - <<P
import sys; sys.exit(0 if $R>=0.05 else 1)
P
    [ $? = 0 ] && break
    echo "route $R < 5 %: route-first re-plan"; python3 rp.py success free 2>&1 | grep -E "DIR|TW|GA |after|APPLY" | cut -c1-250
  done
  python3 bs.py 300 bossDamage
  PT=1 K=1 python3 hl2.py ${3:-30} 6 0 2>&1 | tail -8
fi
