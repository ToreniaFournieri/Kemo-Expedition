import t,sys,json,os
import gate
from replan import replan
# hl4.py n [obsEvery=6] [stopOpen=1]   GP2 gate loop (hl3 cycle logic; re-plan triggers rewritten).
# Cycle: elapsed max(60, secondsToNextCycle) -> sortie at HP >= HPF (up to K while HP >= HPF2). A cycle = natural run + sortie (~2 gate runs).
# Re-plan (replan.py, expected-runs driven) at an observation when:
#   gate  : the first closed gate (kind, floor) changed, including the first observation of a new destination
#   slot  : the party level crossed an equipment-slot unlock level (24, 30, 36, ...) since the last re-plan
#   stall : cycles since the last re-plan >= budget = clamp(STALLX * E_after / 2, SMIN, SMAX) and the streak is not about to finish
#           (budget = SMAX when the last re-plan changed nothing, so a dead wall is not searched every few cycles)
# The re-plan state (gate key, level, cycles, budget) is kept in the state file as `gp2plan`.
# env: FRESH=0 PT=1 K=1 HPF=0.97 HPF2=0.95 S0=1200 STOPCLEAR=1 STOPLV=0 REPLAN=1 STALLX=2 SMIN=12 SMAX=36 (+ replan.py env)
n=int(sys.argv[1]); ob=int(sys.argv[2]) if len(sys.argv)>2 else 6
stopOpen=(sys.argv[3]!='0') if len(sys.argv)>3 else True
P=int(os.environ.get('PT','1')); K=int(os.environ.get('K','1')); HPF=float(os.environ.get('HPF','0.97')); HPF2=float(os.environ.get('HPF2','0.95'))
S0=int(os.environ.get('S0','1200')); STOPCLEAR=int(os.environ.get('STOPCLEAR','1')); REPLAN=os.environ.get('REPLAN','1')=='1'
STALLX=float(os.environ.get('STALLX','2')); SMIN=int(os.environ.get('SMIN','12')); SMAX=int(os.environ.get('SMAX','36'))
runs=0; tally={}; sorties=0; healmiss=0; skipped=0
stnc=None if os.environ.get('S0') else t.st().get('stnc',{}).get(str(P))
cur={'key':None,'k':0,'c':0,'lv':None}
plan={'key':None,'lv':None,'cyc':0,'budget':SMAX}
_ps=t.st().get('gp2plan') if os.environ.get('FRESH','0')!='1' else None   # survive a loop restart (FRESH=1 forces a re-plan)
if _ps: plan.update(_ps); plan['key']=tuple(plan['key']) if plan['key'] else None
def obs():
    c,j=t.gg('/read/observation/expedition',tag='obs-exp')
    if c!=200: print('  OBS ERR',c,(j.get('error') or {}).get('code'),flush=True); return ''
    p=j['data']['expeditionInfo']['parties'][P-1]
    g=[(x['kind'],x.get('dungeonId'),x.get('floor'),x['current'],x['required']) for x in p['clearGates']]
    print('  OBS dest',p['destination'],p['depthLimit'],'lv',p.get('level'),'xp%',p.get('experienceRatio'),'hp',p['currentHp'],'/',p['maximumHp'],'|',g,'| last',p['disclosedOutcome'],flush=True)
    cur['lv']=p.get('level')
    if any(x[0]=='godGate' for x in g): return 'killed'
    if int(os.environ.get('STOPLV','0')) and (p.get('level') or 0)>=int(os.environ['STOPLV']): return 'level'
    gs=[x for x in g if x[0] in ('eliteGate','bossGate')]
    if not gs: return 'Entry gate'
    cur['key']=(gs[0][0],gs[0][1],gs[0][2]); cur['c']=gs[0][3]; cur['k']=gs[0][4]
    return 'gates'
