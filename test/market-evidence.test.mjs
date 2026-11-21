import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenValid,poolValid,parsePoolUrl,exactPoolUrl,explorerToken,identityDiagnostics} from '../src/market-evidence.mjs';
import {newState,settlePaper,Reject} from '../src/core.mjs';
import {GitHubTransport} from '../src/github.mjs';
const token='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const pool='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const coin={chain:'base',contract:token,pool,symbol:'X'};
const gt='https://www.geckoterminal.com/de/base/pools/'+pool;
const ds='https://dexscreener.com/base/'+pool;
function make(){const now=Date.now();return {id:'synthetic-buy-0001',mode:'PAPER',action:'BUY',authority:'dot-4-strategy',dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],reason:'Two matched pool pages in an isolated test',coin,amount_test_usdc:50,quote_quality:'INDICATIVE_WEB_ONLY',created_at:new Date(now).toISOString(),expires_at:new Date(now+60000).toISOString(),quotes:[gt,ds].map((source_url,i)=>({...coin,provider_id:'source-'+i,source_url,observed_at:new Date(now).toISOString(),price_usdc:.001,liquidity_usdc:20000}))};}
const reject=o=>{try{settlePaper(o,newState(),Date.now());return null;}catch(e){assert.ok(e instanceof Reject);return e.code;}};
test('recognizes only exact matching public pool detail URLs',()=>{
 assert.equal(exactPoolUrl(gt,'base',pool),true);
 assert.equal(exactPoolUrl(ds,'base',pool),true);
 assert.equal(parsePoolUrl('https://example.net/base/'+pool),null);
 const o=make();o.quotes[1].source_url='https://dexscreener.com/base/'+token;
 assert.equal(reject(o),'SOURCE_POOL_URL_MISMATCH');
});
test('indicative web mode requires complete contract, not placeholder',()=>{
 const o=make();o.coin={...coin,contract:'ExampleContract123'};
 assert.equal(tokenValid('base',token),true);
 assert.equal(reject(o),'INVALID_COIN_ADDRESS');
});
test('solana addresses and uniswap v4 pool ids are distinct',()=>{
 assert.equal(tokenValid('solana','So11111111111111111111111111111111111111112'),true);
 assert.equal(poolValid('ethereum','0x'+'a'.repeat(64)),false);
 assert.equal(poolValid('ethereum','0x'+'a'.repeat(64),'UNISWAP_V4_POOL_ID'),true);
});
test('explorer links are candidate evidence, not proof of safety',()=>{
 assert.equal(explorerToken('base','https://basescan.org/token/'+token).contract,token);
 assert.equal(explorerToken('bsc','https://basescan.org/token/'+token),null);
});
test('unknown provider quote date is explicit gap',()=>{
 assert.ok(identityDiagnostics({...coin,source_url:gt,quote_date_verified:false}).issues.includes('PRICE_PROVIDER_ASOF_UNVERIFIED'));
});
test('lost receipt acknowledgment recovers identical existing receipt',async()=>{
 const t=new GitHubTransport('TEST','client-test-1111'),r={id:'synthetic-buy-0001',status:'PAPER_FILLED'};
 t.request=async()=>{throw Error('lost reply')};
 t.read=async()=>({data:{...r,client_id:'client-test-1111'}});
 assert.equal((await t.publishReceipt(r.id,r)).status,'ALREADY_PUBLISHED');
 t.read=async()=>({data:{...r,client_id:'wrong'}});
 await assert.rejects(t.publishReceipt(r.id,r),/lost reply/);
});
