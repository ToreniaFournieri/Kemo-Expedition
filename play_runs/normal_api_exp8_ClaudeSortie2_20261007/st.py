import t,json,sys
def step(sec=43200,obs=True):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    print(c, j['data'] if c==200 else j)
    if obs: o()
def o():
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    for p in j['data']['expeditionInfo']['parties']:
        print(p['partyNumber'],p['disclosedFloor'],p['disclosedOutcome'],'dest',p['destination'],p['destinationMode'],p['depthLimit'],'chg',p['chargeStock'],[(g['kind'],g.get('dungeonId'),g.get('floor'),g['current'],g['required']) for g in p['clearGates']],p['currentHp'],p['maximumHp'])
    print('calls',t.calls())
if __name__=='__main__':
    step(int(sys.argv[1]) if len(sys.argv)>1 else 43200)
