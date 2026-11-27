import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {lookup} from './exact-contract-probe.mjs';
import {validatePacket,evaluate} from './prefetched-analysis.mjs';
const pairs=[['solana','5DQSDg6SGkbsbykq4mQstpcL4d5raEHc6rY7LgBwpump','LOU'],['optimism','0x2598c30330d5771ae9f983979209486ae26de875','AI (unverified)'],['base','0xb166e8b140d35d9d8226e40c09f757bac5a4d87d','NPC'],['solana','63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9','GIGA (label not independently confirmed)']];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const exact=(chain,a,b)=>typeof a==='string'&&typeof b==='string'&&(chain==='solana'?a===b:a.toLowerCase()===b.toLowerCase());
const networks={solana:'solana',optimism:'optimism',base:'base'};
function expected(chain,contract,provider){return provider==='DexScreener'?'https://api.dexscreener.com/tokens/v1/'+chain+'/'+contract:'https://api.geckoterminal.com/api/v2/networks/'+networks[chain]+'/tokens/'+contract+'/pools'}
export function makePacket(probes,{run_id,commit,at,fixture=false}){
 if(!run_id||!/^[a-f0-9]{40}$/.test(commit)||!Number.isFinite(Date.parse(at)))throw Error('MISSING_PROVENANCE');
 const candidates=pairs.map(([chain,contract,label],i)=>{
  const p=probes.find(x=>x.chain===chain&&exact(chain,x.contract,contract));
  if(!p||p.mode!=='RESEARCH_ONLY'||p.non_executable!==true||p.attempts?.length!==2)throw Error('MISSING_REQUIRED_SOURCE_ATTEMPT:'+chain+':'+contract);
  const sources=['DexScreener','GeckoTerminal'].map((provider,k)=>{
   const a=p.attempts.find(x=>x.provider===provider);
   if(!a||a.url!==expected(chain,contract,provider)||!Number.isFinite(Date.parse(a.started_at))||!Number.isFinite(Date.parse(a.finished_at))||Date.parse(a.finished_at)<Date.parse(a.started_at)||Date.parse(a.finished_at)>Date.parse(at)||!Array.isArray(a.rows)||a.rows.some(r=>r.chain!==chain||!exact(chain,r.contract,contract)))throw Error('INVALID_SOURCE_RECEIPT');
   const ok=['EXACT_POOL_MATCH','NO_EXACT_POOL'].includes(a.status);
   if(ok&&(!(a.http_status>=200&&a.http_status<300)||!/^[a-f0-9]{64}$/.test(a.response_sha256)||!Number.isInteger(a.response_bytes)||a.response_bytes<0||(a.status==='EXACT_POOL_MATCH')!==!!a.rows.length))throw Error('INVALID_SUCCESS_RECEIPT');
   if(!ok&&(!['HTTP_ERROR','REQUEST_OR_PARSE_ERROR'].includes(a.status)||typeof a.error!=='string'||a.rows.length))throw Error('INVALID_FAILURE_RECEIPT');
   if(a.status==='HTTP_ERROR'&&(!(a.http_status>=400)||!/^[a-f0-9]{64}$/.test(a.response_sha256)))throw Error('INVALID_HTTP_RECEIPT');
   return {id:'C'+(i+1)+'P'+(k+1),url:a.url,status:ok?'READ':a.status==='HTTP_ERROR'?'HTTP_ERROR':'SOURCE_ERROR',http_status:a.http_status,published_at:null,summary:ok?'Actual direct API retrieval; '+a.status+'; '+a.rows.length+' exact pool rows; provider quote timestamps unknown; not execution quotes.':a.error,receipt:{provider,started_at:a.started_at,finished_at:a.finished_at,response_sha256:a.response_sha256??null,response_bytes:a.response_bytes??null,normalized_receipt_sha256:hash(a),result:a.status,error:a.error},rows:a.rows.slice(0,3)};
  });
  return {chain,contract,label,sources,market:{scope:'MARKET_OBSERVATION_ONLY',provider_quote_time:null},gaps:['independent project identity and meme classification','current news and catalyst','current security and sellability','EUR50 entry/exit quotes, complete costs and exit conditions']};
 });
 return validatePacket({schema:'r31.prefetched-analysis-packet.v1',mode:'RESEARCH_ONLY',non_executable:true,id:'r31-receipt-'+run_id,observed_date:at.slice(0,10),source_receipts_required:true,provenance:{run_id,commit,at,fixture,limitations:'Response hash is recorded by collector; raw bytes are not independently archived. Source receipts prove reported collector attempt, not trading qualification or worker search.'},candidates});
}
function test(){
 const at='2026-11-27T13:00:00Z',probes=pairs.map(([chain,contract])=>({chain,contract,mode:'RESEARCH_ONLY',non_executable:true,attempts:['DexScreener','GeckoTerminal'].map(provider=>({provider,url:expected(chain,contract,provider),started_at:at,finished_at:at,http_status:200,response_sha256:'a'.repeat(64),response_bytes:2,status:'NO_EXACT_POOL',error:null,rows:[]}))}));
 const meta={run_id:'fixture',commit:'a'.repeat(40),at,fixture:true},p=makePacket(probes,meta);assert.equal(p.candidates.length,4);
 assert.throws(()=>makePacket(probes.slice(0,3),meta),/MISSING_REQUIRED/);
 const bad=structuredClone(probes);bad[0].attempts[0].response_sha256=null;assert.throws(()=>makePacket(bad,meta),/INVALID_SUCCESS_RECEIPT/);
 const r={schema:'r31.packet-analysis.v1',packet_id:p.id,worker:'market',mode:'RESEARCH_ONLY',non_executable:true,rows:p.candidates.map(c=>({chain:c.chain,contract:c.contract,decision:'DATA_GAP',reason:'fixture',source_ids:c.sources.map(s=>s.id),failed_source_ids:[],gaps:c.gaps})),steps:[{seq:1,action:'REPORT',status:'OK',result:'fixture'}],fix_hypothesis:'fixture',next_test:'fixture',acceptance:'fixture',stop_reason:'fixture'};
 assert.equal(evaluate(p,JSON.stringify(r),'market').status,'STRUCTURAL_PACKET_ANALYSIS_ONLY');r.rows[0].source_ids.pop();assert.equal(evaluate(p,JSON.stringify(r),'market').status,'INCOMPLETE');
 console.log('Receipt packet fixtures passed: missing calls and hashes rejected, incomplete evidence coverage rejected; no BUY promotion.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--self-test'))test();else{
  const probes=[];for(const [chain,contract] of pairs)probes.push(await lookup(chain,contract));
  const p=makePacket(probes,{run_id:process.env.GITHUB_RUN_ID,commit:process.env.GITHUB_SHA,at:new Date().toISOString()});
  fs.writeFileSync('receipt-probes.json',JSON.stringify(probes,null,2));fs.writeFileSync('receipt-packet.json',JSON.stringify(p,null,2));console.log('RECEIPT_PACKET '+JSON.stringify(p));
 }
}
