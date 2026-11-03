import t
Y={"simulation":False,"confirmation":"yes"}
def cb(c,**k):
    r=t.post(f'/commit/build/character/{c}/changeBuild',{**Y,**k},tag='build'); print(c,r[0],str(r[1])[:150] if r[0]!=200 else '')
cb(1,mainClassId="lord",subClassId="lord")
cb(6,mainClassId="guardian",subClassId="guardian")
for c,g in ((2,"ursan/female"),(4,"ursan/male")): cb(c,racesAndGender=g,mainClassId="ninja",subClassId="ranger",lineage="abyssal_sea",predisposition="precise")
cb(3,mainClassId="ninja",subClassId="ranger",lineage="abyssal_sea",predisposition="precise")
cb(5,mainClassId="alchemist",subClassId="wizard",lineage="utopia",predisposition="introspective")
r=t.post('/commit/build/party/1',{"order":[6,1,4,2,3,5],"deityId":"mirage"},tag='party'); print(r[0],str(r[1])[:300])
