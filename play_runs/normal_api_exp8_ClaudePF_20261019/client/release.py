import t,json,os
# release.py: free the unique characters of every unlocked side party (PT2-PT6) so PT1's GA (uniqueCharacter: true) can pick them.
# 1 read + 1 changeBuild per unique. Writes unique_seeds.json: one seed per (newly freed unique, PT1 non-support member).
W=t.W; U={101:'leonard',102:'orca',203:'nox',204:'luna',301:'mishka',302:'ptitsa',401:'hagakure',402:'sougaha',503:'finn',505:'merle'}
SUPPORT={'guardian','pilgrim','lord'}
c,j=t.gg('/read/observation/party',tag='rel-read')
pi=j['data']['partyInfo']; freed=[]
for p in pi['parties']:
    if p['partyNumber']==1: continue
    for ch in p['characters']:
        cid=ch['characterId']
        if ch.get('isUnique') and cid in U:
            c2,j2=t.post(f'/commit/build/character/{cid}/changeBuild',{'uniqueSelection':'none','simulation':False,'confirmation':'yes'},tag='release')
            print('release PT',p['partyNumber'],cid,U[cid],c2,(j2.get('error') or {}).get('code'),flush=True)
            if c2==200: freed.append(U[cid])
pt1=pi['party']['characters'] if pi['party']['partyNumber']==1 else []
att=[x['characterId'] for x in pt1 if x['mainClassId'] not in SUPPORT]
seeds=[{'label':f'{u}@{c}','characters':[{'characterId':c,'uniqueSelection':u}]} for u in freed for c in att]
if seeds:
    json.dump({'freed':freed,'seeds':seeds[:16],'uses':0},open(W+'/unique_seeds.json','w'))
open(W+'/notes.md','a').write(f'- release: freed {freed} (calls {t.calls()}), seeds on {att}\n')
print('freed',freed,'seeds',len(seeds),'calls',t.calls())
