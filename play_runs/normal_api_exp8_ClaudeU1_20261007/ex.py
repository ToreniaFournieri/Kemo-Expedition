import t,json,st
def exp():
    c,j=t.gg('/read/observation/party'); p=j['data']['partyInfo']['party']; return p['level'],p['experience'],p['maxHp']
if __name__=='__main__':
    import sys
    n=int(sys.argv[1]) if len(sys.argv)>1 else 1
    print('before',exp())
    for i in range(n): st.step(43200,False)
    print('after',exp())
