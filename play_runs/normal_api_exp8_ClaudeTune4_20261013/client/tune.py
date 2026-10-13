import t,json,sys,os,time
# tune.py cid[,cid..] objective [apply=1]   in-game read/build/character/stagedEquipmentTuning, then applyBuildResult
# env: EXTRA='{json tuning parameters}'  SEED=int  MODE=SEMI|OFF (applyBuildResult autoEquipmentMode)
# Characters are tuned one after another; each accepted result is applied before the next character is tuned
# (a tuning for any character of a party replaces that party's kept result).
W=t.W
cids=[int(x) for x in sys.argv[1].split(',')]; obj=sys.argv[2] if len(sys.argv)>2 else 'success'
ap=len(sys.argv)<=3 or sys.argv[3]!='0'
def pt(cid): return 1 if cid<100 else cid//100+1
def ov(o):
    if not isinstance(o,dict): return str(o)
    k=['total','Clear','Return','Draw','Retreat','Defeat','successRate','bossDamageShare']
    return json.dumps({x:o.get(x) for x in o if x in k or 'rate' in x.lower() or 'boss' in x.lower()},ensure_ascii=False)[:400]
for cid in cids:
    body={'characterId':cid,'objective':obj}; body.update(json.loads(os.environ.get('EXTRA','{}')))
    if os.environ.get('SEED'): body['seed']=int(os.environ['SEED'])
    t0=time.time(); c,j=t.rpost('/read/build/character/stagedEquipmentTuning',body,tag='tune'); dt=time.time()-t0
    if c!=200: print('TUNE ERR',cid,c,json.dumps(j)[:600],'real',round(dt,1)); continue
    d=j['data']; json.dump(d,open(f'{W}/tune_last_{cid}.json','w'),ensure_ascii=False,indent=1)
    st=d.get('steps',{})
    short={k:[(x.get('element') or x.get('resistance') or x.get('abilities'),x.get('improvement'),x.get('changes')) for x in st.get(k,[])] for k in st}
    rec={'n':t.calls(),'cid':cid,'body':body,'accepted':d.get('accepted'),'scoredBy':d.get('scoredBy'),'improvement':d.get('improvement'),'gain':d.get('gain'),'se':d.get('standardError'),
         'bottleneck':d.get('bottleneckRoom'),'tried':d.get('candidatesTried'),'counters':d.get('bottleneckCounters'),'steps':short,'nchanges':len(d.get('changeSummary',[])),'runs':d.get('simulationRuns'),
         'sec':d.get('elapsedSeconds'),'real':round(dt,1),'seed':d.get('seed'),'before':d.get('before'),'after':d.get('after'),'revision':d.get('revision')}
    open(f'{W}/tune_log.jsonl','a').write(json.dumps(rec,ensure_ascii=False)+'\n')
    print(f"TUNE cid {cid} {obj}/{d.get('scoredBy')} accepted={d.get('accepted')} impr={d.get('improvement')} gain={d.get('gain')} se={d.get('standardError')} bottleneck={d.get('bottleneckRoom')} tried={json.dumps(d.get('candidatesTried'))} runs={d.get('simulationRuns')} sec={d.get('elapsedSeconds')} seed={d.get('seed')}")
    if d.get('bottleneckCounters'): print('  counters',json.dumps(d.get('bottleneckCounters'),ensure_ascii=False)[:400])
    print('  before',ov(d.get('before'))); print('  after ',ov(d.get('after')))
    for k,v in short.items():
        if v: print('  ',k,json.dumps(v,ensure_ascii=False)[:500])
    if ap and d.get('accepted') and d.get('buildResultId'):
        p={'buildResultId':d['buildResultId'],'simulation':False}
        if os.environ.get('MODE'): p['autoEquipmentMode']=os.environ['MODE']
        c2,j2=t.post(f'/commit/build/party/{pt(cid)}/applyBuildResult',p,tag='tuneapply')
        print('  APPLY',c2,(j2.get('error') or {}).get('code'),len((j2.get('data') or {}).get('applied') or []),'entries',json.dumps(j2.get('data',{}).get('warnings')) if c2==200 else json.dumps(j2)[:400])
    import re as _re
    _m=_re.search(r'Success ([0-9.]+)%',str(d.get('before') or ''))
    if obj=='success' and not d.get('accepted') and _m and float(_m.group(1))>=float(os.environ.get('STOPHI','95')):
        print('  STOPHI: route already',_m.group(1),'% -> skip remaining tunings'); break
print('calls',t.calls())
