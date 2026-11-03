#!/bin/bash
# full3.sh D [gateLoops] [attackLoops]: loop5 gates -> boss2.py (guarded, no GA) -> attack only when READY
cd "$(dirname "$0")"; source ./env.sh; D=$1
./loop5.sh $D ${2:-200}
if tail -3 ../logs/d$D.log | grep -q "BOSS OPEN"; then
  python3 boss2.py 2>&1 | tee ../logs/boss$D.log | cut -c1-260
  if tail -1 ../logs/boss$D.log | grep -q "^READY"; then PT=1 K=1 python3 hl2.py ${3:-30} 6 0 2>&1 | tail -6 | cut -c1-250; fi
fi
