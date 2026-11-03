import t,sys,json,os,subprocess
# hl2.py n [obsEvery=6] [stopOpen=1]   build-45 loop: exact heal with secondsToNextCycle (9.1.4.4).
# A completed elapsed Cycle ends at maximum HP and runs one natural expedition; a sortie drops the carry.
# Loop: elapsed max(60, secondsToNextCycle) -> sortie at HP >= HPF, extra sorties (up to K) while HP >= HPF2 and a charge is left.
# With HPF2 <= 0 the K sorties go in one batch call (farming). No HP learning, no top-ups, no deity read.
# env: PT=1 K=1 HPF=0.97 HPF2=0.95 S0=1200 STALL=0 STOPCLEAR=1 STOPLV=0 AUTOGA=objective:effort NST=2 TUNE=4,2,3,5
n=int(sys.argv[1]); ob=int(sys.argv[2]) if len(sys.argv)>2 else 6
stopOpen=(sys.argv[3]!='0') if len(sys.argv)>3 else True
P=int(os.environ.get('PT','1')); K=int(os.environ.get('K','1')); HPF=float(os.environ.get('HPF','0.97')); HPF2=float(os.environ.get('HPF2','0.95'))
S0=int(os.environ.get('S0','1200')); STALLSTOP=int(os.environ.get('STALL','0')); STOPCLEAR=int(os.environ.get('STOPCLEAR','1'))
last=None; stall=False; skipped=0; runs=0; maxhp=1; tally={}; sorties=0; healmiss=0; stnc=None if os.environ.get('S0') else t.st().get('stnc',{}).get(str(P))
def obs():
    global last,stall,maxhp
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    if c!=200: print('  OBS ERR',c,(j.get('error') or {}).get('code'),flush=True); return ''
    p=j['data']['expeditionInfo']['parties'][P-1]; maxhp=p['maximumHp']
    g=[(x['kind'],x.get('dungeonId'),x.get('floor'),x['current'],x['required']) for x in p['clearGates']]
    print('  OBS dest',p['destination'],p['depthLimit'],'lv',p.get('level'),'xp%',p.get('experienceRatio'),'hp',p['currentHp'],'/',p['maximumHp'],'|',g,'| last',p['disclosedOutcome'],flush=True)
    stall=(g==last); last=g
    if any(x[0]=='godGate' for x in g): return 'killed'
    if int(os.environ.get('STOPLV','0')) and (p.get('level') or 0)>=int(os.environ['STOPLV']): return 'level'
    return 'gates' if any(x[0] in ('eliteGate','bossGate') for x in g) else 'Entry gate'
def el(s):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':s},tag='el')
    if c!=200: print('EL ERR',c,json.dumps(j)[:300],flush=True); return None
    d=j['data']; pc=next((x for x in d.get('parties',[]) if x['partyNumber']==P),{})
    return d['inGameTime'][5:16],pc
SYM={'Clear':'C','Return':'R','Draw':'D','Retreat':'T','Defeat':'X'}
AUTOGA=os.environ.get('AUTOGA')  # 'objective:effort' -> tw.py when the first gate (kind,floor) changes or progress stalls NST obs
NST=int(os.environ.get('NST','2'))
gakey=None; nst=0
def autoga():
    global gakey,nst
    if not AUTOGA or not last: return
    key=(last[0][0],last[0][2]); nst=nst+1
    if gakey is None: gakey=key; return
    if key!=gakey or nst>=NST:
        o,e=AUTOGA.split(':'); print('  AUTOGA',key,'stall',nst,flush=True)
        out=''
        if os.environ.get('AUTOTUNE','1')=='1':
            rt=subprocess.run(['python3','tune.py',os.environ.get('TUNE','4,2,3,5'),o,'1'],capture_output=True,text=True,cwd=os.path.dirname(os.path.abspath(__file__)))
            out+='TUNING accepted %d\n'%rt.stdout.count('accepted=True')
        r=subprocess.run(['python3','ab.py',o,os.environ.get('ABTB','120'),os.environ.get('ABR','2')],capture_output=True,text=True,cwd=os.path.dirname(os.path.abspath(__file__)))
        r.stdout=out+r.stdout
        print('  '+'\n  '.join(r.stdout.strip().split('\n')[:40]),flush=True)
        gakey=key; nst=0
        open(os.environ['BOKEMO_PLAY_DIR']+'/replan.log','a').write(str(key)+'\n'+r.stdout+'\n')
