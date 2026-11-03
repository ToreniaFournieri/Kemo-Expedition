import subprocess,sys,os,re,json
# boss4.py v4 (SS, build 56): meter route success; if < READYP:
#   unguarded bossDamage GA (high) if share < 0.9 -> success GA (effort max, successSignal auto) guarded bossDamage >= BGF x share,
#   seeded with the pre-boss route build (SEEDROUTE). If the route is still < MARGP: unguarded success GA seeded with the route build.
# exit 0 = attack (route >= MARGP), 1 = not ready
import t
H=os.path.dirname(os.path.abspath(__file__)); env=dict(os.environ); W=t.W
def run(args,e=None): return subprocess.run(['python3']+args,capture_output=True,text=True,cwd=H,env=e or env).stdout
def meter(o):
    out=run(['bs.py','500',o,'1','21']); m=re.search(r'rate ([0-9.]+)',out); print(' meter',o,out.strip()[:150],flush=True); return float(m.group(1)) if m else 0.0
def snap_route():
    c,j=t.gg('/read/observation/party',tag='snap')
    if c!=200: return None
    try:
        p=j['data']['partyInfo']['party']; chars=[]
        for x in p['characters']:
            c={'characterId':x['characterId'],'mainClassId':x['mainClassId'],'subClassId':x['subClassId']}
            if not x.get('isUnique'):
                c.update({'racesAndGender':f"{x['raceId']}/{x['gender']}",'lineage':x['lineageId']})
                if x.get('predispositionId') not in (None,'none'): c['predisposition']=x['predispositionId']
            chars.append(c)
        b={'label':'route','characters':chars,'order':p['order'],'deityId':p['deityId']}
        json.dump(b,open(W+'/route_seed.json','w')); return W+'/route_seed.json'
    except Exception as ex: print(' snap fail',ex,str(j)[:300]); return None
def ga(obj,og=None,big=True,seedroute=None):
    e=dict(env); e.update({'ESKIP':'-1','BIGMAX':'1'}); e['FORCEBIG']='1' if big else '0'; e['EBIG']='-1' if big else '1e12'
    if og: e['OG']=og
    if seedroute: e['SEEDROUTE']=seedroute
    print('\n'.join(l[:300] for l in run(['replan.py','1',obj],e).strip().split('\n') if 'GA' in l or 'APPLY' in l),flush=True)
READYP=float(os.environ.get('READYP','0.05')); MARGP=float(os.environ.get('MARGP','0.005')); BGF=float(os.environ.get('BGF','0.85'))
rs=meter('success')
if rs<READYP:
    sr=snap_route(); print(' route seed',sr,flush=True)
    sh=meter('bossDamage')
    if sh<0.9: ga('bossDamage',big=False); sh=meter('bossDamage')
    for i in range(int(os.environ.get('PASSES','2'))):
        ga(os.environ.get('GOBJ','progress'),'{"bossDamage":%.3f}'%(BGF*sh),seedroute=sr); rs=meter('success')
        if rs>=READYP: break
    if rs<MARGP:
        ga('progress',seedroute=sr); rs=meter('success')
print('READY' if rs>=READYP else ('MARGINAL' if rs>=MARGP else 'NOTREADY'),rs,flush=True); sys.exit(0 if rs>=MARGP else 1)
