import subprocess,sys,os,json,re,t
# rp.py obj [dirs=rapidRanged,magicBurst] [tuneCids=4,2,3,5] : class-layer re-plan (ClaudeDirected concept, build 47)
# 1) directedBuild per direction (read-only, 1 call each), apply the best one that verdicts good/veryGood
# 2) tuning-first (tw.py machinery) 3) big GA via tw.py when the success rate is still < GATH.
H=os.path.dirname(os.path.abspath(__file__)); W=os.environ['BOKEMO_PLAY_DIR']
O=sys.argv[1] if len(sys.argv)>1 else 'success'; DIRS=(sys.argv[2] if len(sys.argv)>2 else 'rapidRanged,magicBurst').split(','); C=sys.argv[3] if len(sys.argv)>3 else '4,2,3,5'
E=os.environ.get('GAE','big'); P=int(os.environ.get('PT','1')); GATH=float(os.environ.get('GATH','85'))
def rate(s):
    m=re.search(r'Success ([0-9.]+)%',s or ''); return float(m.group(1)) if m else None
best=None
for d in DIRS:
    if d=='-': break
    env=dict(os.environ); env.setdefault('TB','100')
    r=subprocess.run(['python3','dir.py',d,O,os.environ.get('DEFF','medium'),'0'],capture_output=True,text=True,cwd=H,env=env)
    out=r.stdout.strip().split('\n'); print(' '.join(l[:300] for l in out[:1]),flush=True)
    if r.returncode: print(r.stdout[-400:]); continue
    j=json.load(open(f'{W}/dir_last_{P}_{d}.json')); v=j.get('verification') or {}
    print('   composition',json.dumps(j.get('composition',{}).get('after')),'after',rate(j['forecast']['after'] if isinstance(j['forecast']['after'],str) else json.dumps(j['forecast']['after'])),flush=True)
    if j.get('verdict') in ('good','veryGood') and j.get('changeSummary') and (best is None or (v.get('after') or 0)>(best[1].get('verification') or {}).get('after',0)): best=(d,j)
if best:
    d,j=best; c,r=t.post(f'/commit/build/party/{P}/applyBuildChanges',{'changes':j['changeSummary'],'basis':j['basis'],'verdict':j['verdict'],'simulation':False},tag='dirapply')
    print('DIRAPPLY',d,c,(r.get('error') or {}).get('code'),flush=True)
else: print('DIR none applied',flush=True)
env=dict(os.environ); env['GATH']=str(GATH)
r=subprocess.run(['python3','tw.py',O,E,C],capture_output=True,text=True,cwd=H,env=env)
print(r.stdout.strip()[-1800:],flush=True)
