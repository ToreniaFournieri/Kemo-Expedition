import t,json,sys
d=json.load(open(sys.argv[1]))
for c in d['calls']:
    r,j=t.post(c['path'].replace('/api/v1',''),c['params'],tag='plan')
    if r!=200: print('FAIL',r,c['path'],c['params'],j.get('error')); break
print('calls',t.calls())
