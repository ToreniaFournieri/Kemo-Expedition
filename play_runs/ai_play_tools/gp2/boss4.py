import t,os,sys
import gate,ga2
# boss4.py : boss prep after BOSS OPEN (GP2). exit 0 = attack (READY / MARGINAL), 1 = NOTREADY.
#  0. meters: route success (whole route incl. the boss), boss-only bossDamage, route progress (3 calls)
#  1. route success >= READY already -> attack with the stage build (GP D8: the route build killed the boss in the stage loop)
#  2. boss share < SHMIN -> GA bossDamage with objectiveGuard {progress: PG x current}, so the boss build keeps the route
#     (GP: an unguarded bossDamage GA left the route at 0 %, and the following success GAs had no signal)
#  3. up to PASSES: GA success with objectiveGuard {bossDamage: G}; `big` while the route is under BIGBELOW, stop after 2 misses
# No tuning (GP D4/D7 boss phases: 162 tuning calls for 6 accepts).
# env: READY=0.05 SHMIN=0.9 PG=0.95 G=0.6 PASSES=4 BIGBELOW=0.02 ABTB=200 TBBIG=300
READY=float(os.environ.get('READY','0.05')); SHMIN=float(os.environ.get('SHMIN','0.9')); PG=float(os.environ.get('PG','0.95'))
G=float(os.environ.get('G','0.6')); PASSES=int(os.environ.get('PASSES','4')); BIGBELOW=float(os.environ.get('BIGBELOW','0.02'))
ABTB=int(os.environ.get('ABTB','200')); TBBIG=int(os.environ.get('TBBIG','300'))
def meters(prog=False):
    _,rs,ov=gate.meter('success'); sh,_,_=gate.meter('bossDamage')
    pg=gate.meter('progress')[0] if prog else None
    print(f' METER route {rs} boss {sh and round(sh,4)} progress {pg and round(pg,4)} | {ov}',flush=True); return rs or 0,sh or 0,pg
rs,sh,pg=meters(True)
if rs<READY:
    if sh<SHMIN:
        og={'progress':round(PG*(pg or 0),3)} if pg else None
        ga2.search('bossDamage',ABTB,'high',og=og); rs,sh,_=meters()
    miss=0
    for i in range(PASSES):
        if rs>=READY: break
        r=ga2.search('success',TBBIG if rs<BIGBELOW else ABTB,'big' if rs<BIGBELOW else 'high',og={'bossDamage':G})
        if r and r['applied']: miss=0; rs,sh,_=meters()
        else:
            miss+=1
            if miss>=2: break
v='READY' if rs>=READY else ('MARGINAL' if rs>=0.005 else 'NOTREADY')
print(v,round(rs*100,2),round(sh*100,1),'expected attack runs',gate.fmt(gate.expected_runs(rs,1)),'calls',t.calls(),flush=True)
sys.exit(0 if rs>=0.005 else 1)
