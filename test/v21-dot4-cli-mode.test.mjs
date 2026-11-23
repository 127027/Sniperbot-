import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assessDot4PaperDecision} from '../src/v18-dot4-live-decision.mjs';

const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'TEST'};
const snap={provenance:'SYNTHETIC_TEST',
  observed_at_utc:'2026-10-12T00:00:00.000Z',
  archived_at_utc:'2026-10-12T00:00:00.000Z',coin};
const valid='2026-10-12T00:00:00.000Z';
test('Dot4 requires real UTC, cannot accept timezone-less or impossible calendar time',()=>{
 for(const at of ['2026-10-12T00:00:00','2026-02-30T00:00:00Z','2026-10-12']){
  assert.throws(()=>assessDot4PaperDecision({snapshot:snap,asOfUtc:at}),
    /INVALID_DOT4_TIME_OR_CADENCE/);
 }
});
test('Dot4 read-only CLI forwards time mode instead of always defaulting LIVE',async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'r29-v21-dot4-'));
 try{
  for(const mode of ['LIVE_PAPER','HISTORICAL_ASOF']){
   const file=join(tmp,mode+'.json');
   await writeFile(file,JSON.stringify({
     schema:1,kind:'R29_V18_DOT4_DECISION_INPUT',
     time_mode:mode,as_of_utc:valid,full_review_due:true,snapshot:snap
   }));
   const c=spawnSync(process.execPath,['scripts/v18-dot4-decision.mjs','--input',file],
    {encoding:'utf8',timeout:15000});
   assert.equal(c.status,0,c.stderr);
   const output=JSON.parse(c.stdout);
   assert.equal(output.time_mode,mode);
   assert.equal(output.decision.evaluation_mode,mode);
   assert.equal(output.decision.action,'WATCH');
   assert.equal(output.decision.reason,'SYNTHETIC_DATA_NOT_LIVE');
   assert.equal(output.trade_authorized,false);
   assert.equal(output.orders_written,0);
  }
 }finally{await rm(tmp,{recursive:true,force:true})}
});
test('replay-vs-live common recommendation mode is explicit and never an order permission',()=>{
 for(const mode of ['LIVE_PAPER','HISTORICAL_ASOF']){
  const result=assessDot4PaperDecision({
   snapshot:snap,asOfUtc:valid,evaluationMode:mode});
  assert.equal(result.evaluation_mode,mode);
  assert.equal(result.actual_gpt_order,false);
  assert.equal(result.paper_order_authorized,false);
 }
});
