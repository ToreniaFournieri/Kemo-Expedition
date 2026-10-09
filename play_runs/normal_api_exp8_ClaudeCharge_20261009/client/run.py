import t,sys,json
# run.py S k n obsEvery [stopOnBossOpen=1]
# n x (elapsed S ; sortie k). compact read every obsEvery loops (and at the end).
# Stops when a sortie returns Clear (boss kill if boss gate was open) or when clearGate shows 'Entry gate' (boss gate open).
S=int(sys.argv[1]); k=int(sys.argv[2]); n=int(sys.argv[3]); ob=int(sys.argv[4]) if len(sys.argv)>4 else 2
stopOpen=(sys.argv[5]!='0') if len(sys.argv)>5 else True
def obs():
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    if c!=200: print('  OBS ERR',c,(j.get('error') or {}).get('code'),flush=True); return ''
    p=j['data']['expeditionInfo']['parties'][0]
    g=[(x['kind'],x.get('dungeonId'),x.get('floor'),x['current'],x['required']) for x in p['clearGates']]
    print('  OBS dest',p['destination'],'hp',p['currentHp'],'/',p['maximumHp'],'chg',p['chargeStock'],'|',g,'| last',p['disclosedOutcome'],flush=True)
    kinds=[x[0] for x in g]
    return 'Entry gate' if not any(k in ('eliteGate','bossGate') for k in kinds) else 'gates'
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':S},tag='el')
    igt=j['data']['inGameTime'][:16] if c==200 else j
    outs=[]
    if k>0:
        c2,j2=t.post('/commit/expedition/1/sortie',{'numberOfSortie':k},tag='sortie')
        if c2==200: outs=[s['battleOutcome'] for s in j2['data']['sorties']]; print(igt,'sortie',j2['data'].get('summary'),''.join(o[0] if o!='Retreat' else 'T' for o in outs),flush=True)
        else: print(igt,'sortie ERR',c2,(j2.get('error') or {}).get('details'),flush=True)
    else: print(igt,flush=True)
    if 'Clear' in outs: print('CLEAR seen'); obs(); break
    if (i+1)%ob==0 or i==n-1:
        g=obs()
        if stopOpen and 'Entry gate' in g: print('BOSS OPEN'); break
print('calls',t.calls())
