import subprocess,sys,os,json,re
# tw.py [obj=success] [gaEffort=medium|big] [tuneCids=4,2,3,5] : TUNING-FIRST re-plan (ClaudeTune3 concept)
# 1) stagedEquipmentTuning on each attacker (applied when accepted)  2) if the success rate is still < GATH % (bossDamage: nothing accepted),
# full-component gaSearch (global scope)  3) after a GA, re-tune only when RETUNE=1 (counter test rooms).
H=os.path.dirname(os.path.abspath(__file__)); W=os.environ['BOKEMO_PLAY_DIR']
O=sys.argv[1] if len(sys.argv)>1 else 'success'; E=sys.argv[2] if len(sys.argv)>2 else 'medium'; C=sys.argv[3] if len(sys.argv)>3 else '4,2,3,5'
GATH=float(os.environ.get('GATH','50'))
def rate(s):
    m=re.search(r'Success ([0-9.]+)%',s or ''); return float(m.group(1)) if m else 0.0
def tune(tag):
    n0=sum(1 for _ in open(W+'/tune_log.jsonl')) if os.path.exists(W+'/tune_log.jsonl') else 0
    r=subprocess.run(['python3','tune.py',C,O,'1'],capture_output=True,text=True,cwd=H)
    out=[l for l in r.stdout.split('\n') if l and not l.startswith('  before')]
    print('\n'.join(out[:24]),flush=True)
    new=[json.loads(l) for l in list(open(W+'/tune_log.jsonl'))[n0:]] if os.path.exists(W+'/tune_log.jsonl') else []
    acc=[x for x in new if x.get('accepted')]
    last=(acc[-1]['after'] if acc else (new[-1]['before'] if new else ''))
    return len(acc),last
if C!='-':
    na,last=tune('first'); rt=rate(last)
    print(f'TW tune-first accepted {na}, rate now {last}',flush=True)
else: na,rt=0,0.0
if (rt is None and na==0) or (rt is not None and rt<GATH) or os.environ.get('FORCEGA')=='1':
    env=dict(os.environ); env['COMP']=env.get('COMP','equipment,jewels,mainClass,subClass,lineage,predisposition,raceGender')
    if E=='big': env['GAX']='{"populationSize":64,"generations":200,"quickRuns":300,"confirmRuns":1000,"timeBudgetSeconds":300}'; eff='high'
    else: env['GAX']=env.get('GAX','{}'); eff=E
    r=subprocess.run(['python3','ga.py',O,eff],capture_output=True,text=True,cwd=H,env=env)
    print('GA '+'\n  '.join(l[:240] for l in r.stdout.strip().split('\n')[:5]),flush=True)
    if os.environ.get('RETUNE')=='1' and C!='-': tune('retune')
