import t,st,sys,json
# usage: cyc.py cycles stepsec nsortie [dest]  -> sortie first (if nsortie>0), then step; observe at end
n=int(sys.argv[1]); sec=int(sys.argv[2]); ns=int(sys.argv[3]); first=(len(sys.argv)<5 or sys.argv[4]!='nofirst')
for i in range(n):
    if ns and (i>0 or first):
        c,j=t.post('/commit/expedition/1/sortie',{'numberOfSortie':ns},tag='sortie')
        print('sortie',c,[s['battleOutcome'] for s in j['data']['sorties']] if c==200 else j['error']['details'])
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    print(c,j['data']['inGameTime'][:16] if c==200 else j)
st.o()
