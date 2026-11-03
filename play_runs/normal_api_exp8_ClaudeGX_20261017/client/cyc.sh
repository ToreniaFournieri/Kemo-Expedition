#!/bin/bash
# cyc.sh obj passes loops tag : big GA passes then sortie loop
cd "$(dirname "$0")"; source ./env.sh
./bga.sh $1 $2 2>&1 | cut -c1-200
unset GAX; PT=1 K=3 HPF=0.97 HPF2=0.95 python3 hl2.py $3 6 > ../logs/$4.log 2>&1
grep OBS ../logs/$4.log | tail -2 | cut -c1-150; tail -2 ../logs/$4.log; date
echo CYCDONE
