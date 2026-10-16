import t,json,sys,os,time,random,re
# ga2.py objective [TB=120] [size=high|big] : one full-component gaSearch (global items, allDeities, order) + levelProbe, applied when good/veryGood.
# size=big -> populationSize 64 x generations 200 x quickRuns 300 (time-bound at 300 s; the `high` preset is 48 x 80 x 100).
# env: PT=1 OG='{"progress":0.9}' (objectiveGuard) GCOMP=comps LP=auto|none LPJ='{levelProbe json}' GAX='{extra gaParameters}'
# Logs ab_log.jsonl / lp_log.jsonl in $BOKEMO_PLAY_DIR (same shape as the GP run, plus `size`, `routeAfter`).
W=t.W
BIG={'populationSize':64,'generations':200,'quickRuns':300}   # Tune4, same pop: qr300 TB300 +17.6 pt / 87 % good vs qr100 TB240 +10.2 / 58 %
GCOMP='equipment,jewels,raceGender,mainClass,subClass,lineage,predisposition'
def _route(fc):
    m=re.search(r'Success ([0-9.]+)%',fc if isinstance(fc,str) else '')
    return round(float(m.group(1))/100,4) if m else None
def _r4(x): return round(x,4) if isinstance(x,(int,float)) else x
def search(obj='success',TB=120,size='high',og=None,apply=True,P=None):
    P=P or int(os.environ.get('PT','1'))
    cids=[x+100*(P-1) if P>1 else x for x in range(1,7)]
    gcomp=os.environ.get('GCOMP',GCOMP).split(',')
    seed=random.randint(1,2**31-1); vseed=random.randint(1,2**31-1)
    tp={'effort':'high','timeBudgetSeconds':TB,'seed':seed,'verifySeed':vseed,'verifyRuns':500}
    if size=='big': tp.update(BIG)
    tp.update(json.loads(os.environ.get('GAX','{}')))
    body={'targets':[{'characterId':c,'changeableComponents':{k:True for k in gcomp}} for c in cids],'considerOrderChange':True,
          'considerDeityChange':'allDeities','considerItemsScope':'global','objective':obj,'gaParameters':tp}
    if og is None and os.environ.get('OG'): og=json.loads(os.environ['OG'])
    if og: body['objectiveGuard']=og
    if os.environ.get('LP','auto')!='none': body['levelProbe']=json.loads(os.environ.get('LPJ','{}')) or {'mode':os.environ.get('LP','auto')}
    t0=time.time(); c,j=t.rpost(f'/read/build/party/{P}/gaSearch',body,tag='ga'); dt=time.time()-t0
    if c!=200: print('  GA ERR',c,json.dumps(j)[:400],'real',round(dt,1),flush=True); return None
    d=j['data']; v=d.get('verification') or {}; cs=d.get('changeSummary') or []; fc=d.get('forecast') or {}
    r={'verdict':d.get('verdict'),'scoredBy':v.get('scoredBy'),'before':v.get('before'),'after':v.get('after'),
       'gain':round(((v.get('after') or 0)-(v.get('before') or 0))*100,1),'se':v.get('standardError'),'prog':v.get('progress'),'cross':v.get('crossCheck'),
       'evals':d.get('evaluations'),'sec':d.get('elapsedSeconds'),'real':round(dt,1),'nch':len(cs),
       'routeBefore':_route(fc.get('before')),'routeAfter':_route(fc.get('after')),'fc':[str(fc.get('before'))[:120],str(fc.get('after'))[:120]],'applied':False}
    json.dump(d,open(W+'/ga_last.json','w'),ensure_ascii=False)
    lp=d.get('levelProbe')
    if lp is not None:
        open(W+'/lp_log.jsonl','a').write(json.dumps({'n':t.calls(),'obj':obj,'verdict':r['verdict'],'lp':lp})+'\n')
        print('  LP levelNeeded',lp.get('levelNeeded'),'goal',json.dumps(lp.get('goal')),'pts',[(p['level'],p['rate'],p.get('expectedRuns')) for p in lp.get('points') or []],flush=True)
    print(f"  GA[{size}] {obj} {r['verdict']} {_r4(r['before'])}->{_r4(r['after'])} ({r['scoredBy']}) route {r['routeBefore']}->{r['routeAfter']} gain {r['gain']:+} se {r['se']} evals {r['evals']} sec {r['sec']} nch {r['nch']}",flush=True)
    if apply and r['verdict'] in ('good','veryGood') and cs:
        c2,j2=t.post(f'/commit/build/party/{P}/applyBuildChanges',{'changes':cs,'basis':d.get('basis'),'verdict':d['verdict'],'simulation':False},tag='gaapply')
        r['applied']=(c2==200); print('  APPLY',c2,(j2.get('error') or {}).get('code'),flush=True)
    open(W+'/ab_log.jsonl','a').write(json.dumps({'n':t.calls(),'obj':obj,'TB':TB,'size':size,'og':og,'seed':seed,'res':{'ga':r}})+'\n')
    return r
if __name__=='__main__':
    a=sys.argv; search(a[1] if len(a)>1 else 'success',int(a[2]) if len(a)>2 else 120,a[3] if len(a)>3 else 'high')
    print('calls',t.calls())
