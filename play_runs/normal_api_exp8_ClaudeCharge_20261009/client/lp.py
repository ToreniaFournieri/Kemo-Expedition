import t,sys,json
# lp.py S k n [obs]  : n x (elapsed S ; sortie k). stops when a sortie returns Clear. obs=1 -> compact read at end
S=int(sys.argv[1]); k=int(sys.argv[2]); n=int(sys.argv[3]); obs=len(sys.argv)>4 and sys.argv[4]=='1'
for i in range(n):
    c,j=t.post('/commit/progress/elapsed',{'elapsedSeconds':S},tag='el')
    igt=j['data']['inGameTime'][:16] if c==200 else j
    if k>0:
        c2,j2=t.post('/commit/expedition/1/sortie',{'numberOfSortie':k},tag='sortie')
        if c2==200: outs=[s['battleOutcome'] for s in j2['data']['sorties']]; print(igt,'sortie',j2['data'].get('summary'),outs,flush=True)
        else: outs=[]; print(igt,'sortie ERR',c2,(j2.get('error') or {}).get('code'),(j2.get('error') or {}).get('details'),flush=True)
        if 'Clear' in outs: print('CLEAR seen'); break
    else: print(igt,flush=True)
if obs:
    c,j=t.gg('/read/observation/compact',tag='compact'); d=j.get('data',{})
    print(json.dumps(d)[:1500])
print('calls',t.calls())
