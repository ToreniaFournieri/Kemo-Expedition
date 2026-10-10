import t,json,sys,os,time
# ga.py objective effort [apply=1] ; env CIDS=1,2,..  COMP=equipment,jewels  ORD=0/1 DEI=0/1 SEED= PT=1 EXTRA='{json gaParameters}'
P=int(os.environ.get('PT','1')); obj=sys.argv[1]; eff=sys.argv[2]; ap=len(sys.argv)<=3 or sys.argv[3]!='0'
cids=[int(x) for x in os.environ.get('CIDS','1,2,3,4,5,6').split(',')]
comp=os.environ.get('COMP','equipment,jewels').split(',')
gp={'effort':eff}; gp.update(json.loads(os.environ.get('EXTRA','{}')))
if os.environ.get('SEED'): gp['seed']=int(os.environ['SEED'])
body={'targets':[{'characterId':c,'changeableComponents':{k:True for k in comp}} for c in cids],
      'considerOrderChange':os.environ.get('ORD','0')=='1','considerDeityChange':os.environ.get('DEI','0')=='1','objective':obj,'gaParameters':gp}
t0=time.time(); c,j=t.rpost(f'/read/build/party/{P}/gaSearch',body,tag='ga'); dt=time.time()-t0
if c!=200: print('GA ERR',c,json.dumps(j)[:800]); sys.exit(1)
d=j['data']; json.dump(d,open(f'../ga_last_{P}.json','w'),ensure_ascii=False,indent=1)
open('../ga_log.jsonl','a').write(json.dumps({'n':t.calls(),'obj':obj,'eff':eff,'body':body,'verdict':d.get('verdict'),'verification':d.get('verification'),'evaluations':d.get('evaluations'),'elapsedSeconds':d.get('elapsedSeconds'),'real':round(dt,1),'nchanges':len(d.get('changeSummary',[]))})+'\n')
def ov(o): return o
print('verdict',d.get('verdict'),'ver',d.get('verification'),'evals',d.get('evaluations'),'gaSec',d.get('elapsedSeconds'),'real',round(dt,1),'changes',len(d.get('changeSummary',[])))
print(' before',json.dumps(ov(d['forecast']['before']))[:400]); print(' after ',json.dumps(ov(d['forecast']['after']))[:400])
if ap and d.get('verdict') in ('good','veryGood'):
    c,j=t.post(f'/commit/build/party/{P}/applyGaResult',{'gaResultId':d['gaResultId'],'simulation':False},tag='gaapply')
    print('APPLY',c,(j.get('error') or {}).get('code'),json.dumps(j.get('data',{}).get('warnings')) if c==200 else json.dumps(j)[:500])
print('calls',t.calls())
