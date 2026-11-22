import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAsOfEvidence} from '../src/v19-asof-evidence.mjs';
import {checkUnifiedEvidence} from '../src/v18-shared-evidence-gate.mjs';

const asOfUtc='2026-10-12T09:35:00.000Z';
const at='2026-10-12T09:34:00.000Z';
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40)};
const urls=['https://www.geckoterminal.com/base/pools/'+coin.pool,
 'https://dexscreener.com/base/'+coin.pool];
function snapshot(){
 return {
  provenance:'CONTEMPORANEOUS_RECORD',source_class:'ORIGINAL_CAPTURE',
  observed_at_utc:at,archived_at_utc:at,available_at_utc:at,source_archive_sha:'a'.repeat(40),
  coin,discovery:{observed_at_utc:at},risk:{status:'PAPER_ELIGIBLE',observed_at_utc:at},
  quotes:urls.map((source_url,i)=>({chain:coin.chain,contract:coin.contract,pool:coin.pool,
   price_usdc:.001,liquidity_usdc:20000,provider_id:'p'+i,source_url,
   observed_at:at,source_published_at_utc:at}))
 };
}
test('claimed contemporaneous capture is time-usable but not independently authenticated',()=>{
 const v=classifyAsOfEvidence(snapshot(),{asOfUtc});
 assert.equal(v.status,'PROVISIONAL_ASOF');
 assert.equal(v.original_source_authenticity_proven,false);
 assert.equal(checkUnifiedEvidence(snapshot(),Date.parse(asOfUtc)),null);
});
test('future user-availability rejects a backdated supposed original capture',()=>{
 const s=snapshot();s.available_at_utc='2026-10-12T10:00:00.000Z';
 assert.equal(classifyAsOfEvidence(s,{asOfUtc}).reason,'NOT_YET_AVAILABLE_AT_VIRTUAL_TIME');
 assert.equal(checkUnifiedEvidence(s,Date.parse(asOfUtc)),'ASOF_NOT_YET_AVAILABLE_AT_VIRTUAL_TIME');
});
test('retrospective October candle downloaded in November is never a historical original',()=>{
 const s=snapshot();s.source_class='RETRO_ASOF_RECONSTRUCTION';
 s.archived_at_utc='2026-11-22T09:34:00.000Z';
 s.available_at_utc=s.archived_at_utc;
 const v=classifyAsOfEvidence(s,{asOfUtc});
 assert.equal(v.status,'RETROSPECTIVE_RESEARCH_ONLY');
 assert.equal(v.captured_after_virtual_time,true);
 assert.equal(checkUnifiedEvidence(s,Date.parse(asOfUtc)),
  'ASOF_RETRO_CANNOT_PROVE_ORIGINAL_DISCOVERY');
});
test('post-event oracle cannot enter entry signals regardless of forged early timestamp',()=>{
 const s=snapshot();s.source_class='POST_EVENT_ORACLE';
 assert.equal(classifyAsOfEvidence(s,{asOfUtc}).status,'POST_EVENT_ONLY');
 assert.equal(checkUnifiedEvidence(s,Date.parse(asOfUtc)),'ASOF_ORACLE_NOT_FOR_DECISIONS');
});
test('future price event and unverified malformed provider time are rejected',()=>{
 const s=snapshot();s.event_at_utc='2026-10-12T09:36:00.000Z';
 assert.equal(classifyAsOfEvidence(s,{asOfUtc}).reason,'INVALID_EVENT_CAPTURE_AVAILABILITY_ORDER');
 const q=snapshot();q.provider_quote_asof_utc='2026-10-12T10:36:00.000Z';
 assert.equal(classifyAsOfEvidence(q,{asOfUtc}).reason,'INVALID_PROVIDER_QUOTE_TIMESTAMP');
});
test('synthetic observations remain usable only for regression, never real proof',()=>{
 const s=snapshot();s.source_class='SYNTHETIC_TEST';s.provenance='SYNTHETIC_TEST';
 const v=classifyAsOfEvidence(s,{asOfUtc});
 assert.equal(v.status,'SYNTHETIC_REGRESSION_ONLY');
 assert.equal(v.usable_for_historical_trade,false);
 assert.equal(checkUnifiedEvidence(s,Date.parse(asOfUtc)),null);
});
