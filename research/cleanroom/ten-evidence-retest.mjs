import fs from 'node:fs';
import assert from 'node:assert/strict';
import {lookup} from './exact-contract-probe.mjs';
import {pacedFetch,test} from './paced-provider.mjs';
import {run} from './readonly-roundtrip-probe.mjs';
import {check} from './compact-report.mjs';
import {createHash} from 'node:crypto';
const root='r31/research/cleanroom/worker-diagnostics/';
const j=JSON.parse(fs.readFileSync(root+'2026-11-27-ten-results-46008487445.json'));
const p=JSON.parse(fs.readFileSync(j.packet_path));
for(const r of j.runs){const v=check(p,JSON.parse(fs.readFileSync(r.path)),r.worker,r.run_id);assert.equal(v.status,'COMPACT_STRUCTURAL_PASS');console.log('TEN_ACCEPT '+JSON.stringify({worker:r.worker,...v}));}
await test();
const roster=JSON.parse(fs.readFileSync('research/cleanroom/ten-roster-v1.json')).roster;
assert.equal(roster.length,10);
const limiter=pacedFetch(),results=[];
for(const [chain,contract,label] of roster.slice(5)){const x=await lookup(chain,contract,limiter.fetch);results.push(x);console.log('PACED_RESULT '+JSON.stringify({label,...x}));}
console.log('PACE_EVENTS '+JSON.stringify(limiter.events));
fs.writeFileSync('paced-results.json',JSON.stringify({results,events:limiter.events},null,2));
const q=await run(fetch,roster);
console.log('ROUNDTRIP_META '+JSON.stringify({...q,results:undefined}));
for(const x of q.results)console.log('ROUNDTRIP_ROW '+JSON.stringify(x));
fs.writeFileSync('ten-roundtrip.json',JSON.stringify(q,null,2));
const chainIds={base:'8453',ethereum:'1',bsc:'56',optimism:'10'};
const security=[];
for(const [chain,contract,label] of roster){
 const url='https://api.gopluslabs.io/api/v1/'+(chain==='solana'?'solana/token_security':'token_security/'+chainIds[chain])+'?contract_addresses='+encodeURIComponent(contract);
 const at=new Date().toISOString();let http=null,hash=null,record=null,error=null;
 try{
  const r=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'error'});http=r.status;const body=await r.text();if(body.length>2e6)throw Error('RESPONSE_TOO_LARGE');hash=createHash('sha256').update(body).digest('hex');
  if(!r.ok)throw Error('HTTP_'+http);
  const data=JSON.parse(body);const key=Object.keys(data.result??{}).find(k=>chain==='solana'?k===contract:k.toLowerCase()===contract.toLowerCase());
  if(data.code!==1||!key||typeof data.result[key]!=='object'||!data.result[key])throw Error('NO_EXACT_SECURITY_RECORD');
  record=data.result[key];
 }catch(e){error=String(e.message).slice(0,200);}
 const x={chain,contract,label,url,started_at:at,finished_at:new Date().toISOString(),http_status:http,response_sha256:hash,status:record?'PROVIDER_RECORD_NOT_AUDIT':'UNAVAILABLE',error,record};security.push(x);
 console.log('SECURITY_SUMMARY '+JSON.stringify({...x,record:undefined,record_keys:record?Object.keys(record):[],selected_fields:record?Object.fromEntries(Object.entries(record).filter(([k])=>['is_honeypot','buy_tax','sell_tax','is_mintable','owner_change_balance','can_take_back_ownership','is_blacklisted','freezable','mintable','holder_count'].includes(k))):null}));
}
fs.writeFileSync('ten-security.json',JSON.stringify(security,null,2));
