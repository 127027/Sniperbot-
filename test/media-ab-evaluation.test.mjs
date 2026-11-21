import test from 'node:test';
import assert from 'node:assert/strict';
import {makePairedMediaMarketRankings,evaluatePairedAB} from '../src/media-ab-evaluation.mjs';
import {emptyMediaMemory} from '../src/media-research.mjs';
const time='2026-11-21T21:00:00Z',contract='0x'+'a'.repeat(40);
function rank(){return {kind:'R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING',
 as_of_utc:time,candidates:[
 {key:'base:one',chain:'base',contract,score:5},
 {key:'base:two',chain:'base',contract:'0x'+'b'.repeat(40),score:6}
 ]};}
test('B uses same exact market universe, and future news is excluded even if published earlier',()=>{
 const memory=emptyMediaMemory();
 memory.events.a={headline:'New token '+contract,url:'https://example.org/a',
  published_at_utc:'2026-11-21T20:00:00Z',first_captured_at_utc:'2026-11-21T21:15:00Z'};
 const out=makePairedMediaMarketRankings({marketRanking:rank(),mediaMemory:memory});
 assert.equal(out.same_candidate_count,2);
 assert.equal(out.matched_contract_mentions,0);
 assert.deepEqual(out.market_plus_media.candidates.map(x=>x.key),out.market_only.candidates.map(x=>x.key));
 assert.equal(evaluatePairedAB({paired:out}).status,'WAIT_FOR_MATURED_FORWARD_LABELS');
});
test('real as-of exact contract can contribute a capped research bonus but never grants BUY',()=>{
 const memory=emptyMediaMemory();
 memory.events.a={headline:'News about '+contract,url:'https://example.org/a',
  published_at_utc:'2026-11-21T20:00:00Z',first_captured_at_utc:'2026-11-21T20:10:00Z'};
 const out=makePairedMediaMarketRankings({marketRanking:rank(),mediaMemory:memory});
 assert.equal(out.matched_contract_mentions,1);
 assert.equal(out.market_plus_media.candidates[0].key,'base:one');
 assert.equal(out.trading_authorized,false);
 assert.equal(out.market_plus_media.candidates[0].media_is_not_risk_approval,true);
});
test('generic DOGE or Trump story must not boost a different fake contract',()=>{
 const memory=emptyMediaMemory();
 memory.events.a={headline:'Trump DOGE viral meme',url:'https://example.org/a',
  published_at_utc:'2026-11-21T20:00:00Z',first_captured_at_utc:'2026-11-21T20:10:00Z'};
 const out=makePairedMediaMarketRankings({marketRanking:rank(),mediaMemory:memory});
 assert.equal(out.matched_contract_mentions,0);
});
