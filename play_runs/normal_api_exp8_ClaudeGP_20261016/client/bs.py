import t,json,sys
# bs.py [runs=300] [obj=bossDamage] [P=1] [seed=5]: boss-only meter (simulationRun objective/seed, does not touch kept result)
n=int(sys.argv[1]) if len(sys.argv)>1 else 300; o=sys.argv[2] if len(sys.argv)>2 else 'bossDamage'; P=int(sys.argv[3]) if len(sys.argv)>3 else 1; s=int(sys.argv[4]) if len(sys.argv)>4 else 5
c,j=t.rpost(f'/read/expedition/{P}/simulationRun',{'numberOfRun':n,'objective':o,'seed':s},tag='bs')
if c!=200: print('ERR',c,json.dumps(j)[:300]); sys.exit(1)
d=j['data']; print(o,'rate',round(d['rate'],4),'se',round(d['standardError'],4),d['overview'])
