import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {runDailyBlindReplay,scoreSealedReplay} from './historical-blind-replay.mjs';

const file=path.join(path.dirname(fileURLToPath(import.meta.url)),
 'fixtures','historical-public-five-cases-20261110.json');
const manifest=JSON.parse(readFileSync(file,'utf8'));
const opts={budget_test_usdc:5000,preferred_test_usdc:50};
test('5 historical public cases each replay exactly 45 UTC days without future data, 0 proved historical buys',()=>{
 assert.equal(manifest.cases.length,5);
 const ids=new Set(),names=new Set();
 for(const c of manifest.cases){
  assert(!ids.has(c.scenario_id));ids.add(c.scenario_id);
  const {ground_truth_reserved_for_scoring:truth,...publicFeed}=c;
  assert(!Object.hasOwn(publicFeed,'case_name'),'blind engine must never see target label');
  assert(!Object.hasOwn(publicFeed,'first_reliable_breakout_time_utc'),'no outcome label to detector');
  const r=runDailyBlindReplay({...publicFeed,events:c.replay_events,...opts});
  const scored=scoreSealedReplay(r,truth);
  names.add(scored.case_name);
  assert.equal(r.total_days,45,c.scenario_id);
  assert.equal(r.daily.length,45);
  assert.equal(r.submitted_evidence,c.replay_events.length);
  assert.equal(r.admitted_historical_captures,0,'present-day sources are not original as-of captures');
  assert.equal(r.paper_buys,0);
  assert.equal(r.paper_sells,0);
  assert.equal(r.virtual_cash_changed,false);
  assert.equal(scored.timely_detection_verified,false);
  assert.equal(scored.simulated_buy_verified,false);
  assert.equal(scored.simulated_sell_verified,false);
  assert.equal(scored.status,'UNTESTABLE_AS_HISTORICAL_TRADING_PERFORMANCE');
  assert(r.daily.every(d=>d.execution==='BLOCKED_REAL_VALIDATOR_UNAVAILABLE'));
 }
 assert.equal(names.size,5);
});
function ev(kind,published,captured,urlHost='market.example'){
 const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40);
 return {
  source_kind:kind,source_url:'https://'+urlHost+'/original',
  original_published_at_utc:published,historical_capture_at_utc:captured,
  historical_capture_verified:true,
  archive_url:'https://web.archive.org/web/'+captured.replace(/[-:TZ]/g,'').slice(0,14)+'/https://'+urlHost+'/original',
  chain:'base',token_address:token,pool_address:pool,
  candidate_id:'base:'+token+':'+pool,
  ...(kind==='POOL_MARKET'?{price_usd:.01,liquidity_usd:35000}:{}),
  paper_only:true,actionable:false
 };
}
const now='2024-01-02T08:00:00Z',captured='2024-01-02T09:00:00Z';
const base={scenario_id:'R77',window_start_utc:'2024-01-01T00:00:00Z',
 window_end_utc:'2024-01-10T23:59:59Z',...opts};
test('independent archive captures only become visible from their actual capture date onward',()=>{
 const on=ev('ONCHAIN_POOL',now,captured,'explorer.example');
 const price=ev('POOL_MARKET',now,captured,'price.example');
 const delayed=ev('SOCIAL_ORIGINAL',now,'2024-01-09T10:00:00Z','social.example');
 const r=runDailyBlindReplay({...base,events:[on,price,delayed]});
 assert.equal(r.daily[0].available_archived_events,0,'Jan 1 cannot know Jan 2 events');
 assert.equal(r.daily[1].available_archived_events,2);
 assert.equal(r.daily[1].possible_verified_pool_identities,1);
 assert.equal(r.daily[1].candidates_with_market_and_two_hosts,1);
 assert.equal(r.daily[7].available_archived_events,2,'Jan 8 cannot read Jan 9 archived post');
 assert.equal(r.daily[8].available_archived_events,3);
 assert.equal(r.paper_buys,0,'confirmed archived sources alone do not bypass risk / signed quorum');
});
test('article published during launch but first archived after historic pump cannot be backdated',()=>{
 const late=ev('SOCIAL_ORIGINAL',now,'2024-01-09T10:00:00Z');
 const r=runDailyBlindReplay({...base,events:[late]});
 assert.equal(r.daily[1].available_archived_events,0);
 assert.equal(r.daily[8].available_archived_events,1);
 assert.equal(r.paper_buys,0);
});
test('untrusted urls, missing historical archive, forged captured timestamp and executable source fail closed',()=>{
 const fake=ev('POOL_MARKET',now,captured);
 const rows=[{...fake,archive_url:'https://example.com/not-an-archive'},
  {...fake,historical_capture_verified:false},
  {...fake,archive_url:'https://web.archive.org/web/20240109090000/https://market.example/original'},
  {...fake,actionable:true},
  {...fake,price_usd:0}];
 const r=runDailyBlindReplay({...base,events:rows});
 assert.equal(r.admitted_historical_captures,0);
 assert.equal(r.paper_buys,0);
 assert(Object.values(r.rejected_evidence).reduce((a,b)=>a+b,0)>=5);
});
test('the target envelope can only be scored after the blind timeline, and mismatched ground truth errors',()=>{
 const r=runDailyBlindReplay({...base,events:[]});
 assert.throws(()=>scoreSealedReplay(r,{scenario_id:'R42'}),/MISMATCH/);
 const scored=scoreSealedReplay(r,{scenario_id:'R77',case_name:'Private label only'});
 assert.equal(scored.case_name,'Private label only');
 assert(!JSON.stringify(r).includes('Private label'));
});
