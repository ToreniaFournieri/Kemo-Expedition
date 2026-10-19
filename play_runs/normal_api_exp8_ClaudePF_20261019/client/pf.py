import t,json,sys
# pf.py P [dest|-] [offset|-] [deity|-] [depth|-] : side-party farm setup. Reads setting (1 call), then changeExpedition / party deity only when given.
P=int(sys.argv[1]); a=(sys.argv[2:]+['-']*4)[:4]; dest,off,dei,dep=a
c,j=t.gg(f'/read/expedition/{P}/setting',tag='pf-read'); d=j.get('data',j); print('SETTING',c,json.dumps(d,ensure_ascii=False)[:600])
ch={}
if dest!='-': ch.update({'destination':int(dest),'destinationMode':'fixed'})
if off!='-': ch['difficultyOffset']=int(off)
if dep!='-': ch['depthLimit']=dep
if ch:
    c,j=t.post(f'/commit/expedition/{P}/changeExpedition',ch,tag='pf'); print('CHANGE',ch,c,(j.get('error') or {}).get('code'),json.dumps(j.get('data',{}))[:300])
if dei!='-':
    c,j=t.post(f'/commit/build/party/{P}',{'deityId':dei},tag='pf'); print('DEITY',dei,c,(j.get('error') or {}).get('code'),json.dumps(j.get('error') or {})[:300])
open(t.W+'/notes.md','a').write(f'- pf PT{P} dest {dest} off {off} deity {dei} depth {dep} (calls {t.calls()})\n')
print('calls',t.calls())
