// R29 V5.0: distinguish owner-approved product goal from verified trading implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(path.join(root,p),'utf8');
const goal='research/r29/operations/R29_V5_0_AUTONOMER_MEMECOIN_SCOUT_ZIELVERTRAG_20261118_DE.md';
const examples='research/r29/operations/R29_V5_0_MEMECOIN_30T_REFERENZFAELLE_UNVERIFIZIERT_20261118_DE.md';
const canonical='research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md';

test('active project entrypoints link V5.0 as approved goal, not shipped bot',()=>{
 const files=['README.md','AGENTS.md','SNIPERBOT_R29_START_HERE.md',
  'docs/ARCHITECTURE.md','docs/CODEX_TASKS.md','docs/ROADMAP.md',
  'docs/KNOWN_ISSUES.md','docs/REQUIREMENTS.md','docs/SECURITY.md',
  'docs/R28_VERBINDUNGSTEST_UND_PAPER_AUDIT.md'];
 for(const file of files){
  const head=read(file).slice(0,4200);
  assert.match(head,/V5\.0/,file+' missing V5.0');
  assert.match(head,/V4\.9/,file+' missing implementation baseline');
  assert(head.includes(path.basename(goal)),file+' missing goal source');
  assert(head.includes(path.basename(canonical)),file+' missing prior chronology');
 }
 const start=read('ERSTER_START.txt').slice(0,4500);
 assert.match(start,/V5\.0/);
 assert.match(start,/V4\.9/);
 assert.match(start,/V4\.5/);
 assert(start.includes(path.basename(goal)));
 assert.match(start,/Sniperbot_Starten\.bat/);
});
test('the actual V5.0 goal records reviews, monitoring, real-lock and proof gates',()=>{
 const g=read(goal);
 assert.match(g,/4 bis 24/);
 assert.match(g,/30-Sekunden/);
 assert.match(g,/24\/7/);
 assert.match(g,/GPT.*WATCH/);
 assert.match(g,/LIVE_LOCKED/);
 assert.match(g,/1 %/);
 assert.match(g,/3 %/);
 assert.match(g,/POSTFREEZE/);
 assert.match(g,/7 Entwicklungs- und 3/);
 assert.match(g,/kein.*kostenpflichtigen OpenAI-API/i);
});
test('postfreeze operator reference table has 36 nonvalidated examples, no guaranteed PnL',()=>{
 const ref=read(examples);
 const rows=ref.split('\n').filter(x=>/^\| [^|-].*\|/.test(x)&&!/^(\| Angegebener Name)/.test(x));
 assert.equal(rows.length,36);
 assert.match(ref,/UNVERIFIZIERT/);
 assert.match(ref,/POSTFREEZE/);
 assert.match(ref,/NICHT BLINDTEST-EINGABE/);
 assert.match(ref,/nicht.*realisi|keine.*realisier/i);
});
test('checkpoint keeps V4.9 actual baseline separate from V5.0 approval',()=>{
 const cp=JSON.parse(read('research/r29/operations/R29_LATEST_CHECKPOINT.json'));
 const v=cp.v5_0_product_goal;
 assert.equal(v.actual_forward_gpt_full_reviews_per_day_4_to_24_proven,false);
 assert.equal(v.actual_complete_unknown_coin_gpt_paper_buy_sell_in_personal_ledger_proven,false);
 assert.equal(v.private_windows_to_cloud_gpt_account_state_delivery_proven,false);
 assert.equal(v.real_trading_locked,true);
 assert.equal(v.operator_reference_count_unverified,36);
 assert(cp.next_actions_in_order.some(x=>x.includes('4–24 ACTUAL')));
 assert.equal(v.scope,'Product-goal and documentation alignment only; no trading code changed');
});