obs(); gakey=(last[0][0],last[0][2]) if last else None; last=None   # seed the gate key so the first floor change re-plans
for i in range(n):
    S=max(60,stnc) if stnc is not None else S0
    r=el(S)
    if not r: break
    igt,pc=r; maxhp=pc.get('maximumHp',maxhp); stnc=pc.get('secondsToNextCycle'); need=S
    if pc.get('currentHp',0)<HPF*maxhp:   # should not happen after a whole Cycle; record it
        healmiss+=1; r=el(max(60,stnc or 60))
        if not r: break
        igt,pc=r; need+=max(60,stnc or 60); stnc=pc.get('secondsToNextCycle')
    hp=pc.get('currentHp',0); sv=(pc.get('controls') or {}).get('sortie') or {}; outs=[]; chg=pc.get('chargeStock')
    if K>0 and HPF2<=0 and sv.get('available') and hp>=HPF*maxhp:
        c2,j2=t.post(f'/commit/expedition/{P}/sortie',{'numberOfSortie':min(K,chg or 1)},tag='sortie'); sorties+=1
        if c2==200: d2=j2['data']; outs=[s['battleOutcome'] for s in d2['sorties']]; hp=d2.get('currentHp',hp); chg=d2.get('chargeStock'); stnc=d2.get('secondsToNextCycle',stnc)
        else: print(igt,'sortie ERR',c2,(j2.get('error') or {}).get('code'),flush=True)
    else:
        thr=HPF
        while K>len(outs) and sv.get('available') and hp>=thr*maxhp:
            c2,j2=t.post(f'/commit/expedition/{P}/sortie',{'numberOfSortie':1},tag='sortie'); sorties+=1
            if c2!=200: print(igt,'sortie ERR',c2,(j2.get('error') or {}).get('code'),flush=True); break
            d2=j2['data']; outs+=[s['battleOutcome'] for s in d2['sorties']]; hp=d2.get('currentHp',hp); chg=d2.get('chargeStock')
            stnc=d2.get('secondsToNextCycle',stnc)
            sv=(d2.get('controls') or {}).get('sortie') or {'available':(chg or 0)>0}; thr=HPF2
            if 'Clear' in outs: break
    runs+=len(outs)
    for o in outs: tally[o]=tally.get(o,0)+1
    if not outs: skipped+=1
    print(igt,'S',need,'hp->',hp,'/',maxhp,'chg',chg,'next',stnc,'sortie',''.join(SYM.get(o,'?') for o in outs) or ('skip:'+str(sv.get('unavailableReason') or 'low_hp')),flush=True)
    if STOPCLEAR and 'Clear' in outs: print('CLEAR seen'); obs(); break
    if (i+1)%ob==0 or i==n-1:
        g=obs()
        if g!='Entry gate': autoga()
        if g=='killed': print('BOSS KILLED'); break
        if g=='level': print('LEVEL REACHED'); break
        if stopOpen and g=='Entry gate': print('BOSS OPEN / no gates'); break
        if STALLSTOP and stall: print('STALL'); break
_s=t.st(); _s.setdefault('stnc',{})[str(P)]=stnc; t.sv(_s)
print('calls',t.calls(),'sortieRuns',runs,'sortieCalls',sorties,'healMiss',healmiss,'skipped',skipped,'tally',tally,'S',stnc)
