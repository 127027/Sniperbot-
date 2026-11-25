import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileReviews,prepareStrategy} from './producer/strategy.mjs';
import {createAccount,updateAccountControls,applyBroadcast,fundAccount} from '../r31/device-account.mjs';
const time=(date,h,m=0)=>date+'T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00.000Z';
const day='2026-11-25',later='2026-12-16';
const r=(coin,disposition,date,h,rank)=>({coin,chain:'Solana',contract:coin,disposition,reason:'synthetic fresh re-evaluation',risk:'synthetic liquidity risk',price_eur:1,source_url:'https://example.com/test',observed_at_utc:time(date,h),...(rank?{entry_rank:rank}:{})});
const initial={schema:'r31.strategy.universe.v1',sequence:0,last_signal_blob_sha:null,coins:[]};
function plan(prev,date,h,reviews){return prepareStrategy({previous:prev?{signal:prev.signal,blob_sha:prev.pointer.blob_sha}:null,universe:prev?.universe??initial,reviews,target_utc:time(date,h),published_at_utc:time(date,h),expires_at_utc:time(date,h,15)})}
function account(id,budget,date,h,stake=5000){const a=createAccount({account_id:id,initial_cents:budget,max_invest_cents:budget,stake_cents:stake,now:time(date,h)});return updateAccountControls(a,{expected_revision:1,max_invest_cents:budget,stake_cents:stake,allow_new_buys:true},time(date,h))}
function apply(a,p,date,h,m=1){return applyBroadcast(a,{signal:p.signal,blob_sha:p.pointer.blob_sha,now:time(date,h,m)})}
test('fresh recurring entry: existing owner holds, late join buys, HOLD_ONLY never opens position',()=>{
 const p=plan(null,day,8,[r('A','ENTRY_ALLOWED',day,8,1),r('B','ENTRY_ALLOWED',day,8,2)]);
 let existing=apply(account('old',50000,day,7),p,day,8).account;
 const q=plan(p,later,10,[r('A','ENTRY_ALLOWED',later,10,1),r('B','HOLD_ONLY',later,10),r('C','ENTRY_ALLOWED',later,10,2)]);
 const newcomer=account('new',50000,later,9);
 const one=apply(existing,q,later,10),two=apply(newcomer,q,later,10);
 assert.deepEqual(one.account.ledger.positions.map(x=>x.coin),['A','B','C']);assert.deepEqual(two.account.ledger.positions.map(x=>x.coin),['A','C']);
 assert.equal(one.account.ledger.cash_eur,350);assert.equal(two.account.ledger.cash_eur,400);
 assert.equal(one.events.find(e=>e.coin==='A').status,'IGNORED_ALREADY_OWNED');
 assert.equal(two.events.find(e=>e.coin==='B').status,'IGNORED_NOT_OWNED');
 assert.equal(apply(two.account,q,later,10).status,'ALREADY_PROCESSED');
});
test('1000 independent devices, producer bytes unchanged, no user data crosses interface, priority enforced',()=>{
 const p=plan(null,day,10,[r('C','ENTRY_ALLOWED',day,10,3),r('B','ENTRY_ALLOWED',day,10,2),r('A','ENTRY_ALLOWED',day,10,1)]);
 const before=JSON.stringify(p.signal);
 for(let i=0;i<1000;i++){
  const stake=2500+(i%3)*2500,budget=stake*(1+i%3);
  const a=account('private-device-'+i,budget,day,9,stake),b=apply(a,p,day,10).account;
  assert.equal(b.ledger.positions.length,1+i%3);assert.equal(b.ledger.positions[0].coin,'A');assert.equal(b.ledger.positions[0].cost_basis_eur,stake/100);assert.equal(b.ledger.cash_eur,0);
 }
 assert.equal(JSON.stringify(p.signal),before);assert.ok(!before.includes('private-device'));assert.ok(!before.includes('amount_cents'));
});
test('funding pause and insufficient cash cannot bypass priority or replay',()=>{
 const p=plan(null,day,8,[r('A','ENTRY_ALLOWED',day,8,1)]);let a=account('zero',0,day,7);
 a=apply(a,p,day,8).account;assert.equal(a.ledger.positions.length,0);
 a=fundAccount(a,{id:'fund',kind:'PAPER_DEPOSIT',amount_cents:50000},time(day,8,5));
 a=updateAccountControls(a,{expected_revision:2,max_invest_cents:50000,stake_cents:5000,allow_new_buys:true},time(day,8,5));
 assert.equal(apply(a,p,day,8,6).status,'ALREADY_PROCESSED');
 const q=plan(p,day,9,[r('A','ENTRY_ALLOWED',day,9,1)]);assert.equal(apply(a,q,day,9).account.ledger.cash_eur,450);
});
test('offline missed exit, repeated fresh EXIT, no invented trades or unknown marks',()=>{
 const p=plan(null,day,8,[r('A','ENTRY_ALLOWED',day,8,1)]),a=apply(account('owner',50000,day,7),p,day,8).account;
 const q=plan(p,day,9,[r('A','EXIT',day,9)]);
 const gap=plan(q,day,10,[]);assert.equal(gap.signal.decisions[0].action,'DATA_GAP');
 const x=apply(a,gap,day,10).account;assert.equal(x.ledger.positions.length,1);assert.equal(x.last_summary.net_liquidation_value_eur,null);
 const s=plan(gap,day,11,[r('A','EXIT',day,11)]);assert.equal(apply(x,s,day,11).account.ledger.positions.length,0);
 const newbie=apply(account('new',50000,day,10),s,day,11);assert.equal(newbie.account.ledger.cash_eur,500);assert.equal(newbie.events[0].status,'IGNORED_NOT_OWNED');
});
test('late join and expired snapshot never replay; next fresh entry permitted',()=>{
 const p=plan(null,day,8,[r('A','ENTRY_ALLOWED',day,8,1)]),a=account('late',50000,day,8);
 assert.equal(apply(a,p,day,8,5).status,'SKIPPED_OLD_OR_EXPIRED');
 const b=account('offline',50000,day,7);assert.equal(apply(b,p,day,8,16).status,'SKIPPED_OLD_OR_EXPIRED');
 const q=plan(p,day,9,[r('A','ENTRY_ALLOWED',day,9,1)]);assert.equal(apply(a,q,day,9).account.ledger.positions.length,1);
});
test('strict producer input rejects account data, duplicate ranks, absent risk, stale quote and overflow',()=>{
 const a=r('A','ENTRY_ALLOWED',day,8,1);
 assert.throws(()=>compileReviews([{...a,account_id:'x'}]),/INVALID_REVIEW/);
 assert.throws(()=>compileReviews([a,r('B','ENTRY_ALLOWED',day,8,1)]),/INVALID_ENTRY_RANK/);
 assert.throws(()=>compileReviews([{...a,risk:''}]),/INVALID_REVIEW/);
 assert.throws(()=>plan(null,day,9,[a]),/INVALID_SIGNAL_PRICE/);
 const coins=Array.from({length:500},(_,i)=>({coin:'C'+i,contract:'C'+i,chain:'Solana',intent:'LONG'}));
 assert.throws(()=>prepareStrategy({universe:{...initial,coins},reviews:[a],target_utc:time(day,8),published_at_utc:time(day,8),expires_at_utc:time(day,8,15)}),/WIRE_COVERAGE_LIMIT/);
});

