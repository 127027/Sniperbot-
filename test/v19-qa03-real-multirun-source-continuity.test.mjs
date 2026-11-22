import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {summarizeCumulativeScanProgress} from '../src/v19-cumulative-scan-progress.mjs';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const chains=['solana','base','ethereum','bsc','robinhood','cronos'];

test('QA-03: all indexed growing page snapshots retain original raw SHA and old baseline successes are immutable',async()=>{
 const coverage=JSON.parse(await readFile('research/state/page-coverage.json','utf8'));
 const sources=[],ids=new Set();
 for(const [chain,row] of Object.entries(coverage.chains)){
  for(const [number,page] of Object.entries(row.pages)){
   const path=page.last_source_path;
   const m=path?.match(/^research\/feeds\/\d{4}-\d{2}-\d{2}\/(\d+)\/gecko-(solana|base|ethereum|bsc|robinhood|cronos)-page([1-9]\d*)\.raw\.json$/);
   assert.ok(m,'missing well-formed original raw path '+path);
   const [_,id,rawChain,rawPage]=m;
   assert.equal(rawChain,chain);
   assert.equal(Number(rawPage),Number(number));
   const [raw,evidenceText]=await Promise.all([
    readFile(path,'utf8'),readFile(path.slice(0,path.lastIndexOf('/')+1)+'evidence.json','utf8')
   ]);
   const digest=sha(raw);
   assert.equal(digest,page.last_sha256,'a previously indexed original HTTP response was rewritten: '+path);
   const evidence=JSON.parse(evidenceText);
   const receipt=evidence.api_evidence.find(r=>r.body_path===path);
   assert.ok(receipt,'no original provider receipt for indexed page '+path);
   assert.equal(receipt.provider,'GECKOTERMINAL');
   assert.equal(receipt.http_status,200);
   assert.equal(receipt.response_sha256,digest);
   assert.ok(Date.parse(page.last_success_at_utc)<=
    Date.parse(coverage.last_recorded_at_utc));
   ids.add(id);
   sources.push({chain,page:Number(number),runId:id,sha:digest});
  }
 }
 // Current indexed pages GROW when an old missing 429 page is recovered;
 // the original 15 successes from the FIRST three capture runs stay immutable.
 assert.ok(sources.length>=16,'new Base page2 HTTP200 recovery was lost');
 let historic200=0;
 for(const runId of ['45036887325','45044300013','45057658912']){
  const base='research/feeds/2026-11-22/'+runId+'/';
  const evidence=JSON.parse(await readFile(base+'evidence.json','utf8'));
  for(const receipt of evidence.api_evidence.filter(x=>
    x.provider==='GECKOTERMINAL'&&x.http_status===200)){
   historic200++;
   const raw=await readFile(receipt.body_path,'utf8');
   assert.equal(sha(raw),receipt.response_sha256,'original old successful page rewritten');
  }
 }
 assert.equal(historic200,15,'original three-run HTTP200 archive lost');
 const fixed=summarizeCumulativeScanProgress({coverage,networks:chains,
  asOfUtc:new Date().toISOString(),targetPagesPerChain:10});
 assert.equal(fixed.numerator_successful_unique_chain_pages,sources.length);
 assert.equal(fixed.denominator_fixed_planned_chain_pages,60);
 assert.equal(fixed.captured_plan_progress_pct,Math.round(sources.length/60*10000)/100);
 assert.equal(fixed.total_known_meme_market_coverage_pct,null);
 assert.equal(fixed.actual_gpt_reviews,0);
 assert.equal(fixed.orders_authorized,0);
});

test('QA-03: archived Base2 HTTP429 is preserved while the later bounded real HTTP200 repairs the missing page',async()=>{
 const before=JSON.parse(await readFile(
  'research/feeds/2026-11-22/45057658912/evidence.json','utf8'));
 const failed=before.api_evidence.find(r=>r.body_path.endsWith('/gecko-base-page2.raw.json'));
 assert.ok(failed);
 assert.equal(failed.http_status,429);
 const raw429=await readFile(failed.body_path,'utf8');
 assert.equal(sha(raw429),failed.response_sha256);
 assert.equal(before.published_paper_orders,0);
 const base='research/feeds/2026-11-22/45064131641/';
 const recovered=JSON.parse(await readFile(base+'evidence.json','utf8'));
 const http200=recovered.api_evidence.find(r=>r.body_path.endsWith('/gecko-base-page2.raw.json'));
 assert.ok(http200,'actual later captured page2 HTTP200 missing');
 assert.equal(http200.http_status,200);
 assert.ok(Date.parse(http200.received_at_utc)>Date.parse(failed.received_at_utc));
 assert.equal(sha(await readFile(http200.body_path,'utf8')),http200.response_sha256);
 const report=JSON.parse(await readFile(base+'page-coverage-report.json','utf8'));
 assert.equal(report.updated_memory.chains.base.pages[2].last_sha256,
  http200.response_sha256);
 assert.equal(report.updated_memory.chains.base.pending_pages.includes(2),false);
 assert.equal(recovered.published_paper_orders,0);
});
