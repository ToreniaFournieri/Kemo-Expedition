import t,json,sys,os,time
# dir.py direction objective effort [apply=1]   in-game read/build/party/{p}/directedBuild, then applyBuildChanges (build 47)
# env: PT=1 CIDS=1,..  COMP=raceGender,mainClass,subClass (default; + lineage,predisposition,uniqueCharacter) AER=currentSetting|FULL|SEMI|OFF
#      ORD=1 DEI=0|1|2 SCOPE=normal|withinTargets|global  SEED=  TB=timeBudgetSeconds  TPX='{json tuningParameters}'  MINV=good|veryGood|noisy
P=int(os.environ.get('PT','1')); direction=sys.argv[1]; obj=sys.argv[2]; eff=sys.argv[3]; ap=len(sys.argv)<=4 or sys.argv[4]!='0'
W=t.W
cids=[int(x) for x in os.environ.get('CIDS',','.join(str(x+100*(P-1) if P>1 else x) for x in range(1,7))).split(',')]
comp=os.environ.get('DCOMP','raceGender,mainClass,subClass').split(',')
allc=['uniqueCharacter','raceGender','mainClass','subClass','lineage','predisposition']
tp={'effort':eff,'timeBudgetSeconds':int(os.environ.get('TB','120'))}; tp.update(json.loads(os.environ.get('TPX','{}')))
if os.environ.get('SEED'): tp['seed']=int(os.environ['SEED'])
body={'direction':direction,'targets':[{'characterId':c,'changeableComponents':dict({k:(k in comp) for k in allc},autoEquipmentRun=os.environ.get('AER','currentSetting'))} for c in cids],
      'autoEquipmentScope':os.environ.get('AES','changedOnly'),'directionStrictness':os.environ.get('DS','strict'),'considerOrderChange':os.environ.get('ORD','1')=='1','considerDeityChange':{'0':'none','1':'unoccupiedDeities','2':'allDeities'}[os.environ.get('DDEI',os.environ.get('DEI','1'))],
      **({'objectiveGuard':json.loads(os.environ['OG'])} if os.environ.get('OG') else {}),'considerItemsScope':os.environ.get('SCOPE','global'),'objective':obj,'tuningParameters':tp}
t0=time.time(); c,j=t.rpost(f'/read/build/party/{P}/directedBuild',body,tag='dir'); dt=time.time()-t0
if c!=200: print('DIR ERR',c,json.dumps(j)[:800],'real',round(dt,1)); sys.exit(1)
d=j['data']; json.dump(d,open(f'{W}/dir_last_{P}.json','w'),ensure_ascii=False,indent=1); json.dump(d,open(f'{W}/dir_last_{P}_{direction}.json','w'))
def ov(o): return o if isinstance(o,str) else json.dumps(o)[:300]
cs=d.get('changeSummary',[])
open(f'{W}/dir_log.jsonl','a').write(json.dumps({'n':t.calls(),'direction':direction,'obj':obj,'eff':eff,'body':body,'verdict':d.get('verdict'),'verification':d.get('verification'),
  'composition':d.get('composition'),'steps':d.get('steps'),'evaluations':d.get('evaluations'),'elapsedSeconds':d.get('elapsedSeconds'),'real':round(dt,1),'nchanges':len(cs),
  'before':ov(d['forecast']['before']),'after':ov(d['forecast']['after'])},ensure_ascii=False)+'\n')
print('DIR',direction,'verdict',d.get('verdict'),'ver',json.dumps(d.get('verification')),'evals',d.get('evaluations'),'sec',d.get('elapsedSeconds'),'real',round(dt,1),'changes',len(cs))
print(' composition',json.dumps(d.get('composition')),'steps',json.dumps(d.get('steps'),ensure_ascii=False)[:600])
print(' before',ov(d['forecast']['before'])); print(' after ',ov(d['forecast']['after']))
ok={'veryGood'} if os.environ.get('MINV')=='veryGood' else ({'good','veryGood','noisy'} if os.environ.get('MINV')=='noisy' else {'good','veryGood'})
if ap and d.get('verdict') in ok and cs:
    p={'changes':cs,'basis':d.get('basis'),'verdict':d.get('verdict'),'simulation':False}
    if d.get('verdict') in ('noisy','worse'): p['confirmation']='yes'
    c,j=t.post(f'/commit/build/party/{P}/applyBuildChanges',p,tag='dirapply')
    print('APPLY',c,(j.get('error') or {}).get('code'),json.dumps(j.get('data',{}).get('warnings')) if c==200 else json.dumps(j)[:600])
print('calls',t.calls())
