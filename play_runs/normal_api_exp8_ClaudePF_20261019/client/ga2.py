import t,json,sys,os,time,random
# ga2.py P [effort=high] [obj=success]: side-party GA, inventory + own gear only (never strips PT1), deity kept, applies good/veryGood
P=int(sys.argv[1]); eff=sys.argv[2] if len(sys.argv)>2 else 'high'; obj=sys.argv[3] if len(sys.argv)>3 else 'success'
cids=[x+100*(P-1) for x in range(1,7)]
comp=['equipment','jewels','raceGender','mainClass','subClass','lineage','predisposition']
body={'targets':[{'characterId':c,'changeableComponents':{x:True for x in comp}} for c in cids],'considerOrderChange':True,'considerDeityChange':'none',
      'considerItemsScope':os.environ.get('SCOPE','withinTargets'),'objective':obj,'gaParameters':{'effort':eff,'seed':random.randint(1,2**31-1),'verifyRuns':300,'timeBudgetSeconds':int(os.environ.get('TB','150'))}}
t0=time.time(); c,j=t.rpost(f'/read/build/party/{P}/gaSearch',body,tag='ga-side'); dt=time.time()-t0
if c!=200: print('GA ERR',c,json.dumps(j)[:500]); sys.exit(1)
d=j['data']; json.dump(d,open(t.W+f'/ga2_last_{P}.json','w'),ensure_ascii=False); v=d.get('verification') or {}; cs=d.get('changeSummary') or []
print('GA PT',P,d.get('verdict'),v.get('before'),'->',v.get('after'),'real',round(dt),'nch',len(cs),str(d.get('forecast',{}).get('after'))[:160])
if d.get('verdict') in ('good','veryGood') and cs:
    c2,j2=t.post(f'/commit/build/party/{P}/applyBuildChanges',{'changes':cs,'basis':d.get('basis'),'verdict':d['verdict'],'simulation':False},tag='ga-side-apply')
    if c2==409 and 'build_basis_stale' in json.dumps(j2):
        c2,j2=t.post(f'/commit/build/party/{P}/applyBuildChanges',{'changes':cs,'verdict':d['verdict'],'simulation':False},tag='ga-side-apply2')
    print('APPLY',c2,(j2.get('error') or {}).get('code'),json.dumps(j2.get('error') or {})[:600])
open(t.W+'/notes.md','a').write(f"- ga2 PT{P} {obj} {d.get('verdict')} {v.get('before')}->{v.get('after')} (calls {t.calls()})\n")
print('calls',t.calls())
