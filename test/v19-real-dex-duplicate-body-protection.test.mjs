import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditArchivedDexRecheckFreshness}
 from '../src/v19-dex-cached-quote-audit.mjs';
const runs=['45036887325','45044300013','45057658912',
 '45064131641','45064898786','45065920534','45066246697'];
async function captured(){
 const evidence=[],rawFiles={};
 for(const id of runs){
  const rows=JSON.parse(await readFile(
   'research/feeds/2026-11-22/'+id+'/evidence.json','utf8'));
  for(const row of rows.api_evidence){
   if(row.provider!=='DEXSCREENER')continue;
   evidence.push(row);
   rawFiles[row.body_path]=await readFile(row.body_path,'utf8');
  }
 }
 return {apiEvidence:evidence,rawFiles,
  asOfUtc:new Date().toISOString()};
}
test('D2-04: real original SNAP Base DEX response repeated after 68 minutes is byte-identical, NOT an independently fresh price',async()=>{
 const x=await captured();
 const r=auditArchivedDexRecheckFreshness(x);
 assert.ok(r.original_dex_http200_count>=12);
 assert.equal(r.source_integrity_failures.length,0);
 assert.ok(r.repeated_http_capture_pairs_5_to_240min_count>=1);
 const pair=r.repeated_samples.find(x=>x.sources.some(p=>p.includes('45057658912'))
  &&x.sources.some(p=>p.includes('45064131641')));
 assert.ok(pair,'actual Base pair was queried twice in two genuinely distinct GitHub runs');
 assert.equal(pair.status,'SAME_ARCHIVED_PROVIDER_BYTES_NOT_FRESH_PRICE_EVIDENCE');
 assert.equal(pair.identical_source_response_body,true);
 assert.equal(pair.first_liquidity_usd,1066.35);
 assert.equal(pair.latest_liquidity_usd,1066.35);
 assert.equal(pair.difference_in_captured_price_pct,0);
 assert.equal(pair.independently_proven_new_price_sample,false);
 assert.equal(pair.can_be_used_to_authorize_a_PAPER_BUY,false);
 assert.equal(r.provider_quote_timestamp_independently_verified_count,0);
 assert.equal(r.total_orders_authorized,0);
});
test('Raw SHA mismatch or future HTTP response cannot become independent price evidence',async()=>{
 const x=await captured();
 const target=x.apiEvidence.find(e=>e.body_path.includes('45064131641')
  &&e.body_path.includes('0x08efe879'));
 assert.ok(target);
 const tamper=structuredClone(x);
 tamper.rawFiles[target.body_path]+='x';
 const rejected=auditArchivedDexRecheckFreshness(tamper);
 assert.ok(rejected.source_integrity_failures.some(x=>
  x.reason==='ORIGINAL_RAW_SHA256_MISMATCH'));
 assert.equal(rejected.genuine_new_independent_live_quote_approved_count,0);
 const earlier=structuredClone(x);
 earlier.asOfUtc='2026-11-22T19:00:00.000Z';
 const noFuture=auditArchivedDexRecheckFreshness(earlier);
 assert.ok(noFuture.source_integrity_failures.some(x=>
  x.reason==='RESPONSE_WAS_NOT_AVAILABLE_AT_VIRTUAL_TIME'));
 assert.equal(noFuture.total_orders_authorized,0);
});
test('Separate price screenshots cannot prove provider time, source domain, or chain sellability',async()=>{
 const r=auditArchivedDexRecheckFreshness(await captured());
 assert.ok(r.repeated_samples.every(x=>!x.independent_quote_time_verified
  &&!x.can_be_used_to_authorize_a_PAPER_BUY));
 assert.equal(r.genuine_new_independent_live_quote_approved_count,0);
 assert.equal(r.original_captures_are_not_original_october_asof_data,true);
});