def maybe_replan():
    if not REPLAN or cur['key'] is None: return
    why=None
    if cur['key']!=plan['key']: why='gate'
    elif gate.slot_crossed(plan['lv'],cur['lv']): why='slot'
    elif plan['cyc']>=plan['budget'] and cur['c']<cur['k']-1: why='stall'
    if not why: return
    p,e,changed=replan(cur['k'],cur['c'],why,list(cur['key']))
    if p is None: return
    b=SMAX if (e==float('inf') or not changed) else int(min(SMAX,max(SMIN,STALLX*e/2)))
    plan.update(key=cur['key'],lv=cur['lv'],cyc=0,budget=b); print('  NEXT stall budget',b,'cycles',flush=True)
    _save()
def _save():
    s=t.st(); s['gp2plan']=plan; t.sv(s)
def el(s):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':s},tag='el')
    if c!=200: print('EL ERR',c,json.dumps(j)[:300],flush=True); return None
    d=j['data']; pc=next((x for x in d.get('parties',[]) if x['partyNumber']==P),{})
    return d['inGameTime'][5:16],pc
SYM={'Clear':'C','Return':'R','Draw':'D','Retreat':'T','Defeat':'X'}
g0=obs()
if g0=='killed': print('BOSS KILLED'); sys.exit()
if stopOpen and g0=='Entry gate': print('BOSS OPEN / no gates'); sys.exit()
maybe_replan()
for i in range(n):
    S=max(60,stnc) if stnc is not None else S0
    r=el(S)
    if not r: break
    igt,pc=r; maxhp=pc.get('maximumHp',1); stnc=pc.get('secondsToNextCycle'); need=S
    if pc.get('currentHp',0)<HPF*maxhp:   # should not happen after a whole Cycle; record it
        healmiss+=1; r=el(max(60,stnc or 60))
        if not r: break
        igt,pc=r; need+=max(60,stnc or 60); stnc=pc.get('secondsToNextCycle')
    hp=pc.get('currentHp',0); sv=(pc.get('controls') or {}).get('sortie') or {}; outs=[]; chg=pc.get('chargeStock'); thr=HPF
    while K>len(outs) and sv.get('available') and hp>=thr*maxhp:
        c2,j2=t.post(f'/commit/expedition/{P}/sortie',{'numberOfSortie':1},tag='sortie'); sorties+=1
        if c2!=200: print(igt,'sortie ERR',c2,(j2.get('error') or {}).get('code'),flush=True); break
        d2=j2['data']; outs+=[s['battleOutcome'] for s in d2['sorties']]; hp=d2.get('currentHp',hp); chg=d2.get('chargeStock')
        stnc=d2.get('secondsToNextCycle',stnc)
        sv=(d2.get('controls') or {}).get('sortie') or {'available':(chg or 0)>0}; thr=HPF2
        if 'Clear' in outs: break
    runs+=len(outs); plan['cyc']+=1
    for o in outs: tally[o]=tally.get(o,0)+1
    if not outs: skipped+=1
    print(igt,'S',need,'hp->',hp,'/',maxhp,'chg',chg,'next',stnc,'sortie',''.join(SYM.get(o,'?') for o in outs) or ('skip:'+str(sv.get('unavailableReason') or 'low_hp')),flush=True)
    if STOPCLEAR and 'Clear' in outs:
        print('CLEAR seen')
        if obs()=='killed': print('BOSS KILLED')
        break
    if (i+1)%ob==0 or i==n-1:
        g=obs()
        if g=='killed': print('BOSS KILLED'); break
        if g=='level': print('LEVEL REACHED'); break
        if g=='Entry gate':
            if stopOpen: print('BOSS OPEN / no gates'); break
        else: maybe_replan()
_save(); _s=t.st(); _s.setdefault('stnc',{})[str(P)]=stnc; t.sv(_s)
print('calls',t.calls(),'sortieRuns',runs,'sortieCalls',sorties,'healMiss',healmiss,'skipped',skipped,'tally',tally,'S',stnc)
