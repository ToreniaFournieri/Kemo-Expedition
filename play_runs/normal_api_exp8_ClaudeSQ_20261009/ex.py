import t
c,j=t.gg('/read/observation/party?partyNumber=1',tag='exp'); p=j['data']['partyInfo']['party']; print('lv',p['level'],p['experience'],'/',p['experienceToNext'],'hp',p['maxHp'])
