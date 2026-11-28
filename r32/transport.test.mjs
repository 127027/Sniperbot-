import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQueue,Transport} from './transport.mjs';
test('public market payload excludes portfolio, credentials and arbitrary fields',()=>{
 const now=Date.now(),a='A'.repeat(32);
 const q=buildQueue({portfolio:{cash:123},token:'secret',candidates:[{chain:'solana',address:a,market_stale:false,secret:'secret',market:{retrieved_at:new Date(now).toISOString(),price_usd:1,secret:'secret'}}]},now);
 assert.equal(q.candidates.length,1);assert.equal(JSON.stringify(q).includes('secret'),false);assert.equal('portfolio' in q,false);
});
test('fixed branch write and exact readback',async()=>{
 let content,method;
 const f=async(url,o)=>{assert.ok(url.startsWith('https://api.github.com/repos/127027/Sniperbot-/contents/r32/local/queue.json'));if(o.method==='PUT'){const body=JSON.parse(o.body);assert.equal(body.branch,'r32-data');content=body.content;return {ok:true,status:200};}return content?{ok:true,json:async()=>({sha:'test',content})}:{ok:false,status:404};};
 const t=new Transport({fetcher:f,tokenProvider:async()=>'fixture'});assert.equal((await t.publish({candidates:[]},Date.now())).status,'PUBLISHED');
});

test('liquid actionable candidates precede missing and tiny liquidity; early research stays bounded',()=>{
 const now=Date.now(),at=new Date(now).toISOString();
 const row=(address,liq,volume)=>({chain:'solana',address,market_stale:false,first_seen:now-1000,
  market:{retrieved_at:at,pair_created_at:now-3600000,liquidity_usd:liq,volume_1h_usd:volume,buys_5m:30,sells_5m:10}});
 const rows=[row('A'.repeat(32),null,59088),row('B'.repeat(32),2.12,72981),row('C'.repeat(32),25000,30000),row('D'.repeat(32),6000,10000)];
 const q=buildQueue({candidates:rows},now);
 assert.deepEqual(q.candidates.map(x=>x.address),['C','D','A'].map(x=>x.repeat(32)));
 assert.equal(q.coverage.unknown_liquidity,1);assert.equal(q.coverage.below_research_liquidity,1);
 assert.equal(q.coverage.published_market_gates_met,1);
});
test('all unknown liquidity stays explicitly unknown, capped at eight',()=>{
 const now=Date.now(),at=new Date(now).toISOString();
 const rows=Array.from('ABCDEFGHJKLMNPQRSTUVWXYZ',x=>({chain:'solana',address:x.repeat(32),market_stale:false,market:{retrieved_at:at,liquidity_usd:null,volume_1h_usd:100}}));
 const q=buildQueue({candidates:rows},now);assert.equal(q.candidates.length,8);assert.ok(q.candidates.every(c=>c.research_lane==='UNKNOWN_LIQUIDITY'));
});
