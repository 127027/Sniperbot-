import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync,gzipSync} from 'node:zlib';import {verifyDecisionMinutes,buildDecisionEvidence,replayDayPlan,FIRST} from '../src/r29-predecision-evidence-bridge.mjs';import {parseBinanceHistoricalFx,modelHistoricalCurve} from '../src/r29-historical-curve-model.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),checked=async(p,h)=>{const b=await readFile(p);if(sha(b)!==h)throw Error('SOURCE_SHA_MISMATCH '+p);return b;};
const root='research/preparation/cumulative',cm=await read(root+'/manifest.json'),index=JSON.parse(gunzipSync(await checked(root+'/market-index.json.gz',cm.market_index_sha256)).toString('utf8'));
if(index.candidates.length!==cm.distinct_mints||index.pools.length!==cm.distinct_pool_keys||JSON.stringify(index.sources)!==JSON.stringify(cm.sources))throw Error('INDEX_MANIFEST_MISMATCH');
const q=await read('research/state/r29-preparation-queue.json'),minutes=[];
for(const s of cm.sources){
 const r=Object.values(q.requests).find(r=>r.status==='CAPTURED'&&r.receipt.artifact_path===s.manifest_path);
 if(!r)throw Error('MISSING_DURABLE_RECEIPT');
 const m=JSON.parse(await checked(s.manifest_path,r.receipt.sha256)),dir=s.manifest_path.slice(0,s.manifest_path.lastIndexOf('/'));
 if(m.archive_sha256!==s.archive_sha256||m.hour_utc!==s.hour_utc||!m.usable||!m.stream_complete)throw Error('SOURCE_RECEIPT_MISMATCH');
 const rows=gunzipSync(await checked(dir+'/pool-minute-observations.jsonl.gz',m.minute_sha256)).toString('utf8').trim().split('\n').map(JSON.parse);
 minutes.push(...verifyDecisionMinutes(rows,{hourUtc:m.hour_utc,expectedCount:m.minute_observations,expectedSwaps:m.counts.accepted}));
}
if(minutes.length!==cm.minute_observations)throw Error('TOTAL_MINUTES_MISMATCH');
const audits='research/audits/2026-11-24/';
const quotes=await read(audits+'r29-w03-50usdc-model-quotes.json'),reserves=await read(audits+'r29-w03-reserve-continuity.json'),review=await read(audits+'r29-w04-first-shared-review-and-mint-history.json');
const fx=parseBinanceHistoricalFx({raw:await readFile(quotes.original_fx_raw_path,'utf8'),expectedSha256:quotes.receipt.source_sha256,tickUtc:FIRST});
const priorQuotes=[];
for(const pair of reserves.pairs){
 const last=reserves.states.find(s=>s.signature===pair.source_signature&&s.mint===pair.mint&&s.pool===pair.pool&&s.event_flow_verified&&s.source_sha256===pair.source_sha256);
 if(!last||JSON.stringify(last.post)!==JSON.stringify(pair.asof_event_state))throw Error('PAIR_SOURCE_MISMATCH');
 const model=modelHistoricalCurve({pair,fx,tickUtc:FIRST}),old=quotes.rows.find(x=>x.mint===pair.mint&&x.pool===pair.pool);
 if(!old||JSON.stringify(model.entry)!==JSON.stringify(old.entry)||model.roundtrip_model_cost_micro_usdc!==old.roundtrip_model_cost_micro_usdc)throw Error('OLD_QUOTE_RECONCILIATION');
 priorQuotes.push({...model,raw_chain_receipts_reverified_this_run:false});
}
const result=buildDecisionEvidence({index,minuteRows:minutes,priorQuotes,priorReviews:review.reviews});
const counts={};for(const c of result.candidates)counts[c.priority]=(counts[c.priority]||0)+1;
const out='research/preparation/decision-input';await mkdir(out,{recursive:true});
const packet=gzipSync(JSON.stringify(result)+'\n');await writeFile(out+'/all-candidates.json.gz',packet);
const hash=sha(packet);
const active=result.candidates.filter(c=>c.priority.startsWith('RECENT'));
const jobs=active.map(c=>({mint:c.mint,priority:c.priority,input_sha256:sha(JSON.stringify(c)),pool_keys:c.pools.map(p=>p.key),missing_evidence:c.missing_evidence,prior_quote_count:c.prior_indicative_quotes.length,status:'PENDING_EVIDENCE'}));
await writeFile(out+'/evidence-queue.json',JSON.stringify({kind:'R29_EVIDENCE_ENRICHMENT_QUEUE',tick_utc:FIRST,packet_sha256:hash,jobs},null,2)+'\n');
await writeFile(out+'/replay-day-plan.json',JSON.stringify(replayDayPlan({preparedInputSha256:hash}),null,2)+'\n');
const manifest={kind:result.kind,tick_utc:FIRST,inventory_count:result.inventory_count,pool_count:result.pool_count,minute_count:minutes.length,priority_counts:counts,evidence_jobs:jobs.length,prior_indicative_quotes_recomputed:priorQuotes.length,prior_quote_mints:priorQuotes.map(q=>q.mint),packet_sha256:hash,packet_bytes:packet.length,market_index_sha256:cm.market_index_sha256,source_scope:'Three archived Solana hours plus pre-existing candidate index; earlier launch archive retained separately, no other-chain/social completeness',prepared_trade_inputs:0,valid_scans:0,new_market_requests:0,orders:0};
await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('R29_PREDECISION_PACKETS',JSON.stringify(manifest));
