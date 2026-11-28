// Read-only Solana RPC checks. PASS denotes scoped checks only, not token safety.
const RPC='https://api.mainnet-beta.solana.com';
const SPL='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const MINT=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const amount=x=>typeof x==='string'&&/^[0-9]{1,30}$/.test(x);
async function rpc(method,params,fetcher){
  const r=await fetcher(RPC,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!r.ok)throw Error('RPC HTTP '+r.status+' '+method);
  const j=await r.json();
  if(j.error)throw Error(method+' '+j.error.code+' '+String(j.error.message));
  if(!Number.isSafeInteger(j.result?.context?.slot))throw Error('RPC_CONTEXT_MISSING '+method);
  return j.result;
}
export async function inspectMint(address,fetcher=fetch,clock=Date.now){
  const result={chain:'solana',address,source:RPC,checks:[],scope:'CLASSIC_SPL_MINT_AND_ACCOUNT_CONCENTRATION',risk:'UNKNOWN'};
  const done=()=>({...result,observed_at:new Date(clock()).toISOString()});
  if(typeof address!=='string'||!MINT.test(address)){result.error='INVALID_MINT';return done();}
  try{
    const a=await rpc('getAccountInfo',[address,{encoding:'jsonParsed',commitment:'finalized'}],fetcher);
    const v=a.value,p=v?.data?.parsed,i=p?.info;
    if(v?.owner!==SPL||p?.type!=='mint'||i?.isInitialized!==true||
      !amount(i.supply)||BigInt(i.supply)<=0n||!Number.isInteger(i.decimals)||
      !Object.hasOwn(i,'mintAuthority')||!Object.hasOwn(i,'freezeAuthority')){
      result.error='UNSUPPORTED_OR_UNPARSED_MINT';return done();
    }
    result.mint_slot=a.context.slot;result.decimals=i.decimals;
    if(i.mintAuthority!==null||i.freezeAuthority!==null){
      result.risk='FAIL';result.checks.push('ACTIVE_MINT_OR_FREEZE_AUTHORITY');return done();
    }
    result.checks.push('NO_MINT_OR_FREEZE_AUTHORITY');
    const h=await rpc('getTokenLargestAccounts',[address,{commitment:'finalized'}],fetcher);
    if(Math.abs(h.context.slot-a.context.slot)>150||!Array.isArray(h.value)||!h.value.length||
      h.value.length>20||h.value.some(x=>!MINT.test(x.address??'')||!amount(x.amount)||x.decimals!==i.decimals)||
      new Set(h.value.map(x=>x.address)).size!==h.value.length)throw Error('INVALID_OR_UNSYNCED_HOLDER_RESPONSE');
    const supply=BigInt(i.supply), balances=h.value.map(x=>BigInt(x.amount)).sort((x,y)=>x>y?-1:x<y?1:0);
    const sum=balances.reduce((x,y)=>x+y,0n);
    if(sum>supply)throw Error('INCONSISTENT_SUPPLY');
    result.holder_slot=h.context.slot;
    result.top_account_bps=Number(balances[0]*10000n/supply);
    result.top_accounts_bps=Number(sum*10000n/supply);
    if(balances[0]*100n>supply*20n||sum*100n>supply*65n){
      result.risk='FAIL';result.checks.push('ACCOUNT_CONCENTRATION_LIMIT');return done();
    }
    result.checks.push('ACCOUNT_CONCENTRATION_LIMIT_MET');
    result.risk='PASS';
    result.limitations='Conservative experimental account limits; pool accounts not excluded, wallet clustering, LP ownership, program behavior and actual sellability not established.';
    return done();
  }catch(e){result.error=String(e.message);return done();}
}
