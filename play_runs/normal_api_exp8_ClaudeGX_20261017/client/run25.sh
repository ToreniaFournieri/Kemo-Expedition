#!/bin/bash
cd "$(dirname "$0")"
for D in "$@"; do ./chain.sh $D || break; grep -q "CHAIN_DONE $D" ../logs/chain.out || break; echo "$(date +%H:%M) D$D done calls $(source env.sh; python3 t.py N)" >> ../notes.md; done
