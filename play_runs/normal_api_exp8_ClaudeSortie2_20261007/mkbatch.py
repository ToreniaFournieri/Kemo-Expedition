"""Convert batch_calls.jsonl (every API call: input + duration) to the repo batch-process file."""
import json,sys,collections
src='batch_calls.jsonl'; rows=[json.loads(l) for l in open(src)]
by=collections.defaultdict(lambda:{'count':0,'ms_total':0,'ms_max':0,'errors':0})
for r in rows:
    k=r['method']+' '+('/'.join(r['path'].split('/')[:4]) if '/character/' not in r['path'] else '/'.join(r['path'].split('/')[:3])+'/character/{id}/'+r['path'].split('/')[-1])
    b=by[k]; b['count']+=1; b['ms_total']+=r['ms']; b['ms_max']=max(b['ms_max'],r['ms']); b['errors']+= 1 if r['status']>=400 else 0
summary=[dict(endpoint=k,count=v['count'],ms_total=v['ms_total'],ms_mean=round(v['ms_total']/v['count'],1),ms_max=v['ms_max'],errors=v['errors']) for k,v in sorted(by.items(),key=lambda x:-x[1]['ms_total'])]
out={'format':'bokemo-api-batch-v1','note':'Each call: method, path (relative to /api/v1), parameters (the commit envelope adds expectedRevision + idempotencyKey), status, duration ms measured by the client (urllib, loopback), in-game time after the call when returned. Replay with replay_batch.py against a fresh account; outcomes (drops, win/lose) depend on the random state so only the call sequence and cost are comparable.',
     'calls':rows,'summary':summary,'total_calls':len(rows),'total_ms':sum(r['ms'] for r in rows)}
json.dump(out,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(rows),'calls',out['total_ms'],'ms')
for s in summary[:12]: print(s)
