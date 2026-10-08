import t,sys,json
# loop.py maxsteps sec  : step until PT1 gate list changes (first gate kind/floor) or becomes empty
n=int(sys.argv[1]); sec=int(sys.argv[2]); base=None
def gates():
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    p=j['data']['expeditionInfo']['parties'][0]
    return p,[(g['kind'],g.get('floor'),g['current'],g['required']) for g in p['clearGates']]
p,g=gates(); base=[x[:2] for x in g]; print('start',g,p['disclosedFloor'],p['currentHp'])
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    p,g=gates(); print(j['data']['inGameTime'][:16],p['disclosedFloor'],p['disclosedOutcome'],g,p['currentHp'])
    if [x[:2] for x in g]!=base: break
print('calls',t.calls())
