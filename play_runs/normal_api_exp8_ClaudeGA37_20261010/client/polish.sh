#!/bin/bash
# polish.sh [boss]: full-component passes (equipment+jewels+build): bossDamage (boss) x2 -> success x1 (x2 with P2=1)
cd "$(dirname "$0")"; source ./env.sh; export COMP=${COMP:-equipment,jewels,mainClass,subClass,lineage,predisposition,raceGender}
[ "$1" = boss ] && python3 ga.py bossDamage high | head -3 && python3 ga.py bossDamage high | head -1
python3 ga.py success high | head -3
[ -n "$P2" ] && python3 ga.py success high | head -1
