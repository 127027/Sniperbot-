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
