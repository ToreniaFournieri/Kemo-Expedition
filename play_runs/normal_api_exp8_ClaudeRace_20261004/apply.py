# apply a plan json (calls) after making sure PT1 chars are SEMI (not FULL); stops on first failure.
import t,json,sys
plan=json.load(open(sys.argv[1]))['calls']
semi=len(sys.argv)>2 and sys.argv[2]=='semi'
if semi:
    for cid in [1,2,3,4,5,6]:
        c,j=t.post(f'/commit/build/character/{cid}/autoEquipment',{'mode':'SEMI'},tag='auto'); print('semi',cid,c,(j.get('error') or {}).get('code'))
        if c!=200: sys.exit(1)
for x in plan:
    c,j=t.post(x['path'],x['params'],tag='build')
    if c!=200: print('FAIL',c,x,json.dumps(j.get('error'))[:300]); sys.exit(1)
print('applied',len(plan),'calls',t.calls())
