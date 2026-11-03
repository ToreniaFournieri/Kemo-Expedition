import t,sys
d=int(sys.argv[1]); p=sys.argv[2] if len(sys.argv)>2 else '1'
print(t.post(f'/commit/expedition/{p}/changeExpedition',{'destination':d,'depthLimit':'all'})[0])
