import t,sys,json,st
# sb.py N : N sorties, print outcome each
n=int(sys.argv[1])
for i in range(n):
    c,j=t.post('/commit/expedition/1/sortie',{},tag='sortie')
    print(c,(j['data']['outcome'],len(j['data']['rewards'])) if c==200 else j.get('error'))
    if c!=200 or j['data']['outcome']not in ('Clear','Return'): break
st.o()
