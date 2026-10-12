import t,sys,json,os,math
# hl.py n [obsEvery=6] [stopOpen=1]   HP-aware loop for build 36 (a sortie keeps the party's current HP).
# API elapsed only processes WHOLE AFK cycles (sub-cycle time is carried; a sortie resets the carry) and every processed
# cycle ends with a full heal. So after a sortie that lost HP, the party is healed only once one full cycle of elapsed
# (which also runs one natural expedition) has passed.
# Loop: elapsed S; if HP still < HPF, add ADD s until healed (max 4); then sortie: the 1st at HP >= HPF, extra ones
# (up to K per loop) while HP >= HPF2. With HPF2 <= 0 the K sorties go in one batch call (farming).
# S adapts to the seconds actually needed for the heal in the previous loop.
# env: PT=1 K=1 HPF=0.97 HPF2=0.9 S0=1200 ADD=240 SMAX=3600 STALL=0 STOPCLEAR=1
n=int(sys.argv[1]); ob=int(sys.argv[2]) if len(sys.argv)>2 else 6
stopOpen=(sys.argv[3]!='0') if len(sys.argv)>3 else True
P=int(os.environ.get('PT','1')); K=int(os.environ.get('K','1')); HPF=float(os.environ.get('HPF','0.97')); HPF2=float(os.environ.get('HPF2','0.9'))
S=int(os.environ.get('S0','1200')); SMIN=int(os.environ.get('SMIN','360')); ADD=int(os.environ.get("ADD","90")); SMAX=int(os.environ.get('SMAX','3600'))
STALLSTOP=int(os.environ.get('STALL','0')); STOPCLEAR=int(os.environ.get('STOPCLEAR','1'))
last=None; stall=False; skipped=0; runs=0; maxhp=1; tally={}; extra=0; sorties=0
def obs():
    global last,stall,maxhp
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    if c!=200: print('  OBS ERR',c,(j.get('error') or {}).get('code'),flush=True); return ''
    p=j['data']['expeditionInfo']['parties'][P-1]; maxhp=p['maximumHp']
    g=[(x['kind'],x.get('dungeonId'),x.get('floor'),x['current'],x['required']) for x in p['clearGates']]
    print('  OBS dest',p['destination'],p['depthLimit'],'lv',p.get('level'),'hp',p['currentHp'],'/',p['maximumHp'],'|',g,'| last',p['disclosedOutcome'],flush=True)
    stall=(g==last); last=g
    if any(x[0]=='godGate' for x in g): return 'killed'
    if int(os.environ.get('STOPLV','0')) and (p.get('level') or 0)>=int(os.environ['STOPLV']): return 'level'
    return 'gates' if any(x[0] in ('eliteGate','bossGate') for x in g) else 'Entry gate'
def el(s):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':s},tag='el')
    if c!=200: print('EL ERR',c,json.dumps(j)[:300],flush=True); return None
    d=j['data']; pc=next((x for x in d.get('parties',[]) if x['partyNumber']==P),{})
    return d['inGameTime'][5:16],pc
def getRM():
    c,j=t.gg(f'/read/build/party/{P}',tag='party')
    return 2.0 if c==200 and j['data']['current'].get('deityId')=='fortification' else 1.0
RM=float(os.environ['RM']) if os.environ.get('RM') else getRM()  # rest duration multiplier (2 with God of Fortification)
print('  RM',RM,flush=True)
B=None; hpAfter=None
def rest_s(h):
    if h is None: return 0
    miss=max(0,maxhp-h); per=max(200,math.ceil(0.02*maxhp))
    return 15*RM*(max(1,math.ceil(miss/per)) if miss>0 else 1)
