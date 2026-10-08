import t,subprocess,sys,json,time
D=int(sys.argv[1]); maxblocks=int(sys.argv[2]) if len(sys.argv)>2 else 60
def gates():
    c,k=t.gg('/read/observation/expedition'); pp=k['data']['expeditionInfo']['parties'][0]
    c2,j=t.gg('/read/observation/party'); p=j['data']['partyInfo']['party']
    return pp,p
def stage(pp):
    g=pp['clearGates']
    for x in g:
        if x['kind']=='eliteGate': return x['floor']
    for x in g:
        if x['kind']=='bossGate': return 6
    if any(x['kind']=='entryGate' for x in g) or any(x['kind']=='godEntry' for x in g): return 7
    return 8  # defeated/none
def sh(F,tag,it):
    r=subprocess.run(['./wall2.sh',str(D),str(F),tag],capture_output=True,text=True); print(r.stdout.strip().splitlines()[-6:],flush=True)
if D>1 and len(sys.argv)>3: print(t.post('/commit/expedition/1/changeExpedition',{'destination':D,'destinationMode':'fixed','depthLimit':'1f-3','difficultyOffset':0})[0])
pp,p=gates(); last=None; tries=0; blocks=0
while blocks<maxblocks:
    pp,p=gates(); F=stage(pp)
    if F==8: print('DONE D',D); break
    key=(F,[ (x['kind'],x['current']) for x in pp['clearGates']][0])
    if F==7:
        subprocess.run(['./boss2.sh',str(D),f's_d{D}_boss'],stdout=open(f'boss2_d{D}.log','a'),stderr=subprocess.STDOUT); print('BOSS PHASE END',flush=True); continue
    if last is None or last[0]!=F or tries>=5:
        tag=f's_d{D}_f{F}_{blocks}'; sh(F,tag,700 if F<7 else 1200); tries=0
    last=(F,)
    sec=10800 if F==7 else 43200
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el'); blocks+=1; tries+=1
    pp,p=gates(); print(j['data']['inGameTime'][:16],'Lv',p['level'],p['experience'],'F',F,pp['disclosedOutcome'],[(g['kind'],g['floor'] if 'floor' in g else None,g['current'],g['required']) for g in pp['clearGates']],'calls',t.calls(),flush=True)
