import t,json,sys,os,time
# ga.py objective effort [apply=1]
# env: CIDS=1,2,..  COMP=equipment,jewels  ORD=1 DEI=1 SCOPE=global|withinTargets|normal  SEED=  PT=1
#      TB=timeBudgetSeconds (default 100, desktop bridge cuts at 120 s)  EXTRA='{json gaParameters}'  MINV=good (good|veryGood|noisy)
P=int(os.environ.get('PT','1')); obj=sys.argv[1]; eff=sys.argv[2]; ap=len(sys.argv)<=3 or sys.argv[3]!='0'
W=t.W
cids=[int(x) for x in os.environ.get('CIDS',','.join(str(x+100*(P-1) if P>1 else x) for x in range(1,7))).split(',')]
comp=os.environ.get('COMP','equipment,jewels').split(',')
gp={'effort':eff,'timeBudgetSeconds':int(os.environ.get('TB','90'))}; gp.update(json.loads(os.environ.get('GAX','{}')))
if os.environ.get('SEED'): gp['seed']=int(os.environ['SEED'])
FRZ=[int(x) for x in os.environ.get('FREEZE','').split(',') if x]   # characters whose equipment must stay (keeps e.g. a breaker)
body={'targets':[{'characterId':c,'changeableComponents':{k:(k!='equipment' or c not in FRZ) for k in comp}} for c in cids],
      'considerOrderChange':os.environ.get('ORD','1')=='1','considerDeityChange':{'0':'none','1':'unoccupiedDeities','2':'allDeities'}[os.environ.get('DEI','1')],
      'considerItemsScope':os.environ.get('SCOPE','global'),'objective':obj,'gaParameters':gp}
t0=time.time(); c,j=t.rpost(f'/read/build/party/{P}/gaSearch',body,tag='ga'); dt=time.time()-t0
if c!=200: print('GA ERR',c,json.dumps(j)[:800],'real',round(dt,1)); sys.exit(1)
d=j['data']; json.dump(d,open(f'{W}/ga_last_{P}.json','w'),ensure_ascii=False,indent=1)
def ov(o): return o if isinstance(o,str) else json.dumps(o)[:300]
cs=d.get('changeSummary',[])
donors=[e['endpoint'].split('/')[3] for e in cs if e['endpoint'].endswith('removeEquipment') and int(e['endpoint'].split('/')[3]) not in cids]
open(f'{W}/ga_log.jsonl','a').write(json.dumps({'n':t.calls(),'obj':obj,'eff':eff,'body':body,'verdict':d.get('verdict'),'verification':d.get('verification'),
  'evaluations':d.get('evaluations'),'elapsedSeconds':d.get('elapsedSeconds'),'real':round(dt,1),'nchanges':len(cs),'donors':donors,
  'before':ov(d['forecast']['before']),'after':ov(d['forecast']['after'])})+'\n')
print('verdict',d.get('verdict'),'ver',json.dumps(d.get('verification')),'evals',d.get('evaluations'),'gaSec',d.get('elapsedSeconds'),'real',round(dt,1),'changes',len(cs),'donors',donors)
print(' before',ov(d['forecast']['before'])); print(' after ',ov(d['forecast']['after']))
ok={'veryGood'} if os.environ.get('MINV')=='veryGood' else ({'good','veryGood','noisy'} if os.environ.get('MINV')=='noisy' else {'good','veryGood'})
if ap and d.get('verdict') in ok and (d.get('verdict')!='noisy' or (d.get('verification') or {}).get('gain',0)>0):
    c,j=t.post(f'/commit/build/party/{P}/applyBuildChanges',dict({'changes':cs,'basis':d.get('basis'),'verdict':d.get('verdict'),'simulation':False},**({'confirmation':'yes'} if d.get('verdict') in ('noisy','worse') else {})),tag='gaapply')
    print('APPLY',c,(j.get('error') or {}).get('code'),json.dumps(j.get('data',{}).get('warnings')) if c==200 else json.dumps(j)[:500])
print('calls',t.calls())
