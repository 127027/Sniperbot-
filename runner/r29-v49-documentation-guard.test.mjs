// R29 V4.9 documentation guard: wording must reflect code and evidence, not unbuilt aspirations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(path.join(root,p),'utf8');

const active=[
 'AGENTS.md','README.md','ERSTER_START.txt','SNIPERBOT_R29_START_HERE.md',
 'docs/ARCHITECTURE.md','docs/CODEX_TASKS.md','docs/KNOWN_ISSUES.md',
 'docs/ROADMAP.md','docs/REQUIREMENTS.md','docs/SECURITY.md',
 'docs/R28_VERBINDUNGSTEST_UND_PAPER_AUDIT.md'
];
test('current entry documentation identifies V4.9 and its canonical V4.5 history',()=>{
 for(const file of active){
  const head=read(file).slice(0,3500);
  assert.match(head,/V4\.9/,file);
  assert.match(head,/V4\.5/,file);
 }
});
test('documentation distinguishes stored Paper preferences from missing real-account and cloud delivery',()=>{
 const doc=read('README.md');
 assert.match(doc,/Paper.*Preferred|Paper.*bevorzugt|Paper.*minTrade/i);
 assert.match(doc,/1 %/);
 assert.match(doc,/3 %/);
 assert.match(doc,/Echtgeld.*LOCKED|LIVE_LOCKED/);
 assert.match(doc,/Cloud/);
 assert.match(doc,/nicht.*nachgewiesen|nicht.*implementiert|offen/i);
 assert.match(doc,/autonomer GPT-ausgewählter BUY.*Paper-Fill.*offen/s);
});
test('Windows guide requires exit liveness, preserves local data and no API key',()=>{
 const guide=read('ERSTER_START.txt');
 assert.match(guide,/gpt_exit_monitor_heartbeat_recent/);
 assert.match(guide,/Sniperbot_Starten\.bat/);
 assert.match(guide,/MemeSniperPaper/);
 assert.match(guide,/KEIN.*OpenAI/i);
 assert.match(guide,/KEIN.*GPT-Paper-Trade/i);
});
test('older incompatible fixed-budget and multi-agent plans are visibly historical',()=>{
 const old=[
  'docs/STRATEGIC_PAPER_CAPITAL_V1.md',
  'docs/CENTRAL_PAPER_IMPLEMENTATION.md',
  'docs/DISTRIBUTED_INSTANCES.md',
  'docs/V06_TOTAL_BUDGET_AND_MULTI_SOURCE_DISCOVERY_20261110.md',
  'docs/HOLD_EXIT_POLICY.md',
  'docs/WINDOWS_READONLY_MARKET_COLLECTOR.md'
 ];
 for(const file of old){
  const h=read(file).slice(0,1500);
  assert.match(h,/ARCHIV/);
  assert.match(h,/V4\.9/);
 }
});
