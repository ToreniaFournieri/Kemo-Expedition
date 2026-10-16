import subprocess,sys,os,json,re
# rp.py obj [dirs ignored] [tuneCids] : re-plan WITHOUT gaSearch: rounds of tuning(all cids) -> directedBuild free (apply good/veryGood); stop when rate >= GATH
# (ClaudeDir2 finding: tune/dir alternation acts like a hill climb: 12 -> 25 -> 44 -> 51 % at D6 boss gate)
H=os.path.dirname(os.path.abspath(__file__)); W=os.environ['BOKEMO_PLAY_DIR']
O=sys.argv[1] if len(sys.argv)>1 else 'success'; C=sys.argv[3] if len(sys.argv)>3 else os.environ.get('TUNE','4,5,2,3,1,6')
P=int(os.environ.get('PT','1')); GATH=float(os.environ.get('GATH','85')); ROUNDS=int(os.environ.get('ROUNDS','2'))
for r in range(ROUNDS):
    out=subprocess.run(['python3','tune.py',C,O,'1'],capture_output=True,text=True,cwd=H).stdout
    print(f'ROUND {r} tuning accepted',out.count('accepted=True'),flush=True)
    env=dict(os.environ); env['TB']=os.environ.get('TBB','200')
    out=subprocess.run(['python3','dir.py','free',O,'high'],capture_output=True,text=True,cwd=H,env=env).stdout
    l=[x for x in out.split('\n') if x.startswith('DIR') or x.startswith('APPLY')]; print(' '.join(x[:210] for x in l),flush=True)
    j=json.load(open(f'{W}/dir_last_{P}_free.json')); a=(j.get('verification') or {}).get('after') or 0
    if j.get('verdict') not in ('good','veryGood'): a=(j.get('verification') or {}).get('before') or 0
    if a*100>=GATH: print('rate',round(a*100,1),'>= GATH',flush=True); break