test('user exact lifecycle: five fresh entries for three scans then exit; device joins between scans',()=>{
 const reviewAll=(h,kind)=>Array.from({length:5},(_,i)=>r('F'+i,kind,day,h,kind==='ENTRY_ALLOWED'?i+1:undefined));
 let p=plan(null,day,9,reviewAll(9,'ENTRY_ALLOWED')),phone=apply(account('phone',50000,day,8),p,day,9).account;
 let colleague=account('colleague',50000,day,10); // joined at publication boundary, next fresh scan is 11
 assert.equal(phone.ledger.cash_eur,250);
 p=plan(p,day,10,reviewAll(10,'ENTRY_ALLOWED'));phone=apply(phone,p,day,10).account;
 colleague=apply(colleague,p,day,10).account;assert.equal(colleague.ledger.positions.length,0);
 p=plan(p,day,11,reviewAll(11,'ENTRY_ALLOWED'));phone=apply(phone,p,day,11).account;colleague=apply(colleague,p,day,11).account;
 assert.equal(phone.ledger.trades.length,5);assert.equal(colleague.ledger.trades.length,5);assert.equal(colleague.ledger.cash_eur,250);
 p=plan(p,day,12,reviewAll(12,'EXIT'));phone=apply(phone,p,day,12).account;colleague=apply(colleague,p,day,12).account;
 assert.equal(phone.ledger.positions.length,0);assert.equal(colleague.ledger.positions.length,0);assert.equal(phone.ledger.trades.length,10);assert.equal(colleague.ledger.trades.length,10);
});
