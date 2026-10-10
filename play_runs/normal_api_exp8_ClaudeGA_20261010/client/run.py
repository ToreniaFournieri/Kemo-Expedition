import t,sys,json,os
# run.py S k n obsEvery [stopOnBossOpen=1]
# n x (elapsed S ; sortie k).  Build 31: the elapsed response carries parties[].controls.sortie, so the sortie call is
# skipped when it would be refused (party_exhausted after a Defeat, no charge). Observation every obsEvery loops.
# Stops on a sortie Clear, when the boss gate opens (no elite/boss gate left), or (STALL=1) on two identical observations.
S=int(sys.argv[1]); k=int(sys.argv[2]); n=int(sys.argv[3]); ob=int(sys.argv[4]) if len(sys.argv)>4 else 2
stopOpen=(sys.argv[5]!='0') if len(sys.argv)>5 else True
STALLSTOP=int(os.environ.get('STALL','1')); P=int(os.environ.get('PT','1'))
last=None; stall=False; skipped=0; runs=0; maxhp=0
HPF=float(os.environ.get('HPF','0.6'))  # skip a sortie that would start below HPF x max HP (a sortie fights from current HP)
def obs():
    global last,stall
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    if c!=200: print('  OBS ERR',c,(j.get('error') or {}).get('code'),flush=True); return ''
    global maxhp
    p=j['data']['expeditionInfo']['parties'][P-1]; maxhp=p['maximumHp']
    g=[(x['kind'],x.get('dungeonId'),x.get('floor'),x['current'],x['required']) for x in p['clearGates']]
    print('  OBS dest',p['destination'],p['depthLimit'],'hp',p['currentHp'],'/',p['maximumHp'],'|',g,'| last',p['disclosedOutcome'],flush=True)
    stall=(g==last); last=g
    if any(x[0]=='godGate' for x in g): return 'killed'
    return 'gates' if any(x[0] in ('eliteGate','bossGate') for x in g) else 'Entry gate'
obs(); last=None
AUTOGA=os.environ.get('AUTOGA')  # e.g. 'success:low' -> re-GA when the first gate (kind,floor) changes or progress stalls twice
import subprocess
gakey=None; nst=0
def autoga(g):
    global gakey,nst
    if not AUTOGA or not g: return
    key=(last[0][0],last[0][2]) if last else None
    nst=nst+1 if stall else 0
    if key!=gakey or nst>=2:
        o,e=AUTOGA.split(':'); print('  AUTOGA',key,'stall',nst,flush=True)
        r=subprocess.run(['python3','ga.py',o,e],capture_output=True,text=True); print('  '+r.stdout.replace('\n','\n  ').strip()[:900],flush=True)
        gakey=key; nst=0
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':S},tag='el')
    if c!=200: print('EL ERR',c,json.dumps(j)[:300],flush=True); break
    d=j['data']; igt=d['inGameTime'][5:16]
    pc=next((x for x in d.get('parties',[]) if x['partyNumber']==P),{})
    sv=(pc.get('controls') or {}).get('sortie') or {}
    outs=[]
    hpok=pc.get('currentHp',0)>=HPF*maxhp
    if k>0 and sv.get('available') and hpok:
        c2,j2=t.post(f'/commit/expedition/{P}/sortie',{'numberOfSortie':k},tag='sortie')
        if c2==200:
            d2=j2['data']; outs=[s['battleOutcome'] for s in d2['sorties']]; runs+=len(outs)
            print(igt,'hp',pc.get('currentHp'),'chg',pc.get('chargeStock'),'sortie',d2.get('summary'),''.join({'Clear':'C','Return':'R','Draw':'D','Retreat':'T','Defeat':'X'}.get(o,'?') for o in outs),'-> hp',d2.get('currentHp'),flush=True)
        else: print(igt,'sortie ERR',c2,(j2.get('error') or {}).get('code'),(j2.get('error') or {}).get('details'),flush=True)
    elif k>0:
        skipped+=1; print(igt,'hp',pc.get('currentHp'),'chg',pc.get('chargeStock'),'skip sortie:',sv.get('unavailableReason') or 'low_hp',flush=True)
    else: print(igt,'hp',pc.get('currentHp'),'chg',pc.get('chargeStock'),flush=True)
    if 'Clear' in outs: print('CLEAR seen'); obs(); break
    if (i+1)%ob==0 or i==n-1:
        g=obs(); autoga(g)
        if g=='killed': print('BOSS KILLED'); break
        if stopOpen and g=='Entry gate': print('BOSS OPEN / no gates'); break
        if STALLSTOP and stall: print('STALL'); break
print('calls',t.calls(),'sortieRuns',runs,'skipped',skipped)
