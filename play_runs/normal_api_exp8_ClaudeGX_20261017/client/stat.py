import json,datetime,os
# stat.py : calls, in-game days since signup (first igt), current gate line
W=os.environ.get('BOKEMO_PLAY_DIR','.')
L=[json.loads(l) for l in open(W+'/batch_calls.jsonl')]
ig=[l['igt'] for l in L if l.get('igt')]
f=lambda s: datetime.datetime.fromisoformat(s.replace('Z','+00:00')[:19])
print('calls',len(L),'igt',ig[-1],'days %.2f'%((f(ig[-1])-f('2026-10-17T00:36:42')).total_seconds()/86400))
