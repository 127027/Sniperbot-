import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('./dashboard.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test('V6.6 user homepage shows only core trading and bounded GPT summary',()=>{
 const main=html.slice(html.indexOf('<main class="page">'),
  html.indexOf('<details id="diagnostics"'));
 assert.match(main,/id="availableValue"/);
 assert.match(main,/id="totalValue"/);
 assert.match(main,/id="openCount"/);
 assert.match(main,/id="openPnl"/);
 assert.match(main,/id="realizedPnl"/);
 assert.match(main,/id="coinStake"/);
 assert.match(main,/id="saveCoinStake"/);
 assert.match(main,/id="toggleBot"/);
 assert.match(main,/id="gptReviewCount"/);
 assert.match(main,/id="gptLastReviewSummary"/);
 assert.match(main,/id="gptLastScanSummary"/);
 assert.match(main,/id="gptDecisionSummary"/);
 assert.match(main,/id="positionRows"/);
 assert.match(main,/id="historyList"/);
 for(const debug of ['gptReviewCadence','gptReviewList','gptActivitySummary',
  'gptActivityList','researchActivityList','diagCourier']){
  assert.doesNotMatch(main,new RegExp('id="'+debug+'"'),debug+' should not be on homepage');
 }
 assert.match(main,/id="tabPaper"/);
 assert.match(main,/id="tabReal"/);
 assert.match(main,/id="paperSettings"/);
});
test('V6.6 full GPT logs and operational diagnostics remain accessible, not deleted',()=>{
 const detailed=html.slice(html.indexOf('<details id="diagnostics"'),
  html.indexOf('<div id="feedback"'));
 assert.match(detailed,/Diagnose &amp; Protokolle/);
 for(const id of ['gptReviewCadence','gptReviewLast','gptReviewList',
  'gptDecisionCount','gptActivitySummary','gptActivityList',
  'researchActivityList','diagPaper','diagAutopilot','diagGptLast',
  'diagCourier','diagMain','balanceDisclaimer'])
  assert.match(detailed,new RegExp('id="'+id+'"'),id+' must stay available');
 for(const id of ['gptReviewList','gptReviewCount','gptActivityList',
  'availableValue','balanceDisclaimer'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
   'unique control '+id);
});
test('V6.6 limited to last five actual trades, not GPT WATCH signals',()=>{
 assert.match(script,/view\.history\.filter\(item=>\/KAUF\|VERKAUF\|TRADE\|FILL\|EXIT/);
 assert.match(script,/trades\.slice\(0,5\)/);
 assert.match(script,/p\.gpt_paper_recent_decisions/);
 assert.match(script,/latestScan\.observed_count/);
 assert.match(script,/lag>2\*60\*60_000/);
 assert.doesNotMatch(script,/trades\.slice\(0,20\)/);
});
test('V6.6 preserves actual server-side Paper/real mode and stake settings without live trades',()=>{
 assert.match(script,/type:'SET_COIN_STAKE'/);
 assert.match(script,/type:'SET_BOT_ENTRIES'/);
 assert.match(script,/type:'SET_GPT_FOLLOW'/);
 assert.match(script,/type:'SET_PAPER_BALANCE'/);
 assert.match(script,/\/api\/dashboard\/paper/);
 assert.match(script,/\/api\/wallet\/overview/);
 assert.match(html,/Echtgeldhandel ist derzeit gesperrt/);
 assert.match(html,/id="gptOverview"/);
 assert.match(html,/id="gptDetailedLog"/);
 assert.doesNotThrow(()=>new Script(script,{filename:'r29-v66-ui.js'}));
});
