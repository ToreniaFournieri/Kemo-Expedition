import subprocess,json,os,sys
D=sys.argv[1]; tag=sys.argv[2]; N=sys.argv[3] if len(sys.argv)>3 else '60'
env=dict(os.environ,ORCA='5',DEITY=os.environ.get('DEITY','God of Fortification'),BOKEMO_PLAY_DIR=os.getcwd())
T='../ai_play_tools/twin'
import t
print(t.post('/commit/expedition/1/changeExpedition',{'depthLimit':'all'})[0]); t.export_save(tag+'.kemoz')
W={'eq':'fire:1,ice:1,thunder:1,none:1','none':'fire:0.3,ice:0.3,thunder:0.3,none:2','fire':'fire:2,ice:0.7,thunder:0.7,none:1','ice':'fire:0.7,ice:2,thunder:0.7,none:1','thu':'fire:0.7,ice:0.7,thunder:2,none:1','nothing':'none:0.1,fire:1,ice:1,thunder:1'}
res=[]
def run(cmd): return subprocess.run(cmd,env=env,capture_output=True,text=True).stdout
# HP plan once
run(['node',f'{T}/hpopt.mjs',tag+'.kemoz',f'plans/{tag}H.json','1,6'])
for k,w in W.items():
    pa=f'plans/{tag}A_{k}.json'
    run(['node',f'{T}/proxyopt.mjs',tag+'.kemoz',pa,'4,2,3,5',w])
    a=json.load(open(pa))['calls']; h=json.load(open(f'plans/{tag}H.json'))['calls']
    for nm,calls in (('A',a),('C',h+a)):
        pf=f'plans/{tag}_{k}{nm}.json'; json.dump({'calls':calls},open(pf,'w'))
        out=run(['node',f'{T}/dmgplan.mjs',tag+'.kemoz',D,N,pf]).strip().splitlines()[-1]
        r=json.loads(out); sc=r['kills']*r['reach']+0.01*r['dmg']*r['reach']; res.append((sc,pf,r,len(calls))); print(k,nm,out,len(calls),flush=True)
res.sort(key=lambda x:-x[0]); print('BEST',res[0][1],res[0][2],res[0][3])
