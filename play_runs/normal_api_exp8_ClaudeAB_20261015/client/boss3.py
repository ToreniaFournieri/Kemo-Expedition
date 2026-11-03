import subprocess,sys,os,re
# boss3.py : boss prep, A/B edition. meters -> tuning(bossDamage) -> ab bossDamage -> while route < 5 %: ab success with objectiveGuard bossDamage>=G (+ tuning success)
# exit 0 = READY (route >= 5 %), 1 = not ready
H=os.path.dirname(os.path.abspath(__file__)); env=dict(os.environ)
def run(args,e=None): return subprocess.run(['python3']+args,capture_output=True,text=True,cwd=H,env=e or env).stdout
def meter(o):
    out=run(['bs.py','300',o]); m=re.search(r'rate ([0-9.]+).*Success ([0-9.]+)%',out); print(' meter',o,out.strip()[:120],flush=True); return (float(m.group(1)),float(m.group(2))) if m else (0,0)
def ab(obj,og=None,tb='120',rounds='1'):
    e=dict(env)
    if og: e['OG']=og
    print(run(['ab.py',obj,tb,rounds],e).strip(),flush=True)
def tune(obj): print(run(['tune.py','4,2,3,5,1,6',obj,'1']).count('accepted=True'),'tunings accepted',obj,flush=True)
G=os.environ.get('G','0.7'); TB=os.environ.get('ABTB','120')
sh,sk=meter('bossDamage'); rr,rs=meter('success')
if rs<5:
    if sh<0.9: tune('bossDamage'); ab('bossDamage',None,TB,'1'); sh,sk=meter('bossDamage')
    for i in range(int(os.environ.get('PASSES','3'))):
        rr,rs=meter('success')
        if rs>=5: break
        ab('success','{"bossDamage":%s}'%G,TB,'1'); tune('success')
    rr,rs=meter('success'); sh,sk=meter('bossDamage')
print('READY' if rs>=5 else ('MARGINAL' if rs>=0.5 else 'NOTREADY'),rs,sk,flush=True); sys.exit(0 if rs>=0.5 else 1)
