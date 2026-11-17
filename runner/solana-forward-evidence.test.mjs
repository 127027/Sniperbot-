import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {LEGACY_TOKEN_PROGRAM} from './solana-mint-risk.mjs';
import {SOL_MINT,JUPITER_V2_ORDER} from './solana-swap-quote.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
import {evaluateForwardSolanaResearch,readFinalizedSolanaMint,
 selectForwardSolanaCandidate,syncPublicForwardSolanaResearch}
 from './solana-forward-evidence.mjs';

const at='2026-11-17T18:00:00.000Z',now=Date.parse(at);
const mint='9'.repeat(44),pool='8'.repeat(44),id='solana:'+mint+':'+pool;
const snapshot=()=>({
 schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 collection_status:'OBSERVED_OR_PARTIAL',
 published_at_utc:at,
 candidates:[{chain:'solana',token_address:mint,pool_address:pool,
  candidate_id:id,source:'GECKOTERMINAL_NEW_POOLS',
  verification:'CROSS_PROVIDER_IDENTITY',promotion_biased:false,
  observed_at_utc:at,pool_created_at_utc:at,
  liquidity_usd:60000,volume_m5_usd:4000,
  source_urls:[
   'https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1',
   'https://api.dexscreener.com/latest/dex/pairs/solana/'+pool]}]
});
const mintHeader=()=>{
 const b=Buffer.alloc(82);b.writeUInt32LE(0,0);
 b.writeBigUInt64LE(1000000n,36);b[44]=9;b[45]=1;b.writeUInt32LE(0,46);
 return {owner:LEGACY_TOKEN_PROGRAM,executable:false,space:82,
  data:[b.toString('base64'),'base64']};
};
const rpc=async(url,opts)=>{
 assert.equal(url,SOLANA_MAINNET_RPC);
 assert.equal(opts.method,'POST');
 const body=JSON.parse(opts.body);
 assert.equal(body.method,'getAccountInfo');
 assert.equal(body.params[0],mint);
 assert.equal(body.params[1].commitment,'finalized');
 assert.equal(body.params[1].encoding,'base64');
 return new Response(JSON.stringify({jsonrpc:'2.0',id:1,
  result:{context:{slot:3456789},value:mintHeader()}}),{status:200});
};
const quote=async(url,opts)=>{
 const u=new URL(url);
 assert.equal(u.origin,new URL(JUPITER_V2_ORDER).origin);
 assert.equal(opts.method,'GET');
 assert(!u.searchParams.has('taker'));
 const buy=u.searchParams.get('inputMint')===SOL_MINT;
 assert.equal(u.searchParams.get('outputMint'),buy?mint:SOL_MINT);
 assert.equal(u.searchParams.get('inputMint'),buy?SOL_MINT:mint);
 assert.equal(u.searchParams.get('amount'),buy?'10000000':'1000000');
 return new Response(JSON.stringify({
  transaction:null,inAmount:buy?'10000000':'1000000',
  outAmount:buy?'1000000':'9700000',feeBps:buy?4:3,
  router:'metis'}),{status:200});
};
test('finalized SPL mint and actual quote-only reverse preview produce research, NEVER execution',async()=>{
 const r=await evaluateForwardSolanaResearch({snapshot:snapshot(),now,
  rpcFetcher:rpc,quoteFetcher:quote});
 assert.equal(r.selection_reason,'FRESH_CROSS_PROVIDER_RESEARCH_LEAD_ONLY');
 assert.equal(r.finalized_mint_observation.finalized_account_slot,3456789);
 assert.equal(r.finalized_mint_observation.mint_authority,'REVOKED');
 assert.equal(r.finalized_mint_observation.freeze_authority,'REVOKED');
 assert.equal(r.mint_check_status,'FINALIZED_MINT_HEADER_OBSERVED');
 assert.equal(r.quote_status,'INDICATIVE_TWO_WAY_PRICES_ONLY');
 assert.equal(r.quote_roundtrip.roundtrip_change_bps,-300);
 assert.equal(r.paper_only,true);
 for(const flag of ['contract_security_verified','holder_concentration_verified',
   'lp_control_verified','executable_buy_quote_verified',
   'executable_sell_quote_verified','sellability_verified',
   'gpt_buy_approved','paper_order_created','paper_fill_received'])
   assert.equal(r[flag],false);
 assert.equal(r.capital_in_test_usdc,null);
 assert.equal(r.exit_proceeds_test_usdc,null);
});
test('pool, source identity and source freshness must all match or block remote calls',async()=>{
 for(const change of [
  s=>{s.published_at_utc='2026-11-17T17:30:00Z'},
  s=>{s.candidates[0].verification='PROVIDER_ONLY'},
  s=>{s.candidates[0].promotion_biased=true},
  s=>{s.candidates[0].source_urls=['https://api.geckoterminal.com/x']},
  s=>{s.candidates[0].source_urls[1]='https://evil.invalid/x'},
  s=>{s.candidates[0].pool_address='9'.repeat(44)},
  s=>{s.candidates[0].chain='eth'},
 ]){
  const s=snapshot();change(s);
  const pick=selectForwardSolanaCandidate(s,{now});
  assert.equal(pick.candidate,null);
  const r=await evaluateForwardSolanaResearch({snapshot:s,now,
   rpcFetcher:async()=>{throw Error('MUST_NOT_CALL_RPC')},
   quoteFetcher:async()=>{throw Error('MUST_NOT_QUOTE')}});
  assert.equal(r.paper_order_created,false);
  assert.equal(r.research_target,null);
 }
});
test('RPC invalid mint still cannot authorize a paper BUY and provider outage stays DATA_GAP',async()=>{
 const noMint=await evaluateForwardSolanaResearch({snapshot:snapshot(),now,
  rpcFetcher:async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,
   result:{context:{slot:2},value:null}}),{status:200}),
  quoteFetcher:quote});
 assert.equal(noMint.mint_check_status,'READ_ONLY_PROVIDER_OR_PROVENANCE_FAILED');
 assert.equal(noMint.quote_status,'INDICATIVE_TWO_WAY_PRICES_ONLY');
 assert.equal(noMint.paper_order_created,false);
 const quoteDown=await evaluateForwardSolanaResearch({snapshot:snapshot(),now,
  rpcFetcher:rpc,quoteFetcher:async()=>new Response('{}',{status:503})});
 assert.equal(quoteDown.quote_status,'QUOTE_DATA_GAP');
 assert.equal(quoteDown.mint_check_status,'FINALIZED_MINT_HEADER_OBSERVED');
 assert.equal(quoteDown.gpt_buy_approved,false);
});
test('sensitive Jupiter API key is only an outbound header, never returned or published',async()=>{
 const key='JUPITER-TEST-KEY-1234567890123456';
 const seen=[];
 const r=await evaluateForwardSolanaResearch({snapshot:snapshot(),now,
  rpcFetcher:rpc,apiKey:key,quoteFetcher:async(url,opts)=>{
   seen.push(opts.headers['x-api-key']);
   return quote(url,opts);
  }});
 assert.deepEqual(seen,[key,key]);
 assert(!JSON.stringify(r).includes(key));
 assert.equal(r.real_trading_enabled,false);
 await assert.rejects(evaluateForwardSolanaResearch({snapshot:snapshot(),now,
  apiKey:'unsafe\nHeader'}),/SOLANA_FORWARD_CLOCK_INVALID/);
});
test('GitHub copy has only read-only evidence and is idempotent',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'r29-sol-research-'));
 try{
  const filename=path.join(folder,'latest.json');
  await writeFile(filename,JSON.stringify(snapshot()));
  let old=null,puts=0;
  const fetcher=async(url,opts)=>{
   assert(url.includes('/research/r29/channel/solana-forward-evidence.json'));
   if(opts.method==='GET')return old?
    {status:200,ok:true,json:async()=>({type:'file',
     sha:'a'.repeat(40),encoding:'base64',
     content:Buffer.from(JSON.stringify(old)).toString('base64')})}:
    {status:404,ok:false};
   assert.equal(opts.method,'PUT');
   puts++;
   const payload=JSON.parse(opts.body);
   const publicFile=Buffer.from(payload.content,'base64').toString('utf8');
   assert(!publicFile.includes('JUPITER-TEST-KEY'));
   assert(!publicFile.includes('cashUsdc'));
   old=JSON.parse(publicFile);
   return {status:201,ok:true,json:async()=>({commit:{sha:'b'.repeat(40)}})};
  };
  const opt={token:'github_pat_FAKE_RESEARCH_12345678901234',
   now,filename,fetcher,rpcFetcher:rpc,quoteFetcher:quote,wait:async()=>{}};
  const first=await syncPublicForwardSolanaResearch(opt);
  assert.equal(first.published,true);
  assert.equal(first.status,'PUBLIC_READ_ONLY_FORWARD_SOLANA_EVIDENCE');
  assert.equal(first.trade_executed,false);
  assert.equal(puts,1);
  const repeat=await syncPublicForwardSolanaResearch(opt);
  assert.equal(repeat.published,false);
  assert.equal(repeat.status,'FORWARD_EVIDENCE_NOT_NEWER');
  assert.equal(puts,1);
 }finally{await rm(folder,{force:true,recursive:true})}
});
test('zero wallet access, no source file means no GitHub call',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'r29-sol-readonly-empty-'));
 try{
  const f=path.join(folder,'absent.json');
  await assert.rejects(syncPublicForwardSolanaResearch({
   token:'',filename:f,now,
   fetcher:async()=>{throw Error('GITHUB_MUST_NOT_BE_CALLED')}
  }),/TOKEN_REQUIRED/);
  const missing=await syncPublicForwardSolanaResearch({
   token:'github_pat_FAKE_RESEARCH_12345678901234',filename:f,now,
   fetcher:async()=>{throw Error('GITHUB_MUST_NOT_BE_CALLED')}});
  assert.equal(missing.published,false);
 }finally{await rm(folder,{force:true,recursive:true})}
});
