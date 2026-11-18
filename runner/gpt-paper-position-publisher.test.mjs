import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeGptPublicPositionContext,syncGptPaperPublicPositionContext}
 from './gpt-paper-position-publisher.mjs';

const now=Date.now();
const iso=x=>new Date(x).toISOString();
function localData(overrides={}){
 return {ok:true,schema:'sniper_r29_gpt_public_position_context.v1',
  mode:'PAPER_ONLY',real_trading_enabled:false,
  account_balances_excluded:true,position_amounts_excluded:true,
  gpt_follow_enabled:true,paper_bot_enabled:false,
  exit_guard_required_for_new_gpt_buy:true,
  exit_monitor_heartbeat_recent:true,
  exit_monitor_last_checked_at_utc:iso(now-30000),
  as_of_utc:iso(now),positions:[],...overrides};
}
test('existing GitHub GPT public context only exposes short-lived proof and no private Paper ledger data',()=>{
 const orig=localData({cash_test_usdc:9999,
  wallet_secret:'DO_NOT_PUBLISH_SECRET',
  positions:[],private_key:'DO_NOT_PUBLISH_SECRET'});
 const sanitized=sanitizeGptPublicPositionContext(orig,{now});
 assert.equal(sanitized.exit_guard_required_for_new_gpt_buy,true);
 assert.equal(sanitized.exit_monitor_heartbeat_recent,true);
 assert.equal(sanitized.paper_bot_enabled,false);
 assert.equal(sanitized.gpt_follow_enabled,true);
 assert.equal(sanitized.positions.length,0);
 const s=JSON.stringify(sanitized);
 assert(!s.includes('DO_NOT_PUBLISH_SECRET'));
 assert(!s.includes('9999'));
 assert.equal(sanitized.account_balances_published,false);
 assert.equal(sanitized.position_amounts_published,false);
});
test('remote GPT readiness fails closed for older bot, missing or stale 30s monitor tick',()=>{
 for(const payload of [
  localData({exit_monitor_heartbeat_recent:false}),
  localData({exit_monitor_last_checked_at_utc:null}),
  localData({exit_monitor_last_checked_at_utc:iso(now-100000)}),
  localData({exit_monitor_last_checked_at_utc:iso(now+1000)}),
  localData({exit_guard_required_for_new_gpt_buy:false}),
  localData({exit_monitor_last_checked_at_utc:'INVALID'})
 ]){
  const sanitized=sanitizeGptPublicPositionContext(payload,{now});
  assert.equal(sanitized.exit_monitor_heartbeat_recent,false);
 }
 const legacy=localData();
 delete legacy.exit_guard_required_for_new_gpt_buy;
 delete legacy.exit_monitor_heartbeat_recent;
 delete legacy.exit_monitor_last_checked_at_utc;
 const old=sanitizeGptPublicPositionContext(legacy,{now});
 assert.equal(old.exit_guard_required_for_new_gpt_buy,false);
 assert.equal(old.exit_monitor_heartbeat_recent,false);
});
test('existing Github position-context courier refreshes healthy monitor stamp within two minutes',async()=>{
 const remote=sanitizeGptPublicPositionContext(localData(),{now});
 remote.observed_at_utc=iso(now-3*60000);
 let puts=0,published=null;
 const fetcher=async(url,options)=>{
  if(options.method==='GET')return {status:200,ok:true,json:async()=>({
   type:'file',encoding:'base64',sha:'a'.repeat(40),
   content:Buffer.from(JSON.stringify(remote)).toString('base64')})};
  if(options.method==='PUT'){
   puts++;const x=JSON.parse(options.body);
   published=JSON.parse(Buffer.from(x.content,'base64').toString('utf8'));
   return {ok:true,status:200,json:async()=>({commit:{sha:'b'.repeat(40)}})};
  }
  throw Error('UNEXPECTED_REQUEST');
 };
 const localFetcher=async()=>({ok:true,json:async()=>localData()});
 const result=await syncGptPaperPublicPositionContext({
  token:'ghp_'+'t'.repeat(22),fetcher,localFetcher,now});
 assert.equal(result.status,'PUBLISHED');
 assert.equal(puts,1);
 assert.equal(published.exit_monitor_heartbeat_recent,true);
 assert.equal(published.paper_bot_enabled,false);
 assert.equal(published.account_balances_published,false);
});
