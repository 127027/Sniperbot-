import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {summarizeCumulativeScanProgress} from '../src/v19-cumulative-scan-progress.mjs';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const ids=['45064131641','45064898786'];

test('SYS-11/QA-03: BOTH real post-429 GitHub captures store all 7 original HTTP200 bodies with correct SHA',async()=>{
 let gecko=0,dex=0,seen=new Set();
 for(const id of ids){
  const root='research/feeds/2026-11-22/'+id+'/';
  const [e,pre,completion]=await Promise.all([
   read(root+'evidence.json'),read(root+'restart-preflight.json'),
   read(root+'capture-completion-verdict.json')
  ]);
  assert.equal(e.kind,'DOT2_PUBLIC_CAPTURE_EVIDENCE');
  assert.equal(pre.status,'READY_TO_ATTEMPT_BOUNDED_RESEARCH');
  assert.equal(completion.status,'BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE');
  assert.ok(e.api_evidence.length>=3);
  for(const r of e.api_evidence){
   assert.equal(r.http_status,200,'post-cooldown provider should have succeeded');
   assert.equal(r.http_ok,true);
   assert.ok(r.body_path.startsWith(root));
   assert.equal(sha(await readFile(r.body_path,'utf8')),r.response_sha256);
   if(r.provider==='GECKOTERMINAL')gecko++;
   else if(r.provider==='DEXSCREENER')dex++;
   else assert.fail('unexpected provider: '+r.provider);
   assert.ok(!seen.has(r.body_path),'duplicate raw receipt');
   seen.add(r.body_path);
  }
  assert.equal(e.published_paper_orders,0);
  assert.equal(e.verified_client_fills,0);
  assert.equal(e.metrics.actionable_orders,0);
 }
 assert.equal(gecko,3);
 assert.equal(dex,4);
 assert.equal(seen.size,7);
});

test('QA-03: late Base-page2 success repairs older 429 yet old HTTP429 raw is forever preserved',async()=>{
 const [old,recovered,recoveryCoverage]=await Promise.all([
  read('research/feeds/2026-11-22/45057658912/evidence.json'),
  read('research/feeds/2026-11-22/45064131641/evidence.json'),
  read('research/feeds/2026-11-22/45064131641/page-coverage-report.json')
 ]);
 const failed=old.api_evidence.find(x=>x.body_path.endsWith('/gecko-base-page2.raw.json'));
 const success=recovered.api_evidence.find(x=>x.body_path.endsWith('/gecko-base-page2.raw.json'));
 assert.equal(failed.http_status,429);
 assert.equal(success.http_status,200);
 assert.equal(sha(await readFile(failed.body_path,'utf8')),failed.response_sha256);
 assert.equal(sha(await readFile(success.body_path,'utf8')),success.response_sha256);
 assert.ok(Date.parse(success.received_at_utc)>Date.parse(failed.received_at_utc));
 assert.equal(recoveryCoverage.updated_memory.chains.base.pages[2].last_sha256,success.response_sha256);
 assert.equal(recoveryCoverage.updated_memory.chains.base.pending_pages.includes(2),false);
 const coverage=await read('research/state/page-coverage.json');
 assert.ok(coverage.chains.base.pages[2]);
 assert.ok(coverage.chains.ethereum.pages[4]);
 const progress=summarizeCumulativeScanProgress({coverage,
  networks:['solana','base','ethereum','bsc','robinhood','cronos'],
  asOfUtc:new Date().toISOString(),targetPagesPerChain:10});
 assert.ok(progress.numerator_successful_unique_chain_pages>=17);
 assert.equal(progress.denominator_fixed_planned_chain_pages,60);
 assert.equal(progress.total_known_meme_market_coverage_pct,null);
});

test('SYS-12/D1-05: immutable old 488 pool memories preserved while real multi-run archive has at least 546',async()=>{
 const [memory,budget,latest]=await Promise.all([
  read('research/state/market-memory.json'),read('research/state/provider-budget.json'),
  read('research/state/latest.json')
 ]);
 const count=Object.keys(memory.pools||{}).length;
 assert.ok(count>=546,'latest real HTTP200 growth was lost');
 assert.equal(memory.stats.total_discovered,count);
 assert.ok(memory.stats.first_dot2_detected_count>=137);
 assert.ok(latest.stats.total_discovered>=546);
 assert.equal(budget.providers.GECKOTERMINAL.last_http_status,200);
 assert.equal(budget.providers.GECKOTERMINAL.consecutive_429,0);
 assert.equal(budget.providers.GECKOTERMINAL.cooldown_until_utc,null);
 assert.ok(memory.ingested_sources.some(s=>s.includes('/45064131641/')));
 assert.ok(memory.ingested_sources.some(s=>s.includes('/45064898786/')));
});

test('News/media metadata and separate source provenance archived, no actual GPT trading claimed',async()=>{
 for(const id of ids){
  const evidence=await read('research/media/2026-11-22/'+id+'/evidence.json');
  assert.equal(evidence.kind,'R29_PUBLIC_MEDIA_CAPTURE_EVIDENCE');
  assert.ok(evidence.counts.available>0);
  assert.ok(evidence.counts.accepted_events>0);
  assert.equal(evidence.orders,0);
 }
 const index=await read('signals/index.json');
 assert.deepEqual(index.orders,[]);
});
