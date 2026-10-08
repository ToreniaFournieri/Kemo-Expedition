import t,json,uuid,urllib.request,sys
print(t.signup('ClaudeSide')[0], t.login('ClaudeSide')[0])
t.get('/read/observation/overview'); rev=t.st()['rev']; s=t.st()
b='----x'+uuid.uuid4().hex
meta=json.dumps({'expectedRevision':rev,'idempotencyKey':str(uuid.uuid4()),'parameters':{'skipConfirmation':True}})
data=open(sys.argv[1],'rb').read()
body=(f'--{b}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{meta}\r\n--{b}\r\nContent-Disposition: form-data; name="backup"; filename="b.kemoz"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+data+f'\r\n--{b}--\r\n'.encode()
h={'Authorization':'Bearer '+t.D['token'],'Content-Type':'multipart/form-data; boundary='+b,'X-BoKemo-Session':s['session'],'X-BoKemo-Control-Lease':s['lease']}
r=urllib.request.Request(t.D['endpoint']+'/commit/setting/backup/import',method='POST',headers=h,data=body)
try:
    with urllib.request.urlopen(r) as f: print(f.status,f.read()[:400])
except urllib.error.HTTPError as e: print(e.code,e.read()[:600])
