// Structural acceptance for hourly research reports; never generates orders.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const t=x=>Date.parse(x);
const url=x=>typeof x==='string'&&/^https:\/\/[^\s/]+/.test(x);
const identity=r=>r.chain+':'+(r.chain==='solana'?r.contract:r.contract.toLowerCase());
const chainId=r=>nonempty(r.chain)&&typeof r.contract==='string'&&(r.chain==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.contract):/^0x[0-9a-fA-F]{40}$/.test(r.contract));
const fields=['step','error','last_action','alternative','alternative_result','cause','next_test','component','repair','acceptance','autonomous'];
function check(ok,code){if(!ok)throw Error(code)}
function evidence(a,at){return Array.isArray(a)&&a.length>0&&a.every(s=>url(s.url)&&Number.isFinite(t(s.observed_at))&&t(s.observed_at)<=at)}
export function validate(r){
 check(r?.schema==='r31.hourly-worker.v1'&&r.mode==='RESEARCH_ONLY'&&r.non_executable===true,'SCHEMA');
 const start=t(r.cycle_start),end=t(r.cycle_end),at=t(r.assessed_at);
 check(Number.isFinite(start)&&end-start===3600000&&start%3600000===0&&Number.isFinite(at)&&at>=start&&nonempty(r.worker),'CYCLE');
 check(Array.isArray(r.rows)&&Array.isArray(r.blockers)&&Array.isArray(r.coverage)&&r.coverage.length&&r.coverage.every(nonempty),'REPORT_FIELDS');
 const cutoff=Math.min(at,end),ids=new Set();
 for(const x of r.rows){
  check(chainId(x)&&!ids.has(identity(x))&&['BUY','HOLD','SELL','WATCH','REJECT','DATA_GAP'].includes(x.decision)&&nonempty(x.reason)&&evidence(x.sources,cutoff),'ROW');ids.add(identity(x));
  if(x.decision==='BUY'){
   const q=x.quote,c=x.costs;
   check(q?.chain===x.chain&&q.contract===x.contract&&q.scope==='AMOUNT_SPECIFIC_INDICATIVE_PAPER'&&q.amount_eur===50&&Number.isFinite(q.price_eur)&&q.price_eur>0&&url(q.url)&&Number.isFinite(t(q.observed_at))&&t(q.observed_at)<=cutoff&&cutoff-t(q.observed_at)<=900000,'BUY_QUOTE');
   check(x.risk?.reviewed===true&&x.risk.sellability_verified===true&&evidence(x.risk.sources,cutoff)&&c?.reviewed===true&&evidence(c.sources,cutoff)&&['gas_eur','dex_fee_pct','slippage_pct','buy_tax_pct','sell_tax_pct'].every(k=>Number.isFinite(c[k])&&c[k]>=0&&(k==='gas_eur'||c[k]<=100))&&nonempty(x.exit_rule),'BUY_RISK_COST');
  }
 }
 for(const b of r.blockers)check(b&&['P0','P1','P2'].includes(b.priority)&&fields.every(k=>nonempty(b[k]))&&['yes','no','unknown'].includes(b.autonomous),'BLOCKER_INCOMPLETE');
 const buys=r.rows.filter(x=>x.decision==='BUY').length;
 check(nonempty(r.next_work)&&nonempty(r.stop_reason)&&Number.isInteger(r.sighted)&&r.sighted>=r.rows.length,'PROGRESS');
 // Individual workers may find <10; require concrete explanation, not fake successes.
 if(buys<10)check(r.blockers.length>0,'SHORTFALL_NEEDS_DIAGNOSIS');
 return {worker:r.worker,rows:r.rows.length,buys,late:at>end,structural_only:true};
}
export function aggregate(reports){
 check(reports.length>0,'NO_REPORTS');
 const workers=new Set(),ids=new Set();let rows=0;
 for(const r of reports){validate(r);check(r.cycle_start===reports[0].cycle_start&&r.cycle_end===reports[0].cycle_end&&!workers.has(r.worker),'CYCLE_OR_DUPLICATE_WORKER');workers.add(r.worker);rows+=r.rows.length;for(const x of r.rows)if(x.decision==='BUY')ids.add(identity(x))}
 return {workers:[...workers],rows,distinct_buy_claims:ids.size,goal_claimed:ids.size>=10,independent_quality_verified:false,structural_only:true};
}
function selfTest(){
 const start='2026-11-27T09:00:00Z',end='2026-11-27T10:00:00Z',at='2026-11-27T09:20:00Z';
 const b=Object.fromEntries(fields.map(k=>[k,'specific fixture']));b.priority='P0';b.autonomous='unknown';
 const row={chain:'base',contract:'0x'+'a'.repeat(40),decision:'DATA_GAP',reason:'fixture missing quote',sources:[{url:'https://example.org',observed_at:at}]};
 const r={schema:'r31.hourly-worker.v1',mode:'RESEARCH_ONLY',non_executable:true,worker:'fixture',cycle_start:start,cycle_end:end,assessed_at:at,rows:[row],blockers:[b],coverage:['Base fixture'],sighted:1,next_work:'resume next contract',stop_reason:'fixture'};
 assert.equal(validate(r).buys,0);assert.throws(()=>validate({...r,blockers:[]}),/DIAGNOSIS/);
 assert.throws(()=>validate({...r,blockers:[{...b,error:''}]}),/BLOCKER/);
 assert.throws(()=>validate({...r,rows:[{...row,decision:'BUY'}]}),/BUY_QUOTE/);
 assert.throws(()=>validate({...r,rows:[row,row]}),/ROW/);
 assert.throws(()=>aggregate([r,r]),/DUPLICATE_WORKER/);
 assert.equal(aggregate([r,{...r,worker:'fixture2'}]).distinct_buy_claims,0);
 console.log('Hourly acceptance fixtures passed: shortfall diagnostics, duplicate identities, unsupported buys, duplicate workers, explicit structural-only aggregate');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--self-test'))selfTest();
 else {const files=process.argv.slice(2);check(files.length>0,'NO_FILES');console.log(JSON.stringify(aggregate(files.map(f=>JSON.parse(fs.readFileSync(f,'utf8')))),null,2))}
}
