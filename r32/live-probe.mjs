// Read-only network probe. No orders, transactions, portfolio or keys.
import fs from 'node:fs';
import {fxReference,roundTrip,WSOL,USDC} from './providers.mjs';
import {Scanner} from './scanner.mjs';
import {inspectMint} from './risk.mjs';
const report={mode:'PAPER_ONLY',kind:'READ_ONLY_LIVE_PROVIDER_PROBE',started_at:new Date().toISOString(),checks:{}};
async function check(name,fn){
 try{report.checks[name]={status:'PASS',result:await fn()};}
 catch(e){report.checks[name]={status:'FAIL',error:String(e.message)};}
}
await check('fx',()=>fxReference());
let discovered=[];
await check('discovery',async()=>{
 const r=await new Scanner().cycle();
 if(!r.coverage.fresh_market)throw Error(JSON.stringify({coverage:r.coverage,errors:r.errors}));
 discovered=r.candidates.filter(c=>!c.market_stale&&c.market?.liquidity_usd>=20000).sort((a,b)=>b.market.liquidity_usd-a.market.liquidity_usd);
 return {coverage:r.coverage,errors:r.errors,receipts:r.receipts};
});
await check('quote_roundtrip_wsol',()=>roundTrip(WSOL,'50000000'));
// Native wrapped SOL is a special mint; do not use it as a positive supply/holder control.
report.native_mint_diagnostic=await inspectMint(WSOL);
await check('rpc_usdc_authority_control',async()=>{
 const r=await inspectMint(USDC);
 if(r.risk!=='FAIL'||!r.checks.includes('ACTIVE_MINT_OR_FREEZE_AUTHORITY'))
   throw Error(JSON.stringify(r));
 return r; // expected policy rejection demonstrates a parsed ordinary SPL mint
});
await check('rpc_discovered_tokens',async()=>{
 const observations=[];
 for(const c of discovered.slice(0,3)){
   await new Promise(r=>setTimeout(r,1100));
   observations.push(await inspectMint(c.address));
 }
 if(!observations.some(r=>r.risk==='PASS'||r.risk==='FAIL'))
   throw Error(JSON.stringify({observations,error:'NO_SCOPED_RISK_DECISION'}));
 return {observations,limitations:'Discovery tokens not necessarily memes; FAIL is a valid policy decision, not an entry approval.'};
});
await check('rpc_token2022_regression',async()=>{
 const observations=[];
 for(const address of ['Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump','Hg5Ja55T5wESq4vyFoiVCMeHXtGyVA69X2UHq8hgpump','Fo2HAwr7ZAUM2bSZ7MWSi16e3aWGpbw5MsUDYCttpump']){
  await new Promise(r=>setTimeout(r,1100));observations.push(await inspectMint(address));
 }
 if(observations.some(r=>r.risk==='UNKNOWN'))throw Error(JSON.stringify(observations));
 return observations;
});
report.ended_at=new Date().toISOString();
report.status=Object.values(report.checks).every(x=>x.status==='PASS')?'PASS':'PARTIAL_OR_FAIL';
fs.writeFileSync('r32-live-probe.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.status!=='PASS')process.exitCode=1;
