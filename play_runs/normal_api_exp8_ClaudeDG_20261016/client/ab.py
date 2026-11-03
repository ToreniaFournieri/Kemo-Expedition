import t,json,sys,os,time,random
# ab.py objective [TB=150] [rounds=1] : paired A/B on the same save: gaSearch vs directedBuild(free), same seed + verifySeed + TB.
# Applies the better (rank by verdict then gain) when good/veryGood; repeats up to `rounds` while a round applied something.
# env: PT=1 OG='{"bossDamage":0.6}' (objectiveGuard for both) ONLY=ga|dir (skip the other) GCOMP/DCOMP comps AES=changedOnly|allTargets EFF=high
P=int(os.environ.get('PT','1')); obj=sys.argv[1]; TB=int(sys.argv[2]) if len(sys.argv)>2 else 150; rounds=int(sys.argv[3]) if len(sys.argv)>3 else 1
W=t.W; cids=[x+100*(P-1) if P>1 else x for x in range(1,7)]
allc=['uniqueCharacter','raceGender','mainClass','subClass','lineage','predisposition']
gcomp=os.environ.get('GCOMP','equipment,jewels,raceGender,mainClass,subClass,lineage,predisposition').split(',')
dcomp=os.environ.get('DCOMP','uniqueCharacter,raceGender,mainClass,subClass,lineage,predisposition').split(',')
og=json.loads(os.environ['OG']) if os.environ.get('OG') else None
RANK={'veryGood':3,'good':2,'noisy':1,'noChange':0,'worse':-1}
def ov(o): return o if isinstance(o,str) else json.dumps(o)[:200]
def run(kind,seed,vseed):
    tp={'effort':os.environ.get('EFF','high'),'timeBudgetSeconds':TB,'seed':seed,'verifySeed':vseed,'verifyRuns':500}
    if kind=='ga':
        body={'targets':[{'characterId':c,'changeableComponents':{k:True for k in gcomp}} for c in cids],'considerOrderChange':True,'considerDeityChange':'allDeities',
              'considerItemsScope':'global','objective':obj,'gaParameters':tp}
        path=f'/read/build/party/{P}/gaSearch'
    else:
        body={'direction':'free','targets':[{'characterId':c,'changeableComponents':dict({k:(k in dcomp) for k in allc})} for c in cids],'autoEquipmentScope':os.environ.get('AES','changedOnly'),
              'directionStrictness':'strict','considerOrderChange':True,'considerDeityChange':'allDeities','considerItemsScope':'global','objective':obj,'tuningParameters':tp}
        path=f'/read/build/party/{P}/directedBuild'
    if og: body['objectiveGuard']=og
    t0=time.time(); c,j=t.rpost(path,body,tag=kind); dt=time.time()-t0
    if c!=200: print(kind.upper(),'ERR',c,json.dumps(j)[:500],'real',round(dt,1)); return None
    d=j['data']; v=d.get('verification') or {}; cs=d.get('changeSummary') or []
    r={'kind':kind,'verdict':d.get('verdict'),'before':v.get('before'),'after':v.get('after'),'gain':round(((v.get('after') or 0)-(v.get('before') or 0))*100,1),'se':v.get('standardError'),
       'prog':v.get('progress'),'cross':v.get('crossCheck'),'evals':d.get('evaluations'),'sec':d.get('elapsedSeconds'),'real':round(dt,1),'nch':len(cs),'fc':[ov(d['forecast']['before']),ov(d['forecast']['after'])],'d':d}
    return r
for rd in range(rounds):
    seed=random.randint(1,2**31-1); vseed=random.randint(1,2**31-1); res={}
    for kind in (['ga','dir'] if not os.environ.get('ONLY') else [os.environ['ONLY']]):
        r=run(kind,seed,vseed)
        if r: res[kind]=r
        if r: print(f"  {kind:3} {r['verdict']:8} {r['before']}->{r['after']} gain {r['gain']:+} pt se {r['se']} prog {json.dumps(r['prog'])[:60]} evals {r['evals']} sec {r['sec']} real {r['real']} nch {r['nch']}",flush=True)
    open(W+'/ab_log.jsonl','a').write(json.dumps({'n':t.calls(),'obj':obj,'TB':TB,'og':og,'round':rd,'seed':seed,'res':{k:{x:y for x,y in v.items() if x!='d'} for k,v in res.items()}})+'\n')
    if not res: break
    best=max(res.values(),key=lambda r:(RANK.get(r['verdict'],-2),r['gain'],(r['prog'] or {}).get('after',0) if isinstance(r['prog'],dict) else 0))
    print('  WINNER',best['kind'],best['verdict'],f"gain {best['gain']:+}",'| other',[ (k,v['verdict'],v['gain']) for k,v in res.items() if k!=best['kind']],flush=True)
    d=best['d']
    if best['verdict'] in ('good','veryGood') and d.get('changeSummary'):
        pr={'changes':d['changeSummary'],'basis':d.get('basis'),'verdict':d['verdict'],'simulation':False}
        c,j=t.post(f'/commit/build/party/{P}/applyBuildChanges',pr,tag='abapply'); print('  APPLY',best['kind'],c,(j.get('error') or {}).get('code'),flush=True)
        if c!=200: break
        if (best['after'] or 0)>=float(os.environ.get('ABSTOP','0.97')) and obj=='success': break
    else: break
print('calls',t.calls())
