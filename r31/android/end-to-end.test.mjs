import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preparePublication} from '../publisher.mjs';
import {mobileFeed} from './mobile-feed.mjs';
import {mobileRuntime} from './mobile-runtime.mjs';
import {broadcastFeed} from '../broadcast-feed.mjs';
import {createAccount,applyBroadcast,updateAccountControls,fundAccount} from '../device-account.mjs';
import {blobSha} from '../github.mjs';
const at=(h,m=0)=>'2026-11-25T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00.000Z';
const d=(coin,action,h,price_eur=1)=>({coin,chain:'Solana',contract:coin,action,price_eur,observed_at_utc:at(h),source_url:'https://example.com/fixture',reason:'ISOLATED TEST ONLY'});
const u={schema:'r31.strategy.universe.v1',sequence:0,last_signal_blob_sha:null,coins:[]};
const plan=(prev,h,decisions)=>preparePublication({previous:prev?{signal:prev.signal,blob_sha:prev.pointer.blob_sha}:null,universe:prev?.universe??u,decisions,target_utc:at(h),published_at_utc:at(h),expires_at_utc:at(h,15)});
const storage=()=>{let s='';return {read:()=>s,compareAndSwap:(old,next)=>{if(old!==s)return false;s=next;return true}}};
test('publisher to exact serialized GitHub bytes to phone and desktop, buy/hold/sell/restart',async()=>{
 let current=plan(null,8,[d('A','BUY',8),d('B','BUY',8)]), now=at(7), reads=0;
 const file=path=>{const x=current.files.find(f=>f.path===path);assert.ok(x,'publisher file exists '+path);return Buffer.from(x.content)};
 const mobile=mobileFeed({fetcher:async(url,opts)=>{assert.equal(opts.method,'GET');assert.equal(opts.body,undefined);reads++;const path='r31/broadcast/'+url.split('/r31/broadcast/')[1];const b=file(path);return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}});
 const desktop=broadcastFeed({fetcher:async(url,opts)=>{assert.equal(opts.body,undefined);reads++;const path=new URL(url).pathname;const head='a'.repeat(40);if(path.endsWith('/commits'))return {ok:true,json:async()=>[{sha:head}]};const b=file(path.split('/contents/')[1]);return {ok:true,json:async()=>({type:'file',encoding:'base64',content:b.toString('base64'),sha:blobSha(b)})}}});
 const saved=storage(),phone=mobileRuntime({storage:saved,feed:mobile,now:()=>now});phone.fund({id:'p',kind:'PAPER_DEPOSIT',amount_cents:50000});phone.controls({expected_revision:1,max_invest_cents:50000,stake_cents:5000,allow_new_buys:true});
 now=at(8,1);await phone.poll();assert.equal(phone.view().ledger.cash_eur,400);assert.equal(phone.view().ledger.positions.length,2);
 now=at(8,5);let laptop=createAccount({initial_cents:25000,max_invest_cents:25000,stake_cents:2500,now});laptop=updateAccountControls(laptop,{expected_revision:1,max_invest_cents:25000,stake_cents:2500,allow_new_buys:true},now);laptop=applyBroadcast(laptop,{...await desktop.latest(),now}).account;assert.equal(laptop.ledger.positions.length,0);
 current=plan(current,9,[d('A','HOLD',9,1.5),d('B','SELL',9,2),d('C','BUY',9)]);now=at(9,1);await phone.poll();let r=applyBroadcast(laptop,{...await desktop.latest(),now});laptop=r.account;
 assert.equal(phone.view().ledger.positions.length,2);assert.equal(phone.view().ledger.trades.length,4);assert.equal(phone.view().ledger.realized_pnl_eur,48.01);assert.equal(laptop.ledger.cash_eur,225);assert.equal(laptop.ledger.positions[0].coin,'C');assert.equal(r.events.find(e=>e.coin==='B').status,'IGNORED_NOT_OWNED');
 const restart=mobileRuntime({storage:saved,feed:mobile,now:()=>now});await restart.poll();assert.equal(restart.view().feed.state,'ALREADY_PROCESSED');assert.equal(restart.view().ledger.trades.length,4);
 current=plan(current,10,[d('A','SELL',10,1.5),d('B','SELL',10,2),d('C','SELL',10,1)]);now=at(10,1);await restart.poll();laptop=applyBroadcast(laptop,{...await desktop.latest(),now}).account;assert.equal(restart.view().ledger.positions.length,0);assert.equal(laptop.ledger.positions.length,0);assert.ok(reads>=12);
});
test('expired publication and missing position data cannot manufacture a sell',async()=>{
 let now=at(7),p=plan(null,8,[d('A','BUY',8)]);const a=mobileRuntime({storage:storage(),now:()=>now});a.fund({id:'one',kind:'PAPER_DEPOSIT',amount_cents:5000});a.controls({expected_revision:1,max_invest_cents:5000,stake_cents:5000,allow_new_buys:true});
 now=at(8,1);a.accept({signal:p.signal,blob_sha:p.pointer.blob_sha});p=plan(p,9,[d('A','SELL',9,2)]);now=at(9,16);assert.equal(a.accept({signal:p.signal,blob_sha:p.pointer.blob_sha}).feed.state,'SKIPPED_OLD_OR_EXPIRED');assert.equal(a.view().ledger.positions.length,1);assert.equal(a.view().summary.net_liquidation_value_eur,null);
 p=plan(p,10,[d('A','SELL',10,2)]);now=at(10,1);a.accept({signal:p.signal,blob_sha:p.pointer.blob_sha});assert.equal(a.view().ledger.positions.length,0);assert.equal(a.view().ledger.cash_eur,98.01);
});


