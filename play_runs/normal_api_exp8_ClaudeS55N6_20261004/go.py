import t,json,sys
def step(n,sec=43200):
    for i in range(n):
        c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
        if c!=200: print('ERR',c,json.dumps(j)[:300]); return
        ig=j['data']['inGameTime']
    print('igt',ig)
def o(parties=None):
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    for p in j['data']['expeditionInfo']['parties']:
        if parties and p['partyNumber'] not in parties: continue
        print(p['partyNumber'],p['disclosedFloor'],p['disclosedOutcome'],'dest',p['destination'],p['destinationMode'],p['depthLimit'],'chg',p['chargeStock'],[(g['kind'],g.get('dungeonId'),g.get('floor'),g['current'],g['required']) for g in p['clearGates']],p['currentHp'],p['maximumHp'])
    print('calls',t.calls())
if __name__=='__main__':
    n=int(sys.argv[1]) if len(sys.argv)>1 else 0
    if n: step(n)
    o([1] if len(sys.argv)<3 else None)
