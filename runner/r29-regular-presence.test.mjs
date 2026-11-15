import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {syncR29RegularPresence,R29_REGULAR_PRESENCE_PATH,
 R29_REGULAR_PRESENCE_SCHEMA} from './r29-windows-courier.mjs';
const PAT='github_pat_FAKE_R29_PRESENCE_TEST_1234567890123456789';
const BASE='https://api.github.com/repos/127027/Sniperbot-/contents/';
function remote(){
 let file=null,sha=null,writes=0;
 const fetcher=async(url,options)=>{
  assert(url.startsWith(BASE));
  assert.equal(options.headers.authorization,'Bearer '+PAT);
  assert(url.includes(R29_REGULAR_PRESENCE_PATH));
  if(options.method==='GET')return file?{
   ok:true,status:200,json:async()=>({type:'file',encoding:'base64',sha,
    content:Buffer.from(JSON.stringify(file)).toString('base64')})}:{ok:false,status:404};
  assert.equal(options.method,'PUT');
  const body=JSON.parse(options.body);
  assert.equal(body.branch,'codex/r29-chatgpt-github-paper-cycle-20261115');
  assert.equal(body.sha,sha??undefined);
  file=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
  sha='mock-sha-'+(++writes);
  return {ok:true,status:201,json:async()=>({commit:{sha}})};
 };
 return {fetcher,status:()=>file,writes:()=>writes};
}
const healthy=async(url,opts)=>{
 assert.equal(url,'http://127.0.0.1:3030/api/health');
 assert.equal(opts.method,'GET');
 return {ok:true,status:200,json:async()=>({ok:true,mode:'PAPER_ONLY'})};
};
test('canonical starter publishes only a read-only regular Paper heartbeat (not second test budget)',async()=>{
 const folder=mkdtempSync(path.join(os.tmpdir(),'r29-presence-'));
 const git=remote();
 const now=Date.now();
 try{
  const first=await syncR29RegularPresence({token:PAT,folder,
   fetcher:git.fetcher,healthFetcher:healthy,now});
  assert.equal(first.status.schema,R29_REGULAR_PRESENCE_SCHEMA);
  assert.equal(first.status.local_paper_http_healthy,true);
  assert.equal(first.status.paper_orders_automatically_enabled,false);
  assert.equal(first.status.real_trading_enabled,false);
  assert.equal(first.published.commit_sha,'mock-sha-1');
  assert.equal(git.writes(),1);
  const allowed=Object.keys(git.status()).sort();
  assert.deepEqual(allowed,['account_balance_or_wallet_published','checked_at_utc',
   'courier_enabled','local_paper_http_healthy','mode',
   'paper_orders_automatically_enabled','real_trading_enabled','schema','target']);
  const serialized=JSON.stringify(git.status());
  for(const secret of [PAT,'5028.408','cashUsdc','walletAddress',
   'private_key','SOLANA','open_positions','main-paper-intent'])
   assert(!serialized.includes(secret),'no private account/identity/test money in public presence');
  const again=await syncR29RegularPresence({token:PAT,folder,fetcher:git.fetcher,
   healthFetcher:healthy,now:now+1000});
  assert.equal(again.skipped_unchanged,true);
  assert.equal(git.writes(),1);
  assert.deepEqual(readdirSync(folder),['r29-local-regular-presence.json']);
  const local=JSON.parse(readFileSync(path.join(folder,'r29-local-regular-presence.json')));
  assert.equal(local.local_paper_http_healthy,true);
  const stale=await syncR29RegularPresence({token:PAT,folder,fetcher:git.fetcher,
   healthFetcher:healthy,now:now+901000});
  assert.equal(stale.skipped_unchanged,false);
  assert.equal(git.writes(),2);
 }finally{rmSync(folder,{recursive:true,force:true})}
});
test('health failure safely reports offline and does not fabricate a paper order',async()=>{
 const folder=mkdtempSync(path.join(os.tmpdir(),'r29-presence-fail-'));
 const git=remote();
 try{
  const s=await syncR29RegularPresence({token:PAT,folder,fetcher:git.fetcher,
   healthFetcher:async()=>{throw Error('BOT_OFFLINE')}});
  assert.equal(s.status.local_paper_http_healthy,false);
  assert.equal(s.status.paper_orders_automatically_enabled,false);
  assert.equal(s.status.account_balance_or_wallet_published,false);
  assert.equal(s.status.real_trading_enabled,false);
 }finally{rmSync(folder,{recursive:true,force:true})}
});