test('R35 BUY BUY HOLD BUY SELL across two devices: immutable global BUY and local HOLD only',async()=>{
 let now=at(7),current=null;
 const feed=mobileFeed({fetcher:async(url,opts)=>{
  assert.equal(opts.method,'GET');
  const path='r31/broadcast/'+url.split('/r31/broadcast/')[1];
  const file=current.files.find(f=>f.path===path);assert.ok(file);
  const bytes=Buffer.from(file.content);return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
 }});
 const open=()=>{const a=mobileRuntime({storage:storage(),feed,now:()=>now});a.fund({id:'deposit',kind:'PAPER_DEPOSIT',amount_cents:50000});a.controls({expected_revision:1,max_invest_cents:50000,stake_cents:5000,allow_new_buys:true});return a};
 const first=open();let second;
 const rows=[];
 for(const [hour,action,price] of [[8,'BUY',1],[9,'BUY',1.2],[10,'HOLD',1.3],[11,'BUY',1.5],[12,'SELL',2],[13,'BUY',1]]){
  if(hour===10){now=at(9,30);second=open();}
  current=plan(current,hour,[d('A',action,hour,price)]);
  const before=JSON.stringify(current.signal),sha=current.pointer.blob_sha;
  now=at(hour,1);
  await first.poll();if(second)await second.poll();
  assert.equal(first.view().feed.state,'PROCESSED');
  if(second)assert.equal(second.view().feed.state,'PROCESSED');
  assert.equal(JSON.stringify(current.signal),before);
  assert.equal(current.signal.decisions[0].action,action);
  assert.equal(blobSha(Buffer.from(current.files.find(f=>f.path===current.pointer.path).content)),sha);
  const a=first.view().ledger,b=second?.view().ledger;
  if(hour<12){assert.equal(a.cash_eur,450);assert.equal(a.positions.length,1);assert.equal(a.trades.length,1)}
  if(hour===10){assert.equal(b.cash_eur,500);assert.equal(b.positions.length,0);assert.equal(b.trades.length,0)}
  if(hour===11){assert.equal(b.cash_eur,450);assert.equal(b.positions.length,1);assert.equal(b.trades.length,1)}
  if(hour===12){assert.equal(a.positions.length,0);assert.equal(b.positions.length,0);assert.equal(a.trades.length,2);assert.equal(b.trades.length,2);assert.equal(a.cash_eur,548.01);assert.equal(b.cash_eur,515.34)}
  if(hour===13){assert.equal(a.positions.length,1);assert.equal(b.positions.length,1);assert.equal(a.trades.filter(t=>t.action==='BUY').length,2);assert.equal(b.trades.filter(t=>t.action==='BUY').length,2)}
  rows.push({hour,global:action,first_cash:a.cash_eur,first_positions:a.positions.length,second_cash:b?.cash_eur??null,second_positions:b?.positions.length??null});
  await first.poll();assert.equal(first.view().feed.state,'ALREADY_PROCESSED');assert.equal(first.view().ledger.trades.length,a.trades.length);
 }
 console.log('R35 MIXED CYCLE '+JSON.stringify(rows));
});


test('R45 ranked top ten: 50 EUR stake and 200 EUR cap; repeat BUY never duplicates; SELL frees capacity',()=>{
 let now=at(7);
 const phone=mobileRuntime({storage:storage(),now:()=>now});
 phone.fund({id:'ranked-deposit',kind:'PAPER_DEPOSIT',amount_cents:50000});
 phone.controls({expected_revision:1,max_invest_cents:20000,stake_cents:5000,allow_new_buys:true});
 let previous=null;
 function send(h,decisions){
  const signal={schema:'r31.broadcast.v1',mode:'PAPER_ONLY',sequence:h-7,target_utc:at(h),published_at_utc:at(h),expires_at_utc:at(h,15),decisions,previous_blob_sha:previous};
  const sha=blobSha(Buffer.from(JSON.stringify(signal)));now=at(h,1);
  phone.accept({signal,blob_sha:sha});previous=sha;
  assert.equal(phone.view().feed.state,'PROCESSED');
 }
 const ranked=['Z','Y','X','W','V','U','T','S','R','Q'];
 send(8,ranked.map(x=>d(x,'BUY',8)));
 assert.deepEqual(phone.view().ledger.positions.map(p=>p.coin),ranked.slice(0,4));
 assert.equal(phone.view().ledger.cash_eur,300);
 assert.equal(phone.view().ledger.trades.length,4);
 send(9,ranked.map(x=>d(x,'BUY',9)));
 assert.equal(phone.view().ledger.trades.length,4);
 send(10,[...ranked.filter(x=>x!=='Y').map(x=>d(x,'BUY',10)),d('NEW','BUY',10),d('Y','SELL',10,2)]);
 assert.deepEqual(phone.view().ledger.positions.map(p=>p.coin),['Z','X','W','V']);
 assert.equal(phone.view().ledger.trades.length,6);
 assert.equal(phone.view().summary.open_cost_eur,200);
});
