import t,sys,json
# usage: farm.py steps [sec] ; steps elapsed blocks, then print party level/xp + gates
n=int(sys.argv[1]); sec=int(sys.argv[2]) if len(sys.argv)>2 else 43200
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    if c!=200: print(c,j); break
igt=j['data']['inGameTime']
c,j=t.gg('/read/observation/party'); p=j['data']['partyInfo']['party']
c,k=t.gg('/read/observation/expedition')
pp=k['data']['expeditionInfo']['parties'][0]
print(igt[:16],'Lv',p['level'],p['experience'],'/',p['experienceToNext'],'cond',p.get('condition'),pp['disclosedOutcome'],'dest',pp['destination'],pp['depthLimit'],'chg',pp['chargeStock'],[(g['kind'],g.get('dungeonId'),g.get('floor'),g['current'],g['required']) for g in pp['clearGates']],'calls',t.calls())
