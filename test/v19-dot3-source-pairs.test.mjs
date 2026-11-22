import test from 'node:test';
import assert from 'node:assert/strict';
import {describeDot3SourceCapabilities,auditDot3QuoteSourcePair}
 from '../src/v19-dot3-source-pairs.mjs';

const at='2026-11-22T10:00:00.000Z',pool='0x'+'b'.repeat(40),
 contract='0x'+'a'.repeat(40),coin={chain:'base',pool,contract};
const one=(provider='GECKOTERMINAL',args={})=>({
 chain:'base',pool,contract,provider_id:provider,
 source_url:provider==='GECKOTERMINAL'?'https://www.geckoterminal.com/base/pools/'+pool:
  'https://dexscreener.com/base/'+pool,
 captured_at_utc:'2026-11-22T09:59:45.000Z',
 provider_quote_asof_utc:null,price_usdc:1,liquidity_usdc:20000,
 source_archive_blob_sha:null,...args});
test('each six-chain route is a probe template, NOT asserted provider availability',()=>{
 const x=describeDot3SourceCapabilities();
 assert.equal(x.chains.length,6);
 assert.equal(x.chains.every(x=>x.probes.length===2),true);
 assert.equal(x.chains.every(x=>x.probes.every(p=>p.endpoint_support==='REQUIRES_OBSERVED_HTTP_PROOF')),true);
 assert.equal(x.trades_authorized,0);
});
test('two distinct domains corroborate indicative research but upstream remains unknown',()=>{
 const x=auditDot3QuoteSourcePair({coin,asOfUtc:at,
  observations:[one(),one('DEXSCREENER',{price_usdc:1.01})]});
 assert.equal(x.status,'TWO_DOMAIN_INDICATIVE_ONLY');
 assert.equal(x.distinct_valid_domains,2);
 assert.equal(x.real_upstream_independence_proven,false);
 assert.equal(x.provider_quote_times_independently_verified,false);
 assert.equal(x.provider_chain_support_proven,false);
 assert.equal(x.trade_authorized,false);
});
test('duplicated sources from the same domain cannot impersonate independent quotes',()=>{
 const x=auditDot3QuoteSourcePair({coin,asOfUtc:at,
  observations:[one(),one('GECKOTERMINAL',{captured_at_utc:'2026-11-22T09:59:50.000Z'})]});
 assert.equal(x.distinct_valid_domains,1);
 assert.equal(x.status,'MISSING_SECOND_DISTINCT_DOMAIN');
});
test('wrong contract / pool, future capture and malformed price are excluded',()=>{
 const x=auditDot3QuoteSourcePair({coin,asOfUtc:at,observations:[
  one('GECKOTERMINAL',{contract:'0x'+'c'.repeat(40)}),
  one('GECKOTERMINAL',{pool:'0x'+'d'.repeat(40)}),
  one('GECKOTERMINAL',{captured_at_utc:'2026-11-22T10:10:00.000Z'}),
  one('GECKOTERMINAL',{price_usdc:0}),
  one()]});
 assert.equal(x.observations_structurally_matched,1);
 assert.equal(x.rejected.length,4);
});
test('same reported upstream is suspicious, even across two different domains',()=>{
 const x=auditDot3QuoteSourcePair({coin,asOfUtc:at,observations:[
  one('GECKOTERMINAL',{upstream_feed_id:'X'}),
  one('DEXSCREENER',{upstream_feed_id:'X'})]});
 assert.equal(x.status,'SAME_REPORTED_UPSTREAM');
 assert.equal(x.upstream_overlap_reported,true);
 assert.equal(x.real_upstream_independence_proven,false);
});
test('stale captures and indicative pricing conflicts cause explicit rechecks',()=>{
 const stale=auditDot3QuoteSourcePair({coin,asOfUtc:at,observations:[
  one('GECKOTERMINAL',{captured_at_utc:'2026-11-22T09:50:00.000Z'}),
  one('DEXSCREENER')]});
 assert.equal(stale.status,'HTTP_CAPTURE_STALE');
 const conflict=auditDot3QuoteSourcePair({coin,asOfUtc:at,observations:[
  one(),one('DEXSCREENER',{price_usdc:2})]});
 assert.equal(conflict.status,'INDICATIVE_PRICE_DISAGREEMENT');
 assert.equal(conflict.trade_authorized,false);
});
test('all chains can enter research diagnostics without permanent chain-only deny',()=>{
 const chains=['solana','ethereum','base','bsc','robinhood','cronos'];
 const meta=describeDot3SourceCapabilities({chains});
 assert.equal(meta.chains.length,6);
 assert.equal(meta.chains.every(c=>c.fallback_if_missing.includes('DATA_GAP')),true);
});

test('fresh HTTP snapshots with explicitly stale provider prices do not pass two-domain quote status',()=>{
 const x=auditDot3QuoteSourcePair({coin,asOfUtc:at,observations:[
  one('GECKOTERMINAL',{provider_quote_asof_utc:'2026-11-22T09:50:00.000Z'}),
  one('DEXSCREENER',{provider_quote_asof_utc:'2026-11-22T09:59:30.000Z'})
 ]});
 assert.equal(x.status,'PROVIDER_QUOTE_STALE');
 assert.equal(x.http_capture_pair_age_valid,true);
 assert.equal(x.full_quote_pair_age_valid,false);
 assert.equal(x.explicitly_stale_provider_quote_detected,true);
 assert.equal(x.next_action,'REFRESH_STALE_PROVIDER_QUOTE_AND_CHECK_ORIGIN');
 assert.equal(x.trade_authorized,false);
});
test('unknown provider quote as-of remains indicative and never claims full age proof',()=>{
 const x=auditDot3QuoteSourcePair({coin,asOfUtc:at,observations:[
  one('GECKOTERMINAL'),one('DEXSCREENER')
 ]});
 assert.equal(x.status,'TWO_DOMAIN_INDICATIVE_ONLY');
 assert.equal(x.http_capture_pair_age_valid,true);
 assert.equal(x.full_quote_pair_age_valid,false);
 assert.equal(x.provider_time_missing_count,2);
 assert.equal(x.provider_quote_times_independently_verified,false);
 assert.equal(x.trade_authorized,false);
});
test('two fresh claimed provider timestamps remain untrusted until independent origin evidence',()=>{
 const x=auditDot3QuoteSourcePair({coin,asOfUtc:at,observations:[
  one('GECKOTERMINAL',{provider_quote_asof_utc:'2026-11-22T09:59:40.000Z'}),
  one('DEXSCREENER',{provider_quote_asof_utc:'2026-11-22T09:59:30.000Z'})
 ]});
 assert.equal(x.status,'TWO_DOMAIN_INDICATIVE_ONLY');
 assert.equal(x.full_quote_pair_age_valid,true);
 assert.equal(x.real_upstream_independence_proven,false);
 assert.equal(x.provider_quote_times_independently_verified,false);
});
