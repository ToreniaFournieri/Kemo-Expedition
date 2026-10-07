import t,sys,st
# ms.py n seconds : n steps of `seconds` then one observation
n=int(sys.argv[1]); sec=int(sys.argv[2]) if len(sys.argv)>2 else 43200
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':sec},tag='el')
    if c!=200: print('ERR',c,j); break
print(j['data']['inGameTime'])
st.o()
