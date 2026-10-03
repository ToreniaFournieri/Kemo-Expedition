import json,sys,uuid,os,urllib.request,urllib.error,time
W=os.environ.get('BOKEMO_PLAY_DIR',os.path.dirname(os.path.abspath(__file__)))  # workspace with desc.json (written by scripts/run-api-play-session.cjs), tstate.json, batch_calls.jsonl
D=json.load(open(W+'/desc.json'))
SF=W+'/tstate.json'
REC=W+'/batch_calls.jsonl'   # replayable record: every API call with input + duration
USER=os.environ.get('BOKEMO_PLAY_USER','ClaudeS55Exp8')
def st(): return json.load(open(SF)) if os.path.exists(SF) else {'n':0}
def sv(s): json.dump(s,open(SF,'w'))
def raw(method,path,body=None,sess=True,tag='',params=None):
    s=st(); s['n']=s.get('n',0)+1
    h={'Authorization':'Bearer '+D['token'],'Content-Type':'application/json'}
    if sess and s.get('session'):
        h['X-BoKemo-Session']=s['session']; h['X-BoKemo-Control-Lease']=s['lease']
    r=urllib.request.Request(D['endpoint']+path,method=method,headers=h,data=json.dumps(body).encode() if body is not None else None)
    t0=time.time()
    try:
        with urllib.request.urlopen(r,timeout=180) as f: c,j=f.status,json.loads(f.read())
    except urllib.error.HTTPError as e:
        c,j=e.code,json.loads(e.read() or b'{}')
    ms=round((time.time()-t0)*1000)
    if isinstance(j,dict) and isinstance(j.get('revision'),int): s['rev']=j['revision']
    sv(s)
    d=j.get('data') if isinstance(j,dict) else None
    rec={'n':s['n'],'method':method,'path':path,'parameters':params if params is not None else (body if method=='POST' and not (isinstance(body,dict) and 'idempotencyKey' in body) else None),
         'status':c,'ms':ms,'tag':tag,'igt':(d or {}).get('inGameTime') if isinstance(d,dict) else None,
         'err':(j.get('error') or {}).get('code') if isinstance(j,dict) else None}
    if isinstance(body,dict) and 'idempotencyKey' in body: rec['parameters']=body.get('parameters')
    open(REC,'a').write(json.dumps(rec,ensure_ascii=False)+'\n')
    return c,j
def get(path,tag=''): return raw('GET',path,tag=tag)
def signup(name=USER,mode='normal'):
    return raw('POST','/fundamental/signUp',{'userId':name,'environment':'prod','gameMode':mode,'language':'en'},False)
def login(name=USER):
    c,j=raw('POST','/fundamental/logIn',{'userId':name,'environment':'prod','gameMode':'normal'},False,tag='login')
    d=j.get('data',{})
    if 'sessionToken' in d:
        s=st(); s['session']=d['sessionToken']; s['lease']=d['controlLeaseToken']; s['user']=name; sv(s)
    return c,j
def _retry_lease(c,j):
    return c==401 and (j.get('error') or {}).get('code')=='control_lease_expired'
def post(path,params=None,tag=''):
    s=st(); r=s.get('rev')
    if r is None:
        get('/read/observation/overview'); r=st().get('rev')
    for attempt in range(4):
        c,j=raw('POST',path,{'expectedRevision':r,'idempotencyKey':str(uuid.uuid4()),'parameters':params or {}},tag=tag)
        e=j.get('error') or {}
        if c==409 and e.get('code')=='stale_revision':
            r=(e.get('details') or {}).get('currentRevision')
            if r is None: get('/read/observation/overview'); r=st().get('rev')
            continue
        if _retry_lease(c,j): login(); continue
        return c,j
    return c,j
def rpost(path,body=None,tag=''):   # READ-style POST (simulationRun): raw body
    c,j=raw('POST',path,body if body is not None else {},tag=tag,params=body if body is not None else {})
    if _retry_lease(c,j): login(); c,j=raw('POST',path,body if body is not None else {},tag=tag,params=body if body is not None else {})
    return c,j
def gg(path,tag=''):
    c,j=get(path,tag)
    if _retry_lease(c,j): login(); c,j=get(path,tag)
    return c,j
def calls(): return st().get('n',0)
if __name__=='__main__':
    m=sys.argv[1]
    if m=='N': print(calls()); sys.exit()
    p=sys.argv[2]; b=json.loads(sys.argv[3]) if len(sys.argv)>3 else None
    if m=='GET': c,j=gg(p)
    elif m=='RPOST': c,j=rpost(p,b)
    else: c,j=post(p,b)
    print(c); print(json.dumps(j,ensure_ascii=False)[:int(os.environ.get('N','6000'))])
    print('calls',calls())

def export_save(path):
    """backup/export -> binary kemoz save written to path (1 API call)."""
    s=st(); s['n']=s.get('n',0)+1
    body={'expectedRevision':s.get('rev'),'idempotencyKey':str(uuid.uuid4()),'parameters':{}}
    h={'Authorization':'Bearer '+D['token'],'Content-Type':'application/json','X-BoKemo-Session':s['session'],'X-BoKemo-Control-Lease':s['lease']}
    r=urllib.request.Request(D['endpoint']+'/commit/setting/backup/export',method='POST',headers=h,data=json.dumps(body).encode())
    t0=time.time()
    try:
        with urllib.request.urlopen(r,timeout=180) as f: c,data=f.status,f.read()
    except urllib.error.HTTPError as e:
        c,data=e.code,e.read()
    ms=round((time.time()-t0)*1000); sv(s)
    open(REC,'a').write(json.dumps({'n':s['n'],'method':'POST','path':'/commit/setting/backup/export','parameters':{},'status':c,'ms':ms,'tag':'export','igt':None,'err':None})+'\n')
    if c==200: open(path,'wb').write(data)
    return c,len(data)
