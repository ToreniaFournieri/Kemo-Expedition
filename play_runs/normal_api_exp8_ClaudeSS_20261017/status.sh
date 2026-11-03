#!/bin/bash
# status: calls, in-game days since start, last log lines
cd "$(dirname "$0")"
python3 - <<'P'
import json,datetime
f=[json.loads(l) for l in open('batch_calls.jsonl')]
ig=[r['igt'] for r in f if r.get('igt')]
t0=datetime.datetime.fromisoformat(ig[0][:19]); t1=datetime.datetime.fromisoformat(ig[-1][:19])
print('calls',f[-1]['n'],'igt',ig[-1][:16],'days %.2f'%((t1-t0).total_seconds()/86400),'errors',sum(1 for r in f if r['status']!=200))
P
tail -2 notes.md; cat logs/chain.out 2>/dev/null | grep CHAIN | tail -2
