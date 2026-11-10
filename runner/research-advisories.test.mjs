import test from 'node:test';
import assert from 'node:assert/strict';
import {buildResearchAdvisories,RESEARCH_ROLE_IDS} from './research-advisories.mjs';
const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40),id='base:'+token+':'+pool;
const date='2026-11-10T06:00:00Z';
const candidate=(extra={})=>({chain:'base',token_address:token,pool_address:pool,
 candidate_id:id,observed_at_utc:date,source_urls:['https://dexpaprika.com/base/pool/'+pool],
 risk_flags:['SELLABILITY_UNKNOWN','LP_CONTROL_UNKNOWN'],...extra});
const watchlist={candidates:[{...candidate(),state:'DEEP_REVIEW',priority:'HIGH',
 first_seen_at_utc:date,reason:'Exact Base pool candidate with direct provider observation',
 unresolved_checks:['CONTRACT','SELLABILITY']}]};
function roles(list=RESEARCH_ROLE_IDS){
 return list.map(role=>({role,stale:false,candidates:[candidate()]}));
}
const settings={cashUsdc:3500,cashEur:0,minTrade:500,maxTrade:5000};
test('five roles mentioned a coin but it is NOT a signed five-of-five safety approval',()=>{
 const a=buildResearchAdvisories({roles:roles(),watchlist,settings,now:Date.parse(date)});
 assert.equal(a.total_unique_candidates,1);
 assert.equal(a.candidates[0].role_count,5);
 assert.equal(a.candidates[0].research_status,'PRIORITIZED_REVIEW');
 assert.equal(a.candidates[0].paper_entry_authorized,false);
 assert.equal(a.candidates[0].actionable,false);
 assert.equal(a.candidates[0].breakout_probability_pct,null);
 assert.equal(a.candidates[0].hypothetical_paper_range.minimum_test_usdc,50);assert.equal(a.candidates[0].hypothetical_paper_range.preferred_test_usdc,500);
 assert.equal(a.candidates[0].hypothetical_paper_range.maximum_test_usdc,3500);
 assert.equal(a.candidates[0].correlated_evidence_warning,true,'Repeated source is not independent');
 assert(a.candidates[0].required_checks.includes('NON_EXECUTING_SIZE_SPECIFIC_SELL_QUOTE'));
 assert(a.candidates[0].required_checks.includes('FIVE_INDEPENDENT_SIGNED_YES'));
});
test('missing social/contract review remains WATCH only; user budget is never a buy recommendation',()=>{
 const a=buildResearchAdvisories({roles:roles(['news_discovery','onchain_liquidity']),watchlist,
  settings:{minTrade:50,maxTrade:1000,cashUsdc:1000,cashEur:0},now:Date.parse(date)});
 assert.equal(a.candidates[0].role_count,2);
 assert.equal(a.candidates[0].research_status,'WATCH');
 assert.equal(a.candidates[0].hypothetical_paper_range.minimum_test_usdc,50);
 assert.equal(a.candidates[0].hypothetical_paper_range.maximum_test_usdc,1000);
 assert.match(a.verdict,/VALIDATOR_UNAVAILABLE/);
});
test('stale and wrong-chain mentions never count, invalid token never enters',()=>{
 const fake={...candidate(),pool_address:'0x'+'f'.repeat(40)};
 const a=buildResearchAdvisories({roles:[
  {role:'news_discovery',stale:true,candidates:[candidate()]},
  {role:'social_acceleration',stale:false,candidates:[fake]},
  {role:'onchain_liquidity',stale:false,candidates:[candidate()]},
  {role:'onchain_liquidity',stale:false,candidates:[candidate()]}
 ],watchlist,settings,now:Date.parse(date)});
 assert.deepEqual(a.candidates[0].roles_reporting,['onchain_liquidity']);
 assert.equal(a.candidates[0].role_count,1);
 assert.equal(a.candidates[0].independent_source_hosts,1);
});
test('funds below minimum never authorize even illustrative position',()=>{
 const a=buildResearchAdvisories({roles:roles(),watchlist,settings:{...settings,cashUsdc:40},now:Date.parse(date)});
 assert.equal(a.candidates[0].hypothetical_paper_range.minimum_test_usdc,null);
 assert.equal(a.candidates[0].hypothetical_paper_range.available,false);
 assert.equal(a.candidates[0].paper_entry_authorized,false);
});
test('bad wallet-like links and suspicious input never become open URLs or buy commands',()=>{
 const c=candidate({source_urls:['https://safe.example/address','javascript:alert(1)','https://user:password@evil.test/hide'],
  risk_flags:['HONEY_POT_UNKNOWN']});
 const a=buildResearchAdvisories({roles:[{role:'news_discovery',stale:false,candidates:[c]}],
  watchlist:{candidates:[]},settings,now:Date.parse(date)});
 assert.deepEqual(a.candidates[0].source_urls,['https://safe.example/address']);
 assert.equal(a.candidates[0].paper_entry_authorized,false);
 assert(a.candidates[0].required_checks.includes('HONEY_POT_UNKNOWN'));
});
