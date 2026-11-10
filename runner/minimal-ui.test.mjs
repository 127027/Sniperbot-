import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {action,freshState,paperSignal} from './core.mjs';

test('paper capital sets exact total, not additional deposit; settings and research are preserved',()=>{
  const original={...freshState(),cashEur:350,cashUsdc:650,minTrade:50,maxTrade:1000,centralPaperFollow:true,
    researchInbox:{receipts:[{event_id:'existing'}]},paperDecisions:{receipts:[{signal_id:'existing'}]}};
  const changed=action(original,{type:'SET_PAPER_BALANCE',amount:1000});
  assert.notEqual(changed,original,'explicit total setting converts the simulated split balance into exactly the requested Test-USDC total');
  assert.equal(changed.cashEur,0);
  assert.equal(changed.cashUsdc,1000);
  // Existing virtual EUR are reclassified only on explicit user action.
  const replacement=action(original,{type:'SET_PAPER_BALANCE',amount:800});
  assert.notEqual(replacement,original);
  assert.equal(replacement.cashEur,0);
  assert.equal(replacement.cashUsdc,800);
  assert.equal(replacement.minTrade,50);
  assert.equal(replacement.maxTrade,1000);
  assert.equal(replacement.centralPaperFollow,true);
  assert.deepEqual(replacement.researchInbox,original.researchInbox);
  assert.deepEqual(replacement.paperDecisions,original.paperDecisions);
  assert.match(replacement.history[0].detail,/keine Einzahlung, Auszahlung oder echte Umwandlung/i);
  assert.equal(original.cashUsdc,650);
});

test('1000 Test-USDC is set exactly, user can explicitly reset free account to zero',()=>{
  let s=action(freshState(),{type:'SET_PAPER_BALANCE',amount:1000});
  assert.equal(s.cashUsdc,1000);
  assert.equal(s.cashEur,0);
  s=action(s,{type:'SET_PAPER_BALANCE',amount:0});
  assert.equal(s.cashUsdc,0);
  assert.equal(s.cashEur,0);
  assert.equal(s.history.length,2);
});

test('capital may only change when Bot OFF and no open positions',()=>{
  let s=action(freshState(),{type:'SET_PAPER_BALANCE',amount:1000});
  s=action(s,{type:'TOGGLE_BOT'});
  assert.equal(action(s,{type:'SET_PAPER_BALANCE',amount:0}),s);
  const flat=action(s,{type:'TOGGLE_BOT'});
  const filled={...flat,positions:[{id:'paper-position'}]};
  assert.equal(action(filled,{type:'SET_PAPER_BALANCE',amount:0}),filled);
  assert.equal(action(filled,{type:'SET_PAPER_BALANCE',amount:5000}),filled);
});

test('invalid test capital, strings, excessive precision, negative amounts are rejected without mutation',()=>{
  const s=freshState();
  for(const amount of [-1,100001,0.001,50.999,Infinity,NaN,'1000',null,undefined,{}]){
    assert.equal(action(s,{type:'SET_PAPER_BALANCE',amount}),s,String(amount));
  }
  const valid=action(s,{type:'SET_PAPER_BALANCE',amount:50.29});
  assert.equal(valid.cashUsdc,50.29);
});

test('the two-tab UI keeps Paper distinct from local wallet and blocks live trading by default',()=>{
  const html=readFileSync(new URL('./dashboard.html',import.meta.url),'utf8');
  const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
  for(const id of ['dotWidget','dotPublished','dotReceived','dotRoleDetails','toggle','paperBalance','setBalance','clearBalance','positions','centralFollow','min','max']){
    assert.ok(html.includes('id="'+id+'"'),'missing UI control '+id);
  }
  assert.match(html,/<button[^>]*disabled[^>]*>LIVE · gesperrt<\/button>/);
  assert.doesNotMatch(html,/id="withdraw"|id="toEur"|id="toUsdc"|id="deposit"|id="saveExit"|id="fiveYes"|id="oneNo"/);
  assert.match(html,/Echtgeldhandel.*GESPE[R]?RT/i);
  assert.match(html,/id="paperWorkspaceTab"/);
  assert.match(html,/id="realWorkspaceTab"/);
  assert.match(html,/id="realLiveSwitch"[^>]*disabled/);
  assert.match(html,/id="paperEurAmount"/);
  assert.match(html,/id="realSolTotal"/);
  assert.match(html,/id="realUsdcTotal"/);
  assert.match(html,/Kein automatischer Echtgeldhandel oder direkter PayPal-Checkout/);
  assert.match(server,/\/api\/trading\/live-mode/);
  assert.match(server,/'SET_PAPER_BALANCE'/);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  assert.doesNotThrow(()=>new Script(scripts[0][1],{filename:'minimal-dashboard.js'}));
});
