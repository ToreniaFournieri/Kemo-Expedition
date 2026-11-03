#!/bin/bash
# bga.sh objective [passes=2]: big full-component GA passes then success meter
cd "$(dirname "$0")"; source ./env.sh
export COMP=equipment,jewels,mainClass,subClass,lineage,predisposition,raceGender GAX='{"populationSize":64,"generations":200,"quickRuns":300,"confirmRuns":1000,"timeBudgetSeconds":300}'
for i in $(seq 1 ${2:-2}); do python3 ga.py $1 high apply 2>&1 | grep -E "^verdict|after|ERR" | cut -c1-230; done
unset GAX COMP; python3 bs.py 300 $1; [ "$1" != success ] && python3 bs.py 300 success
