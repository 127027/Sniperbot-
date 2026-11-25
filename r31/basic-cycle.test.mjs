// Isolated regression test: no connector, live market prices or real device account.
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {preparePublication} from './publisher.mjs';import {blobSha} from './github.mjs';import {applyBroadcast,createAccount,updateAccountControls} from './device-account.mjs';
const at=(h,m=0)=>'2026-11-25T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00.000Z';
const fixture=(coin,action,h,price=1)=>({...coin,action,reason:'SYNTHETIC_TEST_ONLY',...(['BUY','HOLD','SELL'].includes(action)?{price_eur:price,observed_at_utc:at(h,3),source_url:'https://example.com/test-only'}:{})});
const account=(id,joined)=>updateAccountControls(createAccount({account_id:id,initial_cents:50000,max_invest_cents:50000,stake_cents:5000,now:joined}),{expected_revision:1,max_invest_cents:50000,stake_cents:5000,allow_new_buys:true},joined);
test('actual archived sequence 2 is not a BUY; isolated next-hour signal supports wait, late join, fresh repeat BUY, HOLD, SELL and replay protection',async()=>{
 const raw=await readFile(new URL('./broadcast/signals/0000000002.json',import.meta.url));const prior=JSON.parse(raw),sha=blobSha(raw);
 assert.equal(prior.sequence,2);assert.equal(prior.decisions.filter(x=>['BUY','SELL','HOLD'].includes(x.action)).length,0);
 const pick=n=>{const {coin,chain,contract}=prior.decisions.find(x=>x.coin===n);return {coin,chain,contract}};
 const a=pick('BASKET'),b=pick('PERRO'),c=pick('4CHAN');
 const u={schema:'r31.strategy.universe.v1',sequence:2,last_signal_blob_sha:sha,coins:[]};
 let p={signal:prior,pointer:{blob_sha:sha},universe:u};
 const next=(h,decisions)=>{p=preparePublication({previous:{signal:p.signal,blob_sha:p.pointer.blob_sha},universe:p.universe,target_utc:at(h),published_at_utc:at(h,5),expires_at_utc:at(h,15),decisions});return p};
 const apply=(x,h)=>applyBroadcast(x,{signal:p.signal,blob_sha:p.pointer.blob_sha,now:at(h,6)});
 let older=account('fixture-old',at(8));let late=account('fixture-late',at(12,10));
 assert.equal(applyBroadcast(older,{signal:prior,blob_sha:sha,now:at(9,6)}).events.filter(e=>e.status==='MODEL_BOOKED').length,0);
 assert.equal(applyBroadcast(late,{signal:prior,blob_sha:sha,now:at(12,11)}).status,'SKIPPED_OLD_OR_EXPIRED');
 next(11,[fixture(a,'DATA_GAP',11),fixture(b,'WATCH',11),fixture(c,'NO_TRADE',11)]);older=apply(older,11).account;assert.equal(older.ledger.cash_eur,500);
 next(12,[fixture(a,'BUY',12),fixture(b,'WATCH',12),fixture(c,'NO_TRADE',12)]);older=apply(older,12).account;assert.equal(older.ledger.cash_eur,450);assert.equal(older.ledger.positions.length,1);
 late=applyBroadcast(late,{signal:p.signal,blob_sha:p.pointer.blob_sha,now:at(12,11)}).account;assert.equal(late.ledger.positions.length,0);
 next(13,[fixture(a,'HOLD',13),fixture(b,'WATCH',13),fixture(c,'DATA_GAP',13)]);older=apply(older,13).account;late=apply(late,13).account;assert.equal(late.ledger.cash_eur,500);
 next(14,[fixture(a,'BUY',14),fixture(b,'WATCH',14),fixture(c,'NO_TRADE',14)]);older=apply(older,14).account;late=apply(late,14).account;assert.equal(older.ledger.cash_eur,450);assert.equal(late.ledger.cash_eur,450);assert.equal(late.ledger.positions.length,1);assert.equal(apply(late,14).status,'ALREADY_PROCESSED');
 next(15,[fixture(a,'SELL',15,2),fixture(b,'WATCH',15),fixture(c,'NO_TRADE',15)]);older=apply(older,15).account;late=apply(late,15).account;assert.equal(older.ledger.positions.length,0);assert.equal(late.ledger.positions.length,0);assert.ok(late.ledger.realized_pnl_eur>0);
 assert.throws(()=>next(16,[{...fixture(a,'BUY',16),observed_at_utc:at(15)}]),/INVALID_SIGNAL_PRICE/);
});
