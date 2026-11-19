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

test('positive capital change requires Bot OFF, zero auto-stops with no positions, no open position may vanish',()=>{
  let s=action(freshState(),{type:'SET_PAPER_BALANCE',amount:1000});
  s=action(s,{type:'TOGGLE_BOT'});
  const zeroed=action(s,{type:'SET_PAPER_BALANCE',amount:0});
  assert.notEqual(zeroed,s,'zero is an explicit safe pause-and-clear action');
  assert.equal(zeroed.entriesEnabled,false);
  assert.equal(zeroed.cashUsdc,0);
  assert.equal(zeroed.positions.length,0);
  assert.equal(action(s,{type:'SET_PAPER_BALANCE',amount:3000}),s,
   'positive amount remains blocked while Paper bot is running');
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

test('R29 two-tab user UI shows only verified regular Paper and read-only real wallet',()=>{
 const html=readFileSync(new URL('./dashboard.html',import.meta.url),'utf8');
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 for(const id of [
  'tabPaper','tabReal','availableValue','totalValue','openCount','openPnl',
  'realizedPnl','positionRows','historyList','toggleBot','paperSettings',
  'coinStakeControls','stakeAvailable','coinStake','saveCoinStake','setPaperBalance',
  'realUsdc','realSol','refreshWallet','diagnostics'
 ])assert.ok(html.includes('id="'+id+'"'),'missing R29 user-facing control '+id);
 for(const retired of [
  'R29-Sandbox (TEST-USDC)','Fünf-Agenten-Kommunikation',
  'paperPipelineSelftest','agentDotRoles','realLiveSwitch',
  'Dot-Eingang','walletNativeSend'
 ])assert.ok(!html.includes(retired),'retired developer control still visible: '+retired);
 assert.match(html,/Echtgeldhandel ist derzeit gesperrt/);
 assert.match(html,/Echtgeldhandel ausgeschaltet/);
 assert.match(html,/\/api\/dashboard\/paper/);
 assert.match(html,/\/api\/wallet\/overview/);
 assert.match(server,/\/api\/trading\/live-mode/);
 assert.match(server,/\/api\/dashboard\/paper/);
 assert.match(server,/'SET_PAPER_BALANCE'/);
 const start=html.indexOf('<script>'),end=html.indexOf('</script>',start);
 assert(start>=0&&end>start,'dashboard contains exactly one inline script');
 const scripts=[[null,html.slice(start+8,end)]];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new Script(scripts[0][1],{filename:'r29-user-dashboard.js'}));
});


test('R29 V4.7 one-click Paper entry pause is explicitly OFF, not ambiguous toggle, with live-monitor proof',()=>{
 const html=readFileSync(new URL('./dashboard.html',import.meta.url),'utf8');
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 const pipeline=readFileSync(new URL('./paper-agent-pipeline.mjs',import.meta.url),'utf8');
 const ledger=readFileSync(new URL('./core.mjs',import.meta.url),'utf8');
 assert.match(html,/SET_BOT_ENTRIES/);
 assert.match(html,/Neue Paper-Käufe PAUSIEREN/);
 assert.match(html,/Neue Paper-Käufe AKTIVIEREN/);
 assert.match(html,/result\.entries_enabled!==cmd\.enabled/);
 assert.doesNotMatch(html,/sendPaperCommand\(\{type:'TOGGLE_BOT'\}\)/);
 assert.match(server,/SET_BOT_ENTRIES/);
 assert.match(server,/state\.entriesEnabled===a\.enabled/);
 assert.match(ledger,/case 'SET_BOT_ENTRIES'/);
 assert.match(server,/GPT_GITHUB_POLICY_EXIT'\]\.includes\(source\)/,
  'ephemeral signed policy SELL MUST be authorized in real server, not just offline mock');
 assert.match(server,/gptExitMonitorReady:gptExitMonitorHealthy\(\)/);
 assert.match(server,/gpt_exit_monitor_heartbeat_recent:gptExitMonitorHealthy\(\)/);
 assert.match(pipeline,/GPT_BUY_REQUIRES_HEALTHY_CONTINUOUS_EXIT_MONITOR/);
 let paused=action(freshState(),{type:'SET_BOT_ENTRIES',enabled:false});
 assert.equal(paused.entriesEnabled,false);
 const enabled=action(paused,{type:'SET_BOT_ENTRIES',enabled:true});
 assert.equal(enabled.entriesEnabled,true);
 paused=action(enabled,{type:'SET_BOT_ENTRIES',enabled:false});
 assert.equal(paused.entriesEnabled,false);
 assert.equal(action(paused,{type:'SET_BOT_ENTRIES',enabled:false}),paused,
  'repeat OFF MUST NOT flip Bot back ON');
 assert.equal(action(paused,{type:'SET_BOT_ENTRIES',enabled:'false'}),paused);
});

test('V5.7 user controls two separate per-coin stakes; amount settings never enable real trades',()=>{
 const start={...freshState(),cashUsdc:5000,gptPaperFollow:true,
  entriesEnabled:true,realTradingEnabled:false};
 const paper=action(start,{type:'SET_COIN_STAKE',account:'PAPER',amount:250});
 assert.equal(paper.paperCoinStakeUsdc,250);
 assert.equal(paper.realCoinStakeUsdc,50);
 assert.equal(paper.cashUsdc,5000);
 assert.equal(paper.entriesEnabled,true);
 const real=action(paper,{type:'SET_COIN_STAKE',account:'REAL',amount:500});
 assert.equal(real.paperCoinStakeUsdc,250);
 assert.equal(real.realCoinStakeUsdc,500);
 assert.equal(real.realTradingEnabled,false);
 assert.equal(real.positions.length,0);
 for(const amount of [0,1,49.99,5000.01,25.005,Infinity,NaN,'50',null]){
  assert.equal(action(real,{type:'SET_COIN_STAKE',account:'PAPER',amount}),real);
 }
 assert.equal(action(real,{type:'SET_COIN_STAKE',account:'LIVE',amount:50}),real);
 const html=readFileSync(new URL('./dashboard.html',import.meta.url),'utf8');
 assert.match(html,/Maximal vorhanden/);
 assert.match(html,/Einsatz \/ Coin/);
 assert.match(html,/SET_COIN_STAKE/);
 assert.doesNotMatch(html,/id="preferredEntry"|id="exposureCap"|id="saveBudget"/);
 assert.doesNotMatch(html,/höchstens 1 % des virtuellen Kontowerts/);
});
