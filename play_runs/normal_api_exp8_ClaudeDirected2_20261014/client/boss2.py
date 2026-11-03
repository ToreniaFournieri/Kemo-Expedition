import subprocess,sys,os,re,json
# boss2.py : boss prep without GA. tuning(bossDamage, all 6) -> directed free bossDamage -> if route < 5 %: directed free success with objectiveGuard bossDamage>=G (x2) + tuning(success)
# exit 0 = attack (route >= 5 %), exit 1 = not ready
H=os.path.dirname(os.path.abspath(__file__)); env=dict(os.environ)
def run(args,e=None):
    r=subprocess.run(['python3']+args,capture_output=True,text=True,cwd=H,env=e or env); return r.stdout
def meter(o):
    out=run(['bs.py','300',o]); m=re.search(r'rate ([0-9.]+).*Success ([0-9.]+)%',out); print(' meter',o,out.strip()[:140],flush=True); return (float(m.group(1)),float(m.group(2))) if m else (0,0)
def dirp(obj,og=None,tb='200'):
    e=dict(env); e['TB']=tb
    if og: e['OG']=og
    out=run(['dir.py','free',obj,'high'],e); l=[x for x in out.split('\n') if x.startswith('DIR') or x.startswith('APPLY')]; print(' '.join(x[:200] for x in l),flush=True)
def tune(obj): print(run(['tune.py','4,2,3,5,1,6',obj,'1']).count('accepted=True'),'tunings accepted',obj,flush=True)
G=os.environ.get('G','0.6')
sh,sk=meter('bossDamage'); rr,rs=meter('success')
if rs<5:
    if sh<0.9: tune('bossDamage'); dirp('bossDamage'); sh,sk=meter('bossDamage')
    for i in range(int(os.environ.get('PASSES','2'))):
        rr,rs=meter('success')
        if rs>=5: break
        dirp('success','{"bossDamage":%s}'%G,'250'); tune('success')
    rr,rs=meter('success'); sh,sk=meter('bossDamage')
print('READY' if rs>=5 else 'NOTREADY',rs,sk,flush=True); sys.exit(0 if rs>=5 else 1)
