import t,json
# elem.py: per PT1 character: class, offense elements (e.* != 1), resistances (r.* != 1), attack summary, HP-ish defense
c,j=t.gg('/read/build/character/status?characterId=1&characterId=2&characterId=3&characterId=4&characterId=5&characterId=6',tag='status')
for ch in j['data']['characters']:
    cs=ch['calculatedStatus']; st={s['key']:s['value'] for s in cs['stats']}
    cur=ch.get('current',{})
    e={k:v for k,v in st.items() if k.startswith('e.') and v!=1}; r={k:v for k,v in st.items() if k.startswith('r.') and v!=1}
    att=json.dumps(cs.get('attacks'))[:220]
    print(ch['characterId'],cur.get('mainClassId'),cur.get('subClassId'),cur.get('racesAndGender'),'e',e,'r',r,'pd',st.get('d.physical_defense'),'md',st.get('d.magical_defense'))
    print('   ',att)
print('calls',t.calls())
