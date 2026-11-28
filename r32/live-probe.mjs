// Read-only network probe. No orders, transactions, portfolio or keys.
import fs from 'node:fs';
import {fxReference,roundTrip,WSOL} from './providers.mjs';
import {Scanner} from './scanner.mjs';
import {inspectMint} from './risk.mjs';
const report={mode:'PAPER_ONLY',kind:'READ_ONLY_LIVE_PROVIDER_PROBE',started_at:new Date().toISOString(),checks:{}};
async function check(name,fn){
 try{report.checks[name]={status:'PASS',result:await fn()};}
 catch(e){report.checks[name]={status:'FAIL',error:String(e.message)};}
}
await check('fx',()=>fxReference());
await check('discovery',async()=>{
 const r=await new Scanner().cycle();
 if(!r.coverage.fresh_market)throw Error(JSON.stringify({coverage:r.coverage,errors:r.errors}));
 return {coverage:r.coverage,errors:r.errors,receipts:r.receipts};
});
await check('quote_roundtrip_wsol',()=>roundTrip(WSOL,'50000000'));
await check('rpc_wsol',async()=>{
 const r=await inspectMint(WSOL);
 if(r.risk==='UNKNOWN')throw Error(JSON.stringify(r));
 return r; // successful RPC evidence, not necessarily an acceptable token risk
});
report.ended_at=new Date().toISOString();
report.status=Object.values(report.checks).every(x=>x.status==='PASS')?'PASS':'PARTIAL_OR_FAIL';
fs.writeFileSync('r32-live-probe.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.status!=='PASS')process.exitCode=1;
