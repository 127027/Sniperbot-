import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {inspectHistoricalMintTransaction,summarizeMintHistory} from '../src/r29-historical-mint-risk.mjs';import {reviewHistoricalPair} from '../src/r29-historical-pair-review.mjs';import {emptyHistoricalLedger,applyHistoricalModelDecision} from '../src/r29-historical-model-ledger.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),run=process.env.GITHUB_RUN_ID,tickUtc='2026-10-12T00:00:00.000Z',tick=Date.parse(tickUtc)/1000;
const changes=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',process.env.GITHUB_SHA],{encoding:'utf8'}).trim().split('\n');
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'||changes.length!==1||!changes[0].startsWith('research/w04-first-review-requests/2026-11-24/'))throw Error('EXPLICIT_REQUEST_REQUIRED');
const q=JSON.parse(await readFile(changes[0],'utf8'));if(q.kind!=='R29_W04_FIRST_SHARED_REVIEW_AND_MINT_HISTORY'||q.max_new_rpc_calls!==7||q.no_orders!==true)throw Error('INVALID_REQUEST');
const cont=JSON.parse(await readFile('research/audits/2026-11-24/r29-w03-reserve-continuity.json','utf8')),quotes=JSON.parse(await readFile('research/audits/2026-11-24/r29-w03-50usdc-model-quotes.json','utf8'));
if(cont.source_run!==45385336884||quotes.run_id!==45388727848||cont.pairs.length!==3||quotes.rows.length!==3)throw Error('SOURCE_RUN_MISMATCH');
const reviews=cont.pairs.map(pair=>reviewHistoricalPair({pair,states:cont.states,quote:quotes.rows.find(x=>x.mint===pair.mint),fx:quotes.fx,tickUtc}));
let ledger=emptyHistoricalLedger();for(const r of reviews){ledger=applyHistoricalModelDecision(ledger,{mint:r.mint,tickUtc,decision:r.shared_kernel_decision});console.log('R29_W04_SHARED_REVIEW',JSON.stringify(r));}
const out='probe-artifacts/w04-first-'+run;await mkdir(out,{recursive:true});
const mint='HjSHamminSCgriev8fW6x8nKr9NxDccMA6JY3iRHpump',base='probe-artifacts/w04-original/v210-evidence-45351015863';
const pageRaw=await readFile(base+'/rpc-7.json','utf8'),pageHash='304ca2d4a2cfb4e7aea7955d519aa82d92064f0c47bd38b69319717c955dde8e';
if(hash(pageRaw)!==pageHash)throw Error('SIGNATURE_PAGE_CHANGED');
const page=JSON.parse(pageRaw);if(page.id!==7||page.error||!Array.isArray(page.result))throw Error('INVALID_ARCHIVED_PAGE');
const eligible=page.result.filter(x=>x.err===null&&Number.isInteger(x.blockTime)&&x.blockTime<tick-60);
const expected=[...new Map(eligible.map(x=>[x.signature,x])).values()].sort((a,b)=>a.blockTime-b.blockTime||a.slot-b.slot||a.signature.localeCompare(b.signature));
const pins=new Map(cont.states.filter(x=>x.mint===mint).map(x=>[x.signature,x]));
const rows=[],receipts=[],errors=[];let calls=0,stop=false;
for(const target of expected){
 const pin=pins.get(target.signature);
 if(!pin&&(calls>=q.max_new_rpc_calls||stop))continue;
 try{
  let raw,digest;
  if(pin){raw=await readFile(base+'/rpc-'+pin.receipt_id+'.json','utf8');digest=pin.source_sha256;}
  else{
   const id=100+(++calls),resp=await fetch('https://api.mainnet.solana.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method:'getTransaction',params:[target.signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:1}]}),signal:AbortSignal.timeout(15000)});
   raw=await resp.text();digest=hash(raw);const file='rpc-'+id+'.json';await writeFile(out+'/'+file,raw);const rec={id,signature:target.signature,http_status:resp.status,sha256:digest,file,retry_after:resp.headers.get('retry-after'),captured_at_utc:new Date().toISOString()};receipts.push(rec);console.log('R29_W04_RISK_RPC',JSON.stringify(rec));
   if(resp.status===429||resp.status===503)stop=true;
   if(!resp.ok||JSON.parse(raw).id!==id)throw Error('RPC_HTTP_OR_ID_'+resp.status);
  }
  const row=inspectHistoricalMintTransaction({raw,expectedSha256:digest,signature:target.signature,mint,slot:target.slot,blockTime:target.blockTime,tickUtc});rows.push(row);console.log('R29_W04_MINT_TX',JSON.stringify(row));
 }catch(e){errors.push({signature:target.signature,reason:e.message});}
}
const risk=summarizeMintHistory({mint,rows,expectedSignatures:expected.map(x=>x.signature),archiveExhausted:page.result.length<1000&&page.result.every(x=>Number.isInteger(x.blockTime))});
const report={kind:'R29_W04_FIRST_SHARED_REVIEW_AND_MINT_HISTORY',tick_utc:tickUtc,source_runs:[45385336884,45388727848],reviews,ledger,risk,receipts,errors,archived_page_sha256:pageHash,provider_calls:calls,provider_stopped:stop,actual_gpt_reviews:0,orders:0};
await writeFile(out+'/first-review.json',JSON.stringify(report,null,2)+'\n');console.log('R29_W04_RESULT',JSON.stringify({...report,reviews:undefined,receipts:undefined}));
