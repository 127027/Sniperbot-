import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {check} from './compact-report.mjs';
const root='r31/research/cleanroom/worker-diagnostics/';
const paths={market:root+'2026-11-27-ten-packet-46008487445.json',retest:root+'2026-11-27-ten-evidence-retest-46011295537.json',news:root+'2026-11-27-identity-news-review-v1.json',reports:root+'2026-11-27-ten-results-46008487445.json'};
const blobs={market:'4da0f517821642be5d3f20e8e0f752d96bb1333b',retest:'10f493437a1119135c14b3ba34ffd3f101a3f7ad',news:'44f36e43c8d15c74ddd93b8e12cb2cab59a0bf17',reports:'0fba7910516137b8c5071e35a21969e4f3de288e'};
const key=x=>{if(!x||!['solana','base','optimism','ethereum','bsc'].includes(x.chain)||typeof x.contract!=='string'||!(x.chain==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x.contract):/^0x[0-9a-fA-F]{40}$/.test(x.contract)))throw Error('BAD_IDENTITY');return x.chain+':'+(x.chain==='solana'?x.contract:x.contract.toLowerCase())};
function indexed(rows,allowed){
 const m=new Map();for(const x of rows){const k=key(x);if(m.has(k)||allowed&&!allowed.has(k))throw Error('DUPLICATE_OR_UNASSIGNED:'+k);m.set(k,x)}return m;
}
const load=(path,expected)=>{const b=fs.readFileSync(path);const hash=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');if(expected&&hash!==expected)throw Error('BLOB_MISMATCH:'+path);return JSON.parse(b.toString('utf8'))};
const nonExec=x=>x?.mode==='RESEARCH_ONLY'&&x.non_executable===true;
function timestamped(t,cutoff){const n=Date.parse(t),c=Date.parse(cutoff);return Number.isFinite(n)&&n<=c&&c-n<=900000}
export function build(market,retest,news,analyses,{asOf}){
 if(![market,retest,news].every(nonExec)||market.candidates.length!==10||!Number.isFinite(Date.parse(asOf)))throw Error('BAD_INPUT');
 const m=indexed(market.candidates),ids=new Set(m.keys()),e=retest.evidence;
 const q=indexed(e.ROUNDTRIP_ROW,ids),s=indexed(e.SECURITY_SUMMARY,ids),n=indexed(news.rows,ids),p=indexed(e.PACED_RESULT,ids);
 if(q.size!==10||s.size!==10||p.size!==5||analyses.length!==2||new Set(analyses.map(a=>a.worker)).size!==2)throw Error('INCOMPLETE_INPUT');
 const a=analyses.map(x=>({worker:x.worker,rows:indexed(x.rows,ids)}));
 if(a.some(x=>x.rows.size!==10))throw Error('MISSING_ANALYSES');
 const rows=[...m].map(([id,c])=>{
  const quote=q.get(id),security=s.get(id),identity=n.get(id),retry=p.get(id);
  if(!nonExec(quote)||retry&&!nonExec(retry))throw Error('MODE');
  const marketReceipts=c.sources.map(x=>({id:x.id,http:x.http_status,result:x.receipt.result,retrieved_at:x.receipt.finished_at,provider_quote_time:null,rows:x.rows}));
  const retryReceipts=(retry?.attempts??[]).map(x=>({provider:x.provider,http:x.http_status,result:x.status,retrieved_at:x.finished_at,provider_quote_time:null,rows:x.rows}));
  const decisions=a.map(x=>({worker:x.worker,decision:x.rows.get(id).decision}));
  if(decisions.some(x=>!['WATCH','REJECT','DATA_GAP'].includes(x.decision)))throw Error('UNSUPPORTED_WORKER_DECISION');
  const gaps=[];
  // Retrieval time is not provider quote time. Existing packet has no timestamped trade/quote.
  if(!marketReceipts.some(x=>timestamped(x.provider_quote_time,asOf)))gaps.push('TIMESTAMPED_MARKET_QUOTE_MISSING');
  if(identity?.identity!=='CORROBORATED_BY_PUBLIC_REFERENCES')gaps.push('PROJECT_IDENTITY_UNVERIFIED');
  if(identity?.catalyst!=='VERIFIED_CURRENT')gaps.push('CURRENT_CATALYST_UNVERIFIED');
  if(security.status!=='PROVIDER_RECORD_NOT_AUDIT')gaps.push('SECURITY_RECORD_MISSING');
  gaps.push('SECURITY_CLEARANCE_UNVERIFIED');
  if(!quote.entry?.quote)gaps.push('ENTRY_ROUTE_MISSING');
  if(!quote.exit?.quote)gaps.push('EXIT_ROUTE_MISSING');
  if(!timestamped(quote.entry?.receipt?.finished_at,asOf)||!timestamped(quote.exit?.receipt?.finished_at,asOf))gaps.push('ROUTE_RETRIEVAL_STALE_OR_MISSING');
  if(quote.complete_costs!==true)gaps.push('COMPLETE_COSTS_UNVERIFIED');
  if(quote.actual_sellability_verified!==true)gaps.push('ACTUAL_SELLABILITY_UNVERIFIED');
  if(quote.settlement_scope==='BINANCE_PEG_USDC_REFERENCE_PARITY_UNVERIFIED')gaps.push('SETTLEMENT_PARITY_UNVERIFIED');
  gaps.push('EXIT_PLAN_NOT_QUALIFIED');
  if(decisions.some(x=>x.decision==='REJECT'))gaps.push('WORKER_REJECT');
  if(new Set(decisions.map(x=>x.decision)).size!==1)gaps.push('WORKER_DISAGREEMENT');
  // This diagnostic does not authorize BUY even if all inputs appear to qualify.
  return {chain:c.chain,contract:c.contract,label:c.label,market_receipts:marketReceipts,retry_receipts:retryReceipts,quote:{status:quote.status,entry:quote.entry,exit:quote.exit,reference_input_eur:quote.reference_input_eur??null,reference_output_eur:quote.reference_output_eur??null,gas_usd_reported_both:quote.gas_usd_reported_both??null,complete_costs:quote.complete_costs===true,actual_sellability_verified:quote.actual_sellability_verified===true,settlement_scope:quote.settlement_scope},security,identity_news:identity??null,prior_worker_decisions:decisions,gaps,qualification:'BLOCKED_RESEARCH_ONLY',verified_buy:false};
 });
 return {schema:'r31.integrated-evidence.v1',mode:'RESEARCH_ONLY',non_executable:true,as_of:asOf,source_paths:paths,source_blobs:blobs,rows,summary:{identities:rows.length,prior_worker_reviews:20,route_pairs:rows.filter(x=>x.quote.entry?.quote&&x.quote.exit?.quote).length,security_records:rows.filter(x=>x.security.status==='PROVIDER_RECORD_NOT_AUDIT').length,current_catalysts:rows.filter(x=>x.identity_news?.catalyst==='VERIFIED_CURRENT').length,verified_buys:0,complete_costs:rows.filter(x=>x.quote.complete_costs).length,blocked:rows.length},limitations:'Historical evidence integration only. Prior worker opinions predate quote/security additions. No fresh analysis, autonomous dispatch, simulated fill, production or real-money authorization.'};
}
function readInputs(){
 const m=load(paths.market,blobs.market),r=load(paths.retest,blobs.retest),n=load(paths.news,blobs.news),j=load(paths.reports,blobs.reports);
 const analyses=j.runs.map(x=>{const c=load(x.path,x.blob);const v=check(m,c,x.worker,x.run_id);assert.equal(v.status,'COMPACT_STRUCTURAL_PASS');const raw=c.raw_report.trim().replace(/^<escape>([\s\S]*)<\/escape>$/,'$1');return JSON.parse(raw)});
 return [m,r,n,analyses];
}
function test(inputs,p){
 assert.equal(p.rows.length,10);assert.equal(p.summary.verified_buys,0);assert.equal(p.summary.route_pairs,9);assert.equal(p.summary.security_records,8);
 assert.ok(p.rows.every(x=>x.gaps.includes('TIMESTAMPED_MARKET_QUOTE_MISSING')&&x.gaps.includes('COMPLETE_COSTS_UNVERIFIED')));
 const atx=p.rows.find(x=>x.label.startsWith('ATX'));assert.ok(atx.gaps.includes('EXIT_ROUTE_MISSING')&&atx.gaps.includes('WORKER_REJECT'));
 assert.equal(p.rows.filter(x=>x.retry_receipts.length===2).length,5);
 const bad=structuredClone(inputs);bad[1].evidence.ROUNDTRIP_ROW.pop();assert.throws(()=>build(...bad,{asOf:p.as_of}),/INCOMPLETE_INPUT/);
 const dup=structuredClone(inputs);dup[1].evidence.ROUNDTRIP_ROW[1]=dup[1].evidence.ROUNDTRIP_ROW[0];assert.throws(()=>build(...dup,{asOf:p.as_of}),/DUPLICATE/);
 const wrong=structuredClone(inputs);wrong[1].evidence.SECURITY_SUMMARY[0].contract='0x'+'a'.repeat(40);wrong[1].evidence.SECURITY_SUMMARY[0].chain='base';assert.throws(()=>build(...wrong,{asOf:p.as_of}),/UNASSIGNED/);
 console.log('INTEGRATED_TEST_PASS exact identity, immutable source blobs, missing/duplicate/foreign evidence, exit failure and no BUY promotion');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const inputs=readInputs(),p=build(...inputs,{asOf:new Date().toISOString()});test(inputs,p);
 fs.writeFileSync('integrated-evidence.json',JSON.stringify(p,null,2));console.log('INTEGRATED_SUMMARY '+JSON.stringify({as_of:p.as_of,...p.summary}));
 for(const r of p.rows)console.log('INTEGRATED_ROW '+JSON.stringify({chain:r.chain,contract:r.contract,label:r.label,gaps:r.gaps,qualification:r.qualification}));
}
