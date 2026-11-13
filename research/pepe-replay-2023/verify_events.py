import json,pathlib,requests,datetime
R=pathlib.Path(__file__).parent
swaps=json.loads((R/'first-swaps.json').read_text())
out=[]
for s in swaps:
    r=requests.post('https://ethereum-rpc.publicnode.com',json={'jsonrpc':'2.0','id':1,'method':'eth_getTransactionReceipt','params':[s['tx']]},timeout=25).json()
    (R/'raw'/f"receipt_{s['side']}.json").write_text(json.dumps(r,indent=2))
    receipt=r.get('result',{})
    match=[l for l in receipt.get('logs',[]) if int(l['logIndex'],16)==int(s['logIndex'],16) and l['address'].lower()=='0xa43fe16908251ee70ef74718545e4fe6c5ccec9f']
    assert receipt['status']=='0x1' and int(receipt['blockNumber'],16)==s['block'] and len(match)==1
    assert [int(match[0]['data'][2+i*64:66+i*64],16) for i in range(4)]==s['amounts']
    out.append({**s,'independent_receipt_matches':True})
(R/'verified-swaps.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
