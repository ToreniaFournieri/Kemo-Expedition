import t,st,sys,json
n=int(sys.argv[1]); sec=int(sys.argv[2]); sort=int(sys.argv[3])
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    if c!=200: print('ERR',c,j); break
    out=[]
    for k in range(sort):
        c2,j2=t.post('/commit/expedition/1/sortie',{},tag='sortie')
        if c2!=200: out.append(j2['error']['details'].get('reason')); break
        out.append(j2['data']['outcome'])
        if j2['data']['outcome'] in ('Defeat','Draw','Retreat'): break
    print(j['data']['inGameTime'][5:16],out)
st.o()
