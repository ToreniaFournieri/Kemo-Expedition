import t,os,sys,time,json,subprocess
import gate,ga2
# replan.py k [c=0] [reason=manual] : expected-runs driven re-plan for the current gate (route to the first closed Clear-Gate).
#  1. meter success (1 call) -> p, E = expectedRuns(p,k,c)
#  2. E <= ESKIP and not a slot unlock -> keep the build (no search)
#  3. GA `high` (TB ABTB, skipped when E > EBIG and BIGMAX > 0); while E > EMAX -> GA `big` (TBBIG, new seed each time), at most BIGMAX times
# Returns (p, E, changed): changed is False when no search applied anything (hl4 then waits SMAX cycles).
# Tuning is off (GP run: 373 calls, 10 % accepted); AUTOTUNE=1 brings back attacker tuning before the GA.
# After DEADLINE (epoch seconds) only the `high` GA runs, to protect the real-time limit.
# env: ESKIP=8 EMAX=15 EBIG=45 BIGMAX=2 ABTB=120 TBBIG=300 AUTOTUNE=0 TUNE=4,2,3,5 DEADLINE=0
ESKIP=float(os.environ.get('ESKIP','8')); EMAX=float(os.environ.get('EMAX','15')); BIGMAX=int(os.environ.get('BIGMAX','2')); EBIG=float(os.environ.get('EBIG','45'))
ABTB=int(os.environ.get('ABTB','120')); TBBIG=int(os.environ.get('TBBIG','300'))
def _log(rec):
    open(t.W+'/replan.jsonl','a').write(json.dumps(rec)+'\n')
def replan(k,c=0,reason='manual',key=None):
    t0=time.time(); n0=t.calls()
    _,p,ov=gate.meter('success')
    if p is None: return None,None,False
    e=gate.expected_runs(p,k,c); steps=[]; applied=[]
    print(f'  REPLAN {reason} {key} k {k} c {c} p {p:.3f} E {gate.fmt(e)} | {ov}',flush=True)
    if e<=ESKIP and reason!='slot':
        print('  REPLAN skip (E <= ESKIP)',flush=True); _log({'n':t.calls(),'key':key,'reason':reason,'k':k,'c':c,'p0':p,'E0':e,'steps':[],'p':p,'E':e,'calls':t.calls()-n0,'real':round(time.time()-t0)}); return p,e,True
    if os.environ.get('AUTOTUNE','0')=='1':
        out=subprocess.run(['python3','tune.py',os.environ.get('TUNE','4,2,3,5'),'success','1'],capture_output=True,text=True,cwd=os.path.dirname(os.path.abspath(__file__))).stdout
        steps.append(('tune',out.count('accepted=True')))
        _,p,_=gate.meter('success'); e=gate.expected_runs(p,k,c)
    def take(r):
        nonlocal p,e
        if r and r['applied']:
            applied.append(1)
            p=r['routeAfter'] if r['routeAfter'] is not None else (gate.meter('success')[1] or p); e=gate.expected_runs(p,k,c)
        steps.append((r or {}).get('verdict'))
    late=float(os.environ.get('DEADLINE','0') or 0)>0 and time.time()>float(os.environ['DEADLINE'])
    if e<=EBIG or late or BIGMAX<=0: take(ga2.search('success',ABTB,'high'))   # a deep wall goes straight to the big GA
    nb=0
    while e>EMAX and nb<BIGMAX and not late:
        take(ga2.search('success',TBBIG,'big')); nb+=1
    print(f'  REPLAN done p {p:.3f} E {gate.fmt(e)} steps {steps} calls {t.calls()-n0} real {round(time.time()-t0)}s',flush=True)
    _log({'n':t.calls(),'key':key,'reason':reason,'k':k,'c':c,'steps':steps,'p':p,'E':e,'calls':t.calls()-n0,'real':round(time.time()-t0)})
    return p,e,bool(applied)
if __name__=='__main__':
    a=sys.argv; replan(int(a[1]),int(a[2]) if len(a)>2 else 0,a[3] if len(a)>3 else 'manual')
    print('calls',t.calls())
