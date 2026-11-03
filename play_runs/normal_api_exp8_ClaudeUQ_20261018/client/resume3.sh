#!/bin/bash
cd "$(dirname "$0")"; source ./env.sh; D=3
./boss7x.sh 3 || exit 1
python3 release.py >> ../logs/release.log 2>&1; tail -1 ../logs/release.log >> ../logs/chain.out
echo "$(date +%H:%M) D3 done calls $(python3 t.py N)" >> ../notes.md
./run25.sh 4 5 6 7
