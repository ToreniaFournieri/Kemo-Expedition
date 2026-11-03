import t,json,sys,os,time
# tvar.py cid objective seed variants(comma list of names)  -- read-only paired tuning variants on one seed (nothing applied)
V={'default':{},
   'cand3':{'offenseElementCandidateCount':3,'defenseElementCandidateCount':3,'abilityCandidateCount':3},
   'trial':{'offenseElementTrialRuns':6,'defenseElementTrialRuns':10,'abilityTrialRuns':40},
   'q1000':{'quickRuns':1000},
   'q100':{'quickRuns':100},
   'low':{'minImprovement':0.03,'minGateImprovement':0.03},
   'big':{'quickRuns':1000,'finalTuningRuns':1000,'offenseElementCandidateCount':3,'defenseElementCandidateCount':3,'abilityCandidateCount':3,'offenseElementTrialRuns':6,'defenseElementTrialRuns':10,'abilityTrialRuns':40,'minImprovement':0.03,'minGateImprovement':0.03}}
cid=int(sys.argv[1]); obj=sys.argv[2]; seed=int(sys.argv[3]); names=sys.argv[4].split(',')
for n in names:
    body={'characterId':cid,'objective':obj,'seed':seed}; body.update(V[n])
    t0=time.time(); c,j=t.rpost('/read/build/character/stagedEquipmentTuning',body,tag='tunevar'); dt=time.time()-t0
    if c!=200: print(n,'ERR',c,json.dumps(j)[:300]); continue
    d=j['data']
    rec={'n':t.calls(),'var':n,'cid':cid,'body':body,'accepted':d.get('accepted'),'scoredBy':d.get('scoredBy'),'improvement':d.get('improvement'),'gain':d.get('gain'),'se':d.get('standardError'),
         'bottleneck':d.get('bottleneckRoom'),'tried':d.get('candidatesTried'),'counters':d.get('bottleneckCounters'),'runs':d.get('simulationRuns'),'sec':d.get('elapsedSeconds'),'real':round(dt,1),
         'before':d.get('before'),'after':d.get('after'),'nchanges':len(d.get('changeSummary',[])),'steps':{k:[(x.get('element') or x.get('resistance') or x.get('abilities'),x.get('improvement')) for x in d.get('steps',{}).get(k,[])] for k in d.get('steps',{})}}
    open(t.W+'/tunevar_log.jsonl','a').write(json.dumps(rec,ensure_ascii=False)+'\n')
    print(f"{n:8s} acc={d.get('accepted')} impr={d.get('improvement')} gain={d.get('gain')} se={d.get('standardError')} tried={json.dumps(d.get('candidatesTried'))} runs={d.get('simulationRuns')} sec={d.get('elapsedSeconds')} nch={rec['nchanges']}")
    print('    steps',json.dumps(rec['steps'],ensure_ascii=False)[:380])
    if os.environ.get('APPLY')=='1' and n==names[-1] and d.get('accepted') and d.get('buildResultId'):
        pt=1 if cid<100 else cid//100+1
        c2,j2=t.post(f'/commit/build/party/{pt}/applyBuildResult',{'buildResultId':d['buildResultId'],'simulation':False},tag='tuneapply'); print('  APPLY',c2,(j2.get('error') or {}).get('code'))
print('calls',t.calls())
