import t,json,sys
# probe.py dest depth1 [depth2 ...]: for each depth set it (1 call) and run simulationRun 300 (1 call): success, EXP/run, drops/run
D=int(sys.argv[1])
for dl in sys.argv[2:]:
    c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':D,'destinationMode':'fixed','depthLimit':dl},tag='dest')
    if c!=200: print(dl,'DEST ERR',c,(j.get('error') or {}).get('code')); continue
    c,j=t.rpost('/read/expedition/1/simulationRun',{'numberOfRun':300,'seed':5},tag='probe')
    d=j['data']; pr=d['expectedPerRun']
    print(dl,'|',d['overview'],'| exp/run',round(pr['experience']),'drops',pr.get('itemDrops'),'| reach',d['depthLimit'].get('reachable'))
print('calls',t.calls())
