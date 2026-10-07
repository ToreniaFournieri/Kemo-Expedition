import t,sys
c,j=t.post('/commit/expedition/1/changeExpedition',{'destination':int(sys.argv[1]),'destinationMode':'fixed','depthLimit':'all','difficultyOffset':0},tag='dest'); print(c,j.get('error'))
