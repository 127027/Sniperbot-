import test from 'node:test';
import assert from 'node:assert/strict';
import {digest} from './engine.mjs';
import {shadowIntents} from './r25-shadow-intents.mjs';
const at='2026-06-12T12:00:00.000Z';
const e=(id,kind,minute,more={})=>({
 id,kind,candidate_id:'sol:fixture-only',event_at:'2026-06-12T11:'+String(minute).padStart(2,'0')+':00.000Z',
 available_at:'2026-06-12T11:'+String(minute).padStart(2,'0')+':00.000Z',
 evidence:{type:'FIXTURE',verified:true,ref:'fixture:'+id},...more});
const make=(events,positions={})=>{
 const body={schema:'dot_replay_frame.v1',index:0,at,events,
  portfolio:{cash:5000,quote_asset:'TEST_USDC',positions},data_class:'SYNTHETIC'};
 return {...body,input_hash:digest(body)};
};
const pool=e('p','POOL',1,{chain:'solana',token:'fixture',pool:'x'});
const m1=e('m1','MARKET',49,{reserve_quote:100,reserve_token:1000,fee_bps:30,gas_quote:0.01,quote_asset:'TEST_USDC',execution_verified:true});
const m2=e('m2','MARKET',59,{reserve_quote:130,reserve_token:1000,fee_bps:30,gas_quote:0.01,quote_asset:'TEST_USDC',execution_verified:true});
const security=e('s','SECURITY',59,{buy_allowed:true,sell_allowed:true,scope:'BLOCK_STATE'});
const social=e('soc','SOCIAL',58,{body:'meme discussion at as-of time',authors:['Alice','Bob'],interactions:22});
test('BUY_INTENT is a hypothesis, not a fill; score cannot be called probability',()=>{
 const x=shadowIntents(make([pool,m1,m2,security,social]));
 assert.equal(x.buy_intents,1);
 assert.equal(x.results[0].action,'BUY_INTENT');
 assert.equal(x.results[0].proposed_paper_quote_amount,1000);
 assert.equal(x.results[0].score_is_breakout_probability,false);
 assert.equal(x.executed_trades,0);
});
test('lack of market/security evidence makes a source gap, never fabricated BUY',()=>{
 const x=shadowIntents(make([pool]));
 assert.equal(x.results[0].action,'DATA_GAP');
 assert.equal(x.buy_intents,0);
 assert.ok(x.results[0].blockers.includes('FRESH_BLOCK_SECURITY_MISSING'));
});
test('verified sellability failure refuses BUY even with momentum',()=>{
 const x=shadowIntents(make([pool,m1,m2,{...security,sell_allowed:false},social]));
 assert.equal(x.results[0].action,'REJECT');
});
test('existing held position yields SELL_INTENT on verified drawdown',()=>{
 const falling=e('md','MARKET',59,{...m2,reserve_quote:60,reserve_token:1000});
 const x=shadowIntents(make([pool,m1,falling,security],{'sol:fixture-only':{units:10,cost_basis:1}}));
 assert.equal(x.results[0].action,'SELL_INTENT');
 assert.equal(x.sell_intents,1);
});
test('cannot sneak future, unverified source, or modified input hash into actor',()=>{
 assert.throws(()=>shadowIntents(make([e('future','POOL',59,{available_at:'2026-06-13T11:00:00Z'})])),/LOOKAHEAD/);
 const x=shadowIntents(make([{...pool,evidence:{type:'ARCHIVE',verified:false,ref:'archive'}}]));
 assert.equal(x.source_candidates,0);
 assert.deepEqual(x.ignored_unverified_source_ids,['p']);
 const f=make([pool]);f.events[0].id='tampered';
 assert.throws(()=>shadowIntents(f),/FRAME_HASH/);
});