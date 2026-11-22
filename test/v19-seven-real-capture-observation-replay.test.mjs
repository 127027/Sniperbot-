import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {replayArchivedSixChainEvidence} from '../src/v19-offline-multichain-replay.mjs';
const ids=['45036887325','45044300013','45057658912',
 '45064131641','45064898786','45065920534','45066246697'];
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
async function archive(){
 const apiEvidence=[],rawFiles={};
 for(const id of ids){
  const root='research/feeds/2026-11-22/'+id+'/';
  const e=JSON.parse(await readFile(root+'evidence.json','utf8'));
  assert.equal(e.kind,'DOT2_PUBLIC_CAPTURE_EVIDENCE');
  for(const r of e.api_evidence){
   const raw=await readFile(r.body_path,'utf8');
   assert.equal(sha(raw),r.response_sha256);
   rawFiles[r.body_path]=raw;
   apiEvidence.push(r);
  }
 }
 return {apiEvidence,rawFiles,asOfUtc:new Date().toISOString()};
}
test('Seven persisted ORIGINAL November GitHub research runs replay with six chains and archived 429 intact',async()=>{
 const src=await archive(),report=replayArchivedSixChainEvidence(src);
 assert.equal(report.archive_failures.length,0);
 assert.equal(report.chains.length,6);
 assert.equal(report.chains_with_at_least_one_prior_real_http200,6);
 assert.equal(report.total_original_http429_pages,3);
 assert.ok(report.total_original_http200_pages>=19);
 assert.ok(report.unique_pool_keys_from_these_replayed_pages>=400);
 assert.equal(report.historical_price_sample_window_is_november_only,true);
 assert.equal(report.full_market_coverage_pct,null);
 assert.equal(report.actual_network_requests,0);
 assert.equal(report.actual_gpt_reviews,0);
 assert.equal(report.orders_authorized,0);
 assert.ok(report.pages_replayed.filter(p=>p.http_status===200)
  .every(p=>p.original_received_at_utc.startsWith('2026-11-22')));
 assert.ok(report.research_pairs.every(p=>p.observed_quote_not_executable
  &&p.original_october_information_not_available&&p.paper_buy_authorized===false));
});
test('All seven archived source run IDs present; impossible to rewrite 429 into HTTP200',async()=>{
 const src=await archive();
 const original=src.apiEvidence.find(x=>x.http_status===429);
 assert.ok(original);
 const mutated=structuredClone(src);
 const target=mutated.apiEvidence.find(x=>x.body_path===original.body_path);
 target.http_status=200;
 const bad=replayArchivedSixChainEvidence(mutated);
 assert.ok(bad.archive_failures.some(x=>x.reason==='UNEXPECTED_PROVIDER_STATUS'
  ||x.reason==='HTTP_RESPONSE_NOT_OK'||x.reason==='SOURCE_BYTES_VERIFIED'));
 assert.equal(bad.orders_authorized,0);
});
test('New seven-capture research CLI writes only isolated reports, not signal, accounts, GPT outputs or APIs',async()=>{
 const s=await readFile('scripts/v19-seven-run-prospective-source-audit.mjs','utf8');
 assert.match(s,/replayArchivedSixChainEvidence/);
 assert.match(s,/original_receipts_count/);
 assert.doesNotMatch(s,/\bfetch\s*\(|\bhttps?\.request\s*\(|\bexecFileSync\s*\(/);
 assert.doesNotMatch(s,/publishPaperOrder|settlePaper|\.r29-cleanpaper/);
 const index=JSON.parse(await readFile('signals/index.json','utf8'));
 assert.deepEqual(index.orders,[]);
});
