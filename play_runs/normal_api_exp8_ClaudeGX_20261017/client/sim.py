import t,json,sys
# sim.py [runs=300] [P=1]: simulationRun overview + rooms with any early end
n=int(sys.argv[1]) if len(sys.argv)>1 else 300; P=int(sys.argv[2]) if len(sys.argv)>2 else 1
c,j=t.rpost(f'/read/expedition/{P}/simulationRun',{'numberOfRun':n},tag='sim')
if c!=200: print('SIM ERR',c,json.dumps(j)[:400]); sys.exit(1)
d=j['data']; print(d['overview'],'| perRun',d['expectedPerRun'],'| depth',d['depthLimit'])
cols=d['rooms']['columns']
for r in d['rooms']['rows']:
    row=dict(zip(cols,r))
    if row['draw']+row['retreat']+row['defeat']>0: print('  ',row['floorRoom'],'reached',n-row['notReached'],'D',row['draw'],'T',row['retreat'],'X',row['defeat'])
print('calls',t.calls())
