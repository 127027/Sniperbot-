import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {summarizeCumulativeScanProgress} from '../src/v19-cumulative-scan-progress.mjs';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const chains=['solana','base','ethereum','bsc','robinhood','cronos'];

test('QA-03: all 15 real page-index snapshots across three actual GitHub captures retain raw HTTP200+matching SHA',async()=>{
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
 assert.equal(sources.length,15,'known GitHub baseline has 15 independently archived page snapshots');
 assert.deepEqual([...ids].sort(),['45036887325','45044300013','45057658912']);
 const fixed=summarizeCumulativeScanProgress({coverage,networks:chains,
  asOfUtc:'2026-11-22T19:14:16.000Z',targetPagesPerChain:10});
 assert.equal(fixed.numerator_successful_unique_chain_pages,15);
 assert.equal(fixed.denominator_fixed_planned_chain_pages,60);
 assert.equal(fixed.captured_plan_progress_pct,25);
 assert.equal(fixed.total_known_meme_market_coverage_pct,null);
 assert.equal(fixed.actual_gpt_reviews,0);
 assert.equal(fixed.orders_authorized,0);
});

test('QA-03: earlier HTTP429 for Base page2 is still a durable backlog item, not one of the 15 HTTP200s',async()=>{
 const coverage=JSON.parse(await readFile('research/state/page-coverage.json','utf8'));
 assert.equal(coverage.chains.base.pages[2],undefined);
 assert.ok(coverage.chains.base.pending_pages.includes(2));
 const evidence=JSON.parse(await readFile(
  'research/feeds/2026-11-22/45057658912/evidence.json','utf8'));
 const original=evidence.api_evidence.find(r=>r.body_path.endsWith('/gecko-base-page2.raw.json'));
 assert.ok(original);
 assert.equal(original.http_status,429);
 const raw=await readFile(original.body_path,'utf8');
 assert.equal(sha(raw),original.response_sha256);
 assert.equal(evidence.published_paper_orders,0);
});
