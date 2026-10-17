import t,json,sys,os,time,random,re
# replan.py [k=required-current] [obj=success] : expected-runs re-plan, GA only (no tuning).
# meter (simulationRun 300, 1 call) -> E = expected runs to finish a k-streak at route rate p
#   E <= ESKIP (8): skip | E > EBIG (45): big GA directly | else high GA, then big GA while E > EMID (15) (max BIGMAX=2 big per re-plan)
# Every GA: full components, global items, allDeities, order, levelProbe auto. Applies good/veryGood. Logs replan.jsonl.
# Prints a final line "REPLAN E=<expected runs after>" for the caller (hl4 stall budget).
P=int(os.environ.get('PT','1')); k=int(sys.argv[1]) if len(sys.argv)>1 else 2; obj=sys.argv[2] if len(sys.argv)>2 else 'success'
W=t.W; cids=[x+100*(P-1) if P>1 else x for x in range(1,7)]
ESKIP=float(os.environ.get('ESKIP','3')); EMID=float(os.environ.get('EMID','12')); EBIG=float(os.environ.get('EBIG','45')); BIGMAX=int(os.environ.get('BIGMAX','2'))
comp=os.environ.get('GCOMP','equipment,jewels,raceGender,mainClass,subClass,lineage,predisposition').split(',')
og=json.loads(os.environ['OG']) if os.environ.get('OG') else None
def E(p,k):
    if p<=0: return 1e9
    if p>=1: return float(k)
    return (1-p**k)/((1-p)*p**k)
def cr(r):
    if 'pSuccess' in r: return r['pSuccess']
    if r.get('scoredBy')=='progress': return 0.0   # both builds at 0 success: before/after are progress
    return r['after'] if r['applied'] else r['before']
def meter():
    c,j=t.rpost(f'/read/expedition/{P}/simulationRun',{'numberOfRun':300,'objective':obj,'seed':random.randint(1,2**31-1)},tag='meter')
    if c!=200: print('METER ERR',c,json.dumps(j)[:300],flush=True); return None,''
    d=j['data']; return d['rate'],str(d['overview'])
PCUR=[0.0]; NPROG=[0]
def ga(big):
    gp={'effort':'high','timeBudgetSeconds':300 if big else int(os.environ.get('TBH','180')),'seed':random.randint(1,2**31-1),'verifyRuns':500}
    if big: gp.update({'populationSize':64,'generations':200})
    if big and obj=='success' and PCUR[0]<float(os.environ.get('LOWP','0.15')): gp.update({'quickRuns':300,'confirmRuns':1000})   # low p: less selection noise
    gp.update(json.loads(os.environ.get('GAX','{}')))
    o2=obj
    if big and obj=='success' and PCUR[0]<float(os.environ.get('LOWP','0.15')) and os.environ.get('LOWOBJ','progress')=='progress' and not og and NPROG[0]==0: o2='progress'; NPROG[0]+=1   # low p: smooth signal (first GA only)
    body={'targets':[{'characterId':c,'changeableComponents':{x:True for x in comp}} for c in cids],'considerOrderChange':True,'considerDeityChange':'allDeities',
          'considerItemsScope':'global','objective':o2,'gaParameters':gp}
    if og: body['objectiveGuard']=og
    if os.environ.get('LP','auto')!='none': body['levelProbe']={'mode':os.environ.get('LP','auto')}
    t0=time.time(); c,j=t.rpost(f'/read/build/party/{P}/gaSearch',body,tag='gabig' if big else 'ga'); dt=time.time()-t0
    if c!=200: print('GA ERR',c,json.dumps(j)[:400],'real',round(dt,1),flush=True); return None
    d=j['data']; v=d.get('verification') or {}; cs=d.get('changeSummary') or []
    json.dump(d,open(W+'/ga_last.json','w'),ensure_ascii=False)
    r={'obj':o2,'big':big,'verdict':d.get('verdict'),'before':v.get('before'),'after':v.get('after'),'gain':round(((v.get('after') or 0)-(v.get('before') or 0))*100,1),'se':v.get('standardError'),
       'scoredBy':v.get('scoredBy'),'cross':v.get('crossCheck'),'evals':d.get('evaluations'),'sec':d.get('elapsedSeconds'),'real':round(dt,1),'nch':len(cs),
       'fc':[str(d['forecast']['before'])[:160],str(d['forecast']['after'])[:160]],'scope':d['forecast'].get('scope')}
    lp=d.get('levelProbe')
    if lp is not None:
        open(W+'/lp_log.jsonl','a').write(json.dumps({'n':t.calls(),'obj':obj,'k':k,'verdict':r['verdict'],'lp':lp})+'\n')
        r['lp']={x:y for x,y in lp.items() if x!='points'}; r['lpPts']=[(p.get('level'),p.get('rate'),p.get('expectedRuns')) for p in (lp.get('points') or [])]
    print(f"  GA{'X' if big else 'H'} {r['verdict']} {r['before']}->{r['after']} gain {r['gain']:+} se {r['se']} evals {r['evals']} sec {r['sec']} real {r['real']} nch {r['nch']} lp {json.dumps(r.get('lp'))[:200]} pts {r.get('lpPts')}",flush=True)
    applied=False
    if r['verdict'] in ('good','veryGood') and cs:
        c2,j2=t.post(f'/commit/build/party/{P}/applyBuildChanges',{'changes':cs,'basis':d.get('basis'),'verdict':d['verdict'],'simulation':False},tag='gaapply')
        applied=c2==200; print('  APPLY',c2,(j2.get('error') or {}).get('code'),flush=True)
    r['applied']=applied
    if o2!=obj:   # verdict was on progress: re-meter the success rate for E
        pm,_=meter(); r['pSuccess']=pm; print(f'  (progress GA) success now {pm}',flush=True)
    return r
rec={'n0':t.calls(),'k':k,'obj':obj,'og':og,'ga':[]}
p,ov=meter(); rec['p0']=p; rec['ov0']=ov[:200]
if p is None: print('REPLAN E=999'); sys.exit(1)
PCUR[0]=p; e=E(p,k); rec['E0']=e; print(f'  METER p={p:.3f} k={k} E={e:.1f} | {ov[:140]}',flush=True)
nbig=0
if e-k>ESKIP:   # excess runs over the k-run minimum
    first_big = e-k>EBIG or os.environ.get('FORCEBIG')=='1'
    r=ga(first_big); nbig+=first_big
    if r: rec['ga'].append(r)
    while r and obj=='success':
        cur=cr(r)
        if cur is not None: e=E(cur,k); PCUR[0]=cur
        if e-k<=EMID or nbig>=BIGMAX: break
        if r['big'] and not r['applied']: break   # a big GA found nothing: stop
        r=ga(True); nbig+=1
        if r: rec['ga'].append(r)
    if r and obj=='success':
        cur=cr(r)
        if cur is not None: e=E(cur,k)
rec['E1']=e; rec['n1']=t.calls()
open(W+'/replan.jsonl','a').write(json.dumps(rec,ensure_ascii=False)+'\n')
print(f'REPLAN E={e:.1f} calls {t.calls()}',flush=True)
