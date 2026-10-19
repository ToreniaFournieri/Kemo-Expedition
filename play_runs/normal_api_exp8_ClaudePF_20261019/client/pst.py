import t,json
# pst.py: one read of all parties (level, dest, hp, last outcome, first gate)
c,j=t.gg('/read/observation/expedition',tag='pst')
for p in j['data']['expeditionInfo']['parties']:
    g=[(x['kind'],x.get('dungeonId'),x.get('floor'),x['current'],x['required']) for x in p.get('clearGates',[])][:2]
    print('PT',p.get('partyNumber'),'lv',p.get('level'),'xp%',p.get('experienceRatio'),'dest',p.get('destination'),p.get('depthLimit'),'hp',p.get('currentHp'),'/',p.get('maximumHp'),'last',p.get('disclosedOutcome'),g)
print('calls',t.calls())
