import t,sys,json
# loop2.py dest maxsteps sec : auto depthLimit per gate; stops on boss-open/entry gate (needs plan) or when a stage cleared
dest=int(sys.argv[1]); n=int(sys.argv[2]); sec=int(sys.argv[3]); stopon=sys.argv[4] if len(sys.argv)>4 else 'boss'
def gates():
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    p=j['data']['expeditionInfo']['parties'][0]
    return p,[(g['kind'],g.get('floor'),g['current'],g['required']) for g in p['clearGates']]
def want(g):
    if g and g[0][0]=='eliteGate': return f"{g[0][1]}f-3"
    if g and g[0][0]=='bossGate': return 'beforeBoss'
    return 'all'
p,g=gates(); cur=p['depthLimit']
def setl(w):
    global cur
    if w!=cur:
        c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':dest,'destinationMode':'fixed','depthLimit':w,'difficultyOffset':0},tag='depth'); print('depth',w,c); cur=w
setl(want(g)); print('start',g,p['disclosedFloor'],p['currentHp'])
same=0;prev=None
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    p,g=gates(); print(j['data']['inGameTime'][:16],p['disclosedFloor'],p['disclosedOutcome'],g,p['currentHp'])
    w=want(g)
    same=same+1 if g==prev else 0; prev=g
    if same>=2 and w!='all': print('STALL'); break
    if w=='all' or (stopon=='boss' and w=='beforeBoss'): setl(w); break
    setl(w)
print('calls',t.calls())
