import t,sys,st
n=int(sys.argv[1])
for i in range(n):
    c,j=t.post('/commit/expedition/1/sortie',{},tag='sortie')
    if c!=200: print(c,j['error']['details']); break
    print(j['data']['outcome'])
    if j['data']['outcome'] in ('Defeat','Draw','Retreat'): break
st.o()
