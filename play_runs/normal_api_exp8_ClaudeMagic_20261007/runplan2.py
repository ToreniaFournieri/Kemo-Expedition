import t,json,sys
d=json.load(open(sys.argv[1])); start=int(sys.argv[2])
for i,c in enumerate(d['calls']):
    if i<start: continue
    r,j=t.post(c['path'].replace('/api/v1',''),c['params'],tag='plan')
    if r!=200: print('FAIL',i,r,c['path'],c['params'],(j.get('error') or {}).get('details'))
print('calls',t.calls())
