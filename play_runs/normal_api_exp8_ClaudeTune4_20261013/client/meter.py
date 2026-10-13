import t,json,sys
# meter.py objective [seed=777] [runs=1000]: exact rate of the current build via a gaSearch with no changeable component
o=sys.argv[1]; s=int(sys.argv[2]) if len(sys.argv)>2 else 777; n=int(sys.argv[3]) if len(sys.argv)>3 else 1000
c,j=t.rpost('/read/build/party/1/gaSearch',{'targets':[{'characterId':1,'changeableComponents':{}}],'objective':o,'considerOrderChange':False,'considerDeityChange':'none','gaParameters':{'seed':s,'verifyRuns':n}},tag='meter')
if c!=200: print('ERR',c,json.dumps(j)[:300]); sys.exit(1)
d=j['data']; print(o,'rate',round(d['verification']['before'],4),d['forecast']['before'])
