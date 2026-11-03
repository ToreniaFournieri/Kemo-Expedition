import t,json,sys
# usage: sq.py [all]  compact (sideQuest of every party) ; 'all' also reads sideQuestStatistics of parties 1..6
c,j=t.gg('/read/observation/compact',tag='compact')
d=j['data']; print(d['globalInfo']['inGameTime'][:16],[(p['party']['partyNumber'],p['party']['level'],p['sideQuest'],p['clearGate']) for p in d['partyInfo']])
if len(sys.argv)>1:
    for n in range(1,7):
        c,j=t.gg(f'/read/observation/party?partyNumber={n}',tag='party-sq')
        if c!=200: print(n,c,j.get('error')); continue
        p=j['data']['partyInfo']['party']; print('SQSTAT PT%d'%n,p.get('sideQuestStatistics'),p.get('statistics'))
