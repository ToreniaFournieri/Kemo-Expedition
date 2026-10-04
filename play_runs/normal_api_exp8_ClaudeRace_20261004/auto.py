# step k times (12h each), observe PT1 after every `every` steps; advance destination when the next entry gate is gone.
import t,json,sys
k=int(sys.argv[1]); every=int(sys.argv[2]) if len(sys.argv)>2 else 1; maxdest=8
def obs():
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    return [p for p in j['data']['expeditionInfo']['parties']]
for i in range(k):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':43200},tag='el')
    if c!=200: print('ERR',c,json.dumps(j)[:300]); break
    ig=j['data']['inGameTime']
    if (i+1)%every and i!=k-1: continue
    ps=obs(); p=ps[0]; g=[(x['kind'],x.get('dungeonId'),x.get('floor'),x['current'],x['required']) for x in p['clearGates']]
    print(ig,'dest',p['destination'],p['disclosedOutcome'],g,p['currentHp'],p['maximumHp'],'| others',[(q['partyNumber'],q['destination'],q['disclosedOutcome']) for q in ps[1:]])
    d=p['destination']
    if d<maxdest and all(x[0]=='godGate' for x in g):
        c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':d+1,'depthLimit':'all'},tag='dest'); print('ADVANCE ->',d+1,c,(j.get('error') or {}).get('code'))
        if len(sys.argv)>3: break
print('calls',t.calls())
