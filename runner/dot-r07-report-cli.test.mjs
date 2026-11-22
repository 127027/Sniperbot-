import test from 'node:test';
import assert from 'node:assert/strict';
import {loadR07Files,assembleR07Timeline} from './dot-r07-report-cli.mjs';
import {R07_ROLES} from './dot-r07-report-audit.mjs';
test('the five reserved role files render 61 research-only days, never fictional fills',()=>{
 const data=loadR07Files();
 assert.deepEqual(Object.keys(data),[...R07_ROLES]);
 const result=assembleR07Timeline(data);
 assert.equal(result.daily.length,61);
 assert.equal(result.daily[0].virtual_day_utc,'2024-09-10');
 assert.equal(result.daily.at(-1).virtual_day_utc,'2024-11-09');
 assert.equal(result.audit.all_five_completed,false);
 assert.equal(result.audit.certified_historical_predictive_performance,false);
 assert(result.daily.every(x=>x.verified_historical_buy_executions===0&&
  x.verified_historical_sell_executions===0));
});
test('unverified claimed coin identity and out-of-window day cannot inflate first-discovery count',()=>{
 const data=loadR07Files();
 const copied=structuredClone(data);
 copied.news_discovery.first_discovers=[{first_valid_day_utc:'2024-09-11',candidate_id:'solana:MEME:NOTVALID'},
  {first_valid_day_utc:'2024-12-10',candidate_id:'base:0x'+'a'.repeat(40)+':0x'+'b'.repeat(40)}];
 const x=assembleR07Timeline(copied);
 assert(x.daily.every(day=>day.first_discover_claims.length===0));
 assert(x.audit.roles.find(x=>x.role==='news_discovery').errors.includes('INVALID_CANDIDATE_ID'));
});
