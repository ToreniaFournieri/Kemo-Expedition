import t,json,sys,os
P=int(os.environ.get('PT','1')); d=json.load(open(f'../ga_last_{P}.json')); sim=len(sys.argv)>1 and sys.argv[1]=='sim'
p={'gaResultId':d['gaResultId'],'simulation':sim}
if os.environ.get('CONF'): p['confirmation']=os.environ['CONF']
c,j=t.post(f'/commit/build/party/{P}/applyGaResult',p,tag='gaapply')
print('APPLY',c,json.dumps(j)[:int(os.environ.get('N','600'))]); print('calls',t.calls())
