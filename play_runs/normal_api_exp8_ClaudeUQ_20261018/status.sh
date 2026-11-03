#!/bin/bash
cd "$(dirname "$0")"; D=$(ls -t logs/d?.log | head -1)
echo "== $D"; grep -E "OBS" $D | tail -1 | cut -c1-220; grep -E "REPLAN \(|GA[HX]|REPLAN E|SLOT" $D | tail -4 | sed -E 's/ evals [0-9]+//; s/ pts .* cross/ cross/' | cut -c1-330
tail -2 logs/chain.out; python3 -c "
import json,datetime
L=[json.loads(l) for l in open('batch_calls.jsonl')]
ig=[r['igt'] for r in L if r['igt']]; t0=datetime.datetime.fromisoformat('2026-10-18T06:27:17+00:00'); t=datetime.datetime.fromisoformat(ig[-1].replace('Z','+00:00')); print('igt',ig[-1], round((t-t0).total_seconds()/86400,2),'d calls', len(L))"
