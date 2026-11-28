import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Pilot,narrativeMap} from './runtime.mjs';
import {USDC} from './providers.mjs';
import {RISK_SCOPE} from './risk.mjs';
import {readRecords,replay} from './recorder.mjs';
const now=Date.parse('2026-11-28T14:00:00Z'),at=new Date(now).toISOString(),a='A'.repeat(32);
const fx={status:'DAILY_REFERENCE_NOT_LIVE_FX',usd_per_eur:1,reference_date:'2026-11-27',retrieved_at:at};
const route=(i,o,amount,out)=>({input_mint:i,output_mint:o,in_raw:amount,out_raw:out,retrieved_at:at,status:'QUOTED_NOT_EXECUTED'});
const feed={mode:'PAPER_ONLY',leads:[{chain:'solana',address:a,meme_classification:'MEME',classification_source:'https://example.org/token/'+a,classification_reason:'fixture parody',observed_at:at}]};
test('explicit sourced narrative only; expired and old generic leads rejected',()=>{
 assert.equal(narrativeMap(feed,now).size,1);
 assert.equal(narrativeMap(feed,now+3600001).size,0);
 assert.equal(narrativeMap({mode:'PAPER_ONLY',leads:[{chain:'solana',address:a,reason:'DATA_GAP',observed_at:at}]},now).size,0);
});
test('fixture discovery -> narrative -> risk -> route -> buy -> pause -> exit -> restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r32-pilot-'));
 try{
 const p='C'.repeat(32);
 const pair={chainId:'solana',baseToken:{address:a,symbol:'FIXTURE'},pairAddress:p,priceUsd:'0.01',
 liquidity:{usd:50000},volume:{h1:90000},pairCreatedAt:now-3600000,txns:{m5:{buys:30,sells:10}},priceChange:{h1:40}};
 const f=async url=>({ok:true,status:200,json:async()=>url.includes('geckoterminal')?
 {data:[{relationships:{base_token:{data:{id:'solana_'+a}}}}]}:url.includes('/tokens/v1/')?[pair]:[]});
 // Inject direct fixture Scanner to avoid wall-clock provider throttles in tests.
 const {Scanner}=await import('./scanner.mjs');
 const opts={dir,clock:()=>now,scanner:new Scanner({fetcher:f,clock:()=>now}),readNarratives:async()=>feed,
 getFx:async()=>fx,inspect:async()=>({chain:'solana',address:a,risk:'PASS',scope:RISK_SCOPE,observed_at:at}),
 quoteRoundtrip:async(addr,raw)=>({chain:'solana',address:addr,mode:'PAPER_ONLY',route_evidence:'BIDIRECTIONAL_QUOTED',
 buy:route(USDC,addr,raw,'1000000'),sell:route(addr,USDC,'1000000','49000000')}),
 quoteExit:async()=>route(a,USDC,'1000000','35000000')};
 const b=new Pilot(opts);await b.context();await b.scan();b.toggle();await b.entries();
 assert.equal(b.state.cash,45000);assert.equal(b.state.positions.length,1);
 await b.entries();assert.equal(b.state.positions.length,1);assert.equal(b.buys.length,1);
 b.toggle();await b.entries();assert.equal(b.buys.length,1);assert.equal(b.state.positions.length,1);await b.exits();assert.equal(b.state.cash,48490);assert.equal(b.state.positions.length,0);
 const records=readRecords(path.join(dir,'records'));
 const replayed=replay(records,{start:now,end:now+1,initial:records[0].data.initial});
 assert.equal(replayed.state.cash,b.state.cash);assert.deepEqual(replayed.state.history,b.state.history);
 assert.equal(replayed.counts.buy,1);assert.equal(replayed.counts.sell,1);
 const c=new Pilot(opts);assert.equal(c.state.cash,48490);assert.equal(c.state.history[1].action,'SELL');
 assert.equal(c.state.enabled,false);c.toggle();await c.entries();assert.equal(c.state.positions.length,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
