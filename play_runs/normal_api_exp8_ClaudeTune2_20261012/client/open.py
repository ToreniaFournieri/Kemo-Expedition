import t,json
print(t.signup()[0]); print(t.login()[0])
Y={'simulation':False,'confirmation':'yes'}
for cid,p in [(1,{'mainClassId':'lord','subClassId':'lord'}),(6,{'mainClassId':'guardian','subClassId':'guardian'}),
 (2,{'racesAndGender':'ursan/female','mainClassId':'ninja','subClassId':'ranger','lineage':'abyssal_sea','predisposition':'precise'}),
 (4,{'racesAndGender':'ursan/male','mainClassId':'ninja','subClassId':'ranger','lineage':'abyssal_sea','predisposition':'precise'}),
 (3,{'mainClassId':'ninja','subClassId':'ranger','lineage':'abyssal_sea','predisposition':'precise'}),
 (5,{'mainClassId':'alchemist','subClassId':'wizard','lineage':'utopia','predisposition':'introspective'})]:
    c,j=t.post(f'/commit/build/character/{cid}/changeBuild',{**p,**Y},tag='open'); print(cid,c,(j.get('error') or {}).get('code'))
c,j=t.post('/commit/build/party/1',{'order':[6,1,4,2,3,5],'deityId':'mirage'},tag='open'); print('party',c)
