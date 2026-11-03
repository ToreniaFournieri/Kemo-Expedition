#!/bin/bash
cd "$(dirname "$0")"
until grep -q "CHAIN_DONE 7\|CHAIN_STOP" ../logs/chain.out; do sleep 20; done
grep -q "CHAIN_STOP" ../logs/chain.out && exit 1
while pgrep -f "run25.sh 7" >/dev/null; do sleep 5; done
./run25.sh 8
