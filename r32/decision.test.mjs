import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMint,RISK_SCOPE} from './risk.mjs';
import {decide,applyBuy,monitor,paperBudgetRaw} from './decision.mjs';
import {fresh} from './paper.mjs';
import {USDC} from './providers.mjs';
const now=Date.parse('2026-11-28T14:00:00Z'),at=new Date(now).toISOString(),a='A'.repeat(32);
const fx={status:'DAILY_REFERENCE_NOT_LIVE_FX',usd_per_eur:1,reference_date:'2026-11-27',retrieved_at:at};
const route=(i,o,amount,out)=>({input_mint:i,output_mint:o,in_raw:amount,out_raw:out,retrieved_at:at,status:'QUOTED_NOT_EXECUTED'});
const candidate=()=>({dot_signal:{mode:'PAPER_ONLY',chain:'solana',address:a,action:'BUY',observed_at:at,expires_at:new Date(now+3600000).toISOString(),rank:1,thesis:'fixture',sources:['https://example.org/source'],risks:[]},chain:'solana',address:a,meme_status:'VERIFIED_MEME',meme_source:'fixture',meme_observed_at:at,
 market_stale:false,market:{symbol:'FIXTURE',retrieved_at:at,liquidity_usd:50000,volume_1h_usd:90000,pair_created_at:now-3600000,buys_5m:30,sells_5m:10,change_1h_pct:40},
 risk_evidence:{chain:'solana',address:a,risk:'PASS',scope:RISK_SCOPE,observed_at:at},fx,
 roundtrip:{chain:'solana',address:a,mode:'PAPER_ONLY',route_evidence:'BIDIRECTIONAL_QUOTED',
 buy:route(USDC,a,paperBudgetRaw(fx,now),'1000000'),sell:route(a,USDC,'1000000','49000000')}});
test('same evidence contract generates BUY and local paper fill, independent devices',()=>{
 const c=candidate(), sig=decide([c,c],now).buys[0],s={...fresh(),enabled:true};
 assert.equal(sig.action,'BUY');assert.equal(decide([c,c],now).buys.length,1);
 const first=applyBuy(s,sig,c,now);assert.equal(first.reason,'BOUGHT');assert.equal(first.state.cash,45000);
 assert.equal(applyBuy(first.state,sig,c,now+1000).reason,'ALREADY_HELD');
 assert.equal(applyBuy({...fresh(),enabled:true},sig,c,now+1000).reason,'BOUGHT');
 assert.equal(applyBuy(s,sig,c,now+120000).reason,'LOCAL_VALIDATION_FAILED');
 assert.equal(applyBuy(s,sig,c,now+3600000).reason,'INVALID_ADVISORY');
});
test('unknown risk, missing sale route and unverified meme all block',()=>{
 for(const change of [{risk_evidence:{}},{roundtrip:{}},{dot_signal:undefined}]){
  const r=decide([{...candidate(),...change}],now);assert.equal(r.buys.length,0);assert.ok(r.blocked[0].reasons.length);
 }
});
test('pause stops entries, but exit remains independent; no fake sell on data failure',()=>{
 const c=candidate(),sig=decide([c],now).buys[0],first=applyBuy({...fresh(),enabled:true},sig,c,now).state;
 const s={...first,enabled:false},id=s.positions[0].id;
 assert.equal(applyBuy(s,sig,c,now).reason,'OFF');
 const missing=monitor(s,id,{fx},now);assert.equal(missing.state.positions.length,1);assert.equal(missing.state.cash,45000);
 const exit=monitor(s,id,{fx,quote:route(a,USDC,'1000000','35000000')},now);
 assert.equal(exit.reason,'STOP_LOSS');assert.equal(exit.state.cash,48490);assert.equal(exit.state.positions.length,0);
 assert.equal(exit.state.history[1].pnl,-15.1);
});
test('onchain authority fails; RPC failure unknown; scoped classic checks pass fixture',async()=>{
 const mock=async(_url,opts)=>{const method=JSON.parse(opts.body).method;
 const value=method==='getAccountInfo'?{owner:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',data:{parsed:{type:'mint',info:{isInitialized:true,supply:'10000',decimals:6,mintAuthority:null,freezeAuthority:null}}}}:
 [{address:'B'.repeat(32),amount:'1000',decimals:6}];
 return {ok:true,json:async()=>({result:{context:{slot:100},value}})}};
 assert.equal((await inspectMint(a,mock,()=>now,{heliusKey:'fixture-only'})).risk,'PASS');
 assert.equal((await inspectMint(a,async()=>({ok:false,status:429}),()=>now)).risk,'UNKNOWN');
 assert.equal((await inspectMint(a,async(u,o)=>{const r=await mock(u,o);const j=await r.json();j.result.value.data.parsed.info.mintAuthority=a;return {ok:true,json:async()=>j}},()=>now)).risk,'FAIL');
});
