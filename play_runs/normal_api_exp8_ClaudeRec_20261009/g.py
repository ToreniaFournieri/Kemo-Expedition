import t,sys
sec=int(sys.argv[1]) if len(sys.argv)>1 else 0
if sec: print(t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')[1]['data']['inGameTime'][:16])
c,j=t.gg('/read/observation/expedition',tag='obs-exp')
p=j['data']['expeditionInfo']['parties'][0]
print(p['disclosedOutcome'],p['disclosedFloor'],p['destination'],p['depthLimit'],[(g['kind'],g.get('dungeonId'),g['current'],g['required']) for g in p['clearGates']],p['currentHp'],'calls',t.calls())