SYM={'Clear':'C','Return':'R','Draw':'D','Retreat':'T','Defeat':'X'}
AUTOGA=os.environ.get('AUTOGA')  # 'objective:effort' -> gaSearch when the first gate (kind,floor) changes or progress stalls NST obs
NST=int(os.environ.get('NST','2'))
import subprocess
gakey=None; nst=0
def autoga():
    global gakey,nst
    if not AUTOGA or not last: return
    key=(last[0][0],last[0][2]); nst=nst+1
    if gakey is None: gakey=key; return
    if key!=gakey or nst>=NST:
        o,e=AUTOGA.split(':'); print('  AUTOGA',key,'stall',nst,flush=True)
        r=subprocess.run(['python3','tw.py',o,e,os.environ.get('TUNE','4,2,3,5')],capture_output=True,text=True,cwd=os.path.dirname(os.path.abspath(__file__)))
        print('  '+'\n  '.join(r.stdout.strip().split('\n')[:40]),flush=True)
        gakey=key; nst=0
        global RM,B
        open(os.environ['BOKEMO_PLAY_DIR']+'/replan.log','a').write(str(key)+'\n'+r.stdout+'\n')
        if 'APPLY 200' in r.stdout: RM=getRM(); B=None
obs(); last=None; done=False
for i in range(n):
    if hpAfter is not None and hpAfter>=HPF*maxhp: S=SMIN          # no heal needed: wait for one charge only
    elif B is not None and hpAfter is not None: S=max(SMIN,int(math.ceil((B+rest_s(hpAfter))/15)*15))
    r=el(S)
    if not r: break
    igt,pc=r; maxhp=pc.get('maximumHp',maxhp); need=S; adds=0; rs=rest_s(hpAfter)
    while pc.get('currentHp',0)<HPF*maxhp and adds<4:
        r=el(ADD); adds+=1; extra+=1
        if not r: break
        igt,pc=r; need+=ADD; maxhp=pc.get('maximumHp',maxhp)
    if not r: break
    S=min(SMAX,need)
    if hpAfter is not None and hpAfter<HPF*maxhp:   # learn B: healed on 1st try -> upper bound (try 60 s less next), else lower bound + ADD
        B=(need-rs-45) if adds==0 else (need-rs)
    hp=pc.get('currentHp',0); sv=(pc.get('controls') or {}).get('sortie') or {}; outs=[]; chg=pc.get('chargeStock')
    if K>0 and HPF2<=0 and sv.get('available') and hp>=HPF*maxhp:
        c2,j2=t.post(f'/commit/expedition/{P}/sortie',{'numberOfSortie':K},tag='sortie'); sorties+=1
        if c2==200: d2=j2['data']; outs=[s['battleOutcome'] for s in d2['sorties']]; hp=d2.get('currentHp',hp); chg=d2.get('chargeStock')
        else: print(igt,'sortie ERR',c2,(j2.get('error') or {}).get('code'),flush=True)
    else:
        thr=HPF
        while K>len(outs) and sv.get('available') and hp>=thr*maxhp:
            c2,j2=t.post(f'/commit/expedition/{P}/sortie',{'numberOfSortie':1},tag='sortie'); sorties+=1
            if c2!=200: print(igt,'sortie ERR',c2,(j2.get('error') or {}).get('code'),flush=True); break
            d2=j2['data']; outs+= [s['battleOutcome'] for s in d2['sorties']]; hp=d2.get('currentHp',hp); chg=d2.get('chargeStock')
            sv=(d2.get('controls') or {}).get('sortie') or {'available':(chg or 0)>0}; thr=HPF2
            if 'Clear' in outs: break
    hpAfter=hp if outs else None
    runs+=len(outs)
    for o in outs: tally[o]=tally.get(o,0)+1
    if not outs: skipped+=1
    print(igt,'S',need,'(+%d)'%adds if adds else '','hp->',hp,'/',maxhp,'chg',chg,'sortie',''.join(SYM.get(o,'?') for o in outs) or ('skip:'+str(sv.get('unavailableReason') or 'low_hp')),flush=True)
    if STOPCLEAR and 'Clear' in outs: print('CLEAR seen'); obs(); break
    if (i+1)%ob==0 or i==n-1:
        g=obs(); autoga()
        if g=='killed': print('BOSS KILLED'); break
        if g=='level': print('LEVEL REACHED'); break
        if stopOpen and g=='Entry gate': print('BOSS OPEN / no gates'); break
        if STALLSTOP and stall: print('STALL'); break
print('calls',t.calls(),'sortieRuns',runs,'sortieCalls',sorties,'extraEl',extra,'skipped',skipped,'tally',tally,'S',S)
