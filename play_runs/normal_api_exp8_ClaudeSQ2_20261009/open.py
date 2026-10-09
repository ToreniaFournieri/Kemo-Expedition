import t,json
print(t.signup()[0]); print(t.login()[0]); t.gg('/read/observation/overview')
B=lambda cid,**k: t.post(f'/commit/build/character/{cid}/changeBuild',dict(simulation=False,confirmation='yes',**k),tag='open')
r=[B(1,mainClassId='lord',subClassId='lord'),B(6,mainClassId='guardian',subClassId='guardian'),
B(2,racesAndGender='ursan/female',mainClassId='ninja',subClassId='ranger',lineage='abyssal_sea',predisposition='precise'),
B(4,racesAndGender='ursan/male',mainClassId='ninja',subClassId='ranger',lineage='abyssal_sea',predisposition='precise'),
B(3,mainClassId='ninja',subClassId='ranger',lineage='abyssal_sea',predisposition='precise'),
B(5,mainClassId='alchemist',subClassId='wizard',lineage='utopia',predisposition='introspective')]
print([x[0] for x in r])
print(t.post('/commit/build/party/1',{'order':[6,1,4,2,3,5],'deityId':'mirage'},tag='open')[0])
c,j=t.post('/commit/expedition/1/sortie',{'numberOfSortie':3},tag='sortie'); print(c,[s['battleOutcome'] for s in j['data']['sorties']] if c==200 else j)
