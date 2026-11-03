#!/bin/bash
cd "$(dirname "$0")"; source ./env.sh; ./boss7x.sh 6 || exit 1; python3 release.py >> ../logs/release.log 2>&1; tail -1 ../logs/release.log >> ../logs/chain.out
echo "$(date +%H:%M) D6 done calls $(source env.sh; python3 t.py N)" >> ../notes.md; ./run25.sh 7 8
