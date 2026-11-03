import t,sys,json
# usage: auto.py <dungeon> <maxSteps> <seconds>  : step until PT1 gates have no godEntry for dungeon (boss defeated)
d=int(sys.argv[1]); n=int(sys.argv[2]); sec=int(sys.argv[3])
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    if c!=200: print('ERR',c,j); break
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    ps=j['data']['expeditionInfo']['parties']; p=ps[0]
    g=[(x['kind'],x.get('dungeonId'),x.get('floor'),x['current'],x['required']) for x in p['clearGates']]
    print(i,'t',t.st().get('n'),p['disclosedFloor'],p['disclosedOutcome'],g,p['maximumHp'],[ (q['partyNumber'],q['disclosedOutcome'],[(x['kind'],x.get('dungeonId')) for x in q['clearGates']]) for q in ps[1:]])
    if all(x[0]=='godGate' for x in g): print('BOSS DEFEATED?'); break
