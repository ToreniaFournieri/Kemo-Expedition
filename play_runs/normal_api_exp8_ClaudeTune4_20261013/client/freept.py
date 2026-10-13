import t,json,sys
# freept.py P: strip every character of party P (removeAllEquipment -> SEMI with nothing) and set its deity to none
P=int(sys.argv[1])
c,j=t.gg(f'/read/build/party/{P}')
if c!=200: print('no party',P,c,(j.get('error') or {}).get('code')); sys.exit()
cur=j['data']['current']; print('PT',P,cur)
for cid in cur['order']:
    c,j=t.post(f'/commit/build/character/{cid}/removeAllEquipment',{},tag='strip'); print(' ',cid,c,(j.get('error') or {}).get('code'))
if cur.get('deityId') not in (None,'none'):
    c,j=t.post(f'/commit/build/party/{P}',{'deityId':'none'},tag='deity'); print(' deity none',c)
print('calls',t.calls())
