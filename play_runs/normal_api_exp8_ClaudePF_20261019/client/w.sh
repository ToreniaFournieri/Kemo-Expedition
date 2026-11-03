#!/bin/bash
# w.sh PATTERN [secs=570]: wait until chain.out matches PATTERN or secs pass; then print status
cd "$(dirname "$0")/.."; n=0; L=${2:-570}
while [ $n -lt $L ] && ! grep -qE "$1" logs/chain.out; do sleep 15; n=$((n+15)); done
date +%H:%M; tail -2 logs/chain.out; f=$(ls -t logs/d*.log logs/boss*.log logs/wall*.log 2>/dev/null | head -1); echo "[$f]"
grep -h " OBS\|GA[HX]\|SIDE\|SLOT\|APPLY\|try" $f | tail -${3:-8} | cut -c1-230; echo calls $(wc -l < batch_calls.jsonl)
