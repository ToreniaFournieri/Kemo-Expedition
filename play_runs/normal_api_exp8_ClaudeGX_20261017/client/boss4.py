import subprocess,sys,os,re
# boss4.py (v2, after D6): guarded boss prep, GA only. meter route -> if < READYP:
#   big bossDamage GA with objectiveGuard progress >= PGF x current progress (keeps the route alive)
#   -> if still < READYP: big success GA with objectiveGuard bossDamage >= BGF x current share
# exit 0 = attack (route >= MARGP), 1 = not ready
H=os.path.dirname(os.path.abspath(__file__)); env=dict(os.environ)
def run(args,e=None): return subprocess.run(['python3']+args,capture_output=True,text=True,cwd=H,env=e or env).stdout
def meter(o):
    out=run(['bs.py','500',o,'1','21']); m=re.search(r'rate ([0-9.]+)',out); print(' meter',o,out.strip()[:150],flush=True); return float(m.group(1)) if m else 0.0
def ga(obj,og=None):
    e=dict(env); e.update({'FORCEBIG':'1','ESKIP':'-1','BIGMAX':'1'})
    if og: e['OG']=og
    print('\n'.join(l[:220] for l in run(['replan.py','1',obj],e).strip().split('\n') if 'GAX' in l or 'APPLY' in l),flush=True)
READYP=float(os.environ.get('READYP','0.05')); MARGP=float(os.environ.get('MARGP','0.005'))
PGF=float(os.environ.get('PGF','0.85')); BGF=float(os.environ.get('BGF','0.85'))
rs=meter('success')
if rs<READYP:   # v3 (D7 recipe): unguarded bossDamage, then progress guarded by bossDamage >= BGF x share
    sh=meter('bossDamage')
    if sh<0.9: ga('bossDamage'); sh=meter('bossDamage')
    for i in range(int(os.environ.get('PASSES','2'))):
        ga('progress','{"bossDamage":%.3f}'%(BGF*sh)); rs=meter('success')
        if rs>=READYP: break
print('READY' if rs>=READYP else ('MARGINAL' if rs>=MARGP else 'NOTREADY'),rs,flush=True); sys.exit(0 if rs>=MARGP else 1)
