import test from 'node:test';
import assert from 'node:assert/strict';
import {assessIndicativePages,EvidenceGap} from '../src/indicative-web-evidence.mjs';
import {newState,settlePaper} from '../src/core.mjs';
const coin={chain:'robinhood',contract:'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',pool:'0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',symbol:'DEMO'};
const now='2026-11-21T14:00:00Z',seen='2026-11-21T13:59:00Z';
const pages=[
 {source_url:'https://www.geckoterminal.com/robinhood/pools/'+coin.pool,price_usdc:.001,liquidity_usdc:25000,token_contract:coin.contract},
 {source_url:'https://dexscreener.com/robinhood/'+coin.pool,price_usdc:.00101,liquidity_usdc:26000}
].map((x,i)=>({...x,captured_at_utc:seen,provider_quote_asof_utc:null,
 source_archive_path:'research/snapshots/2026-11-21/example-'+i+'.json',source_archive_blob_sha:'a'.repeat(40)}));
const assess=rows=>assessIndicativePages({coin,pages:rows,decision_at_utc:now});
const reason=rows=>{try{assess(rows);return null;}catch(e){assert.ok(e instanceof EvidenceGap);return e.code;}};
test('contemporaneous displayed page observations may support INDICATIVE PAPER only, without fictional provider quote asof',()=>{
 const r=assess(pages);
 assert.equal(r.quote_quality,'INDICATIVE_WEB_ONLY');
 assert.equal(r.provider_quote_asof_verified,false);
 assert.equal(r.git_blob_verification_required,true);
 const order={id:'demo-paper-robinhood-0001',mode:'PAPER',authority:'dot-4-strategy',action:'BUY',
 dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],reason:'Isolated test of two archived indicative web page captures',coin,
 amount_test_usdc:50,created_at:now,expires_at:'2026-11-21T14:02:00Z',...{quote_quality:r.quote_quality,quotes:r.quotes}};
 assert.equal(settlePaper(order,newState(),Date.parse(now)).receipt.status,'PAPER_FILLED');
});
test('reject stale captures, unknown blobs, different pool or domain',()=>{
 assert.equal(reason([{...pages[0],captured_at_utc:'2026-11-21T13:40:00Z'},pages[1]]),'STALE_OR_FUTURE_CAPTURE');
 assert.equal(reason([{...pages[0],source_archive_blob_sha:null},pages[1]]),'IMMUTABLE_SOURCE_EVIDENCE_MISSING');
 assert.equal(reason([pages[0],{...pages[1],source_url:'https://dexscreener.com/robinhood/0x'+'c'.repeat(40)}]),'SOURCE_POOL_MISMATCH');
 assert.equal(reason([pages[0],{...pages[1],source_url:'https://geckoterminal.com/robinhood/pools/'+coin.pool}]),'DUPLICATE_DOMAIN');
});
test('reject price disagreement and false token contract',()=>{
 assert.equal(reason([pages[0],{...pages[1],price_usdc:.002}]),'SOURCE_PRICE_DISAGREEMENT');
 assert.equal(reason([pages[0],{...pages[1],token_contract:'0x'+'c'.repeat(40)}]),'TOKEN_CONTRACT_MISMATCH');
});
