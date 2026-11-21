import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,settlePaper,Reject} from '../src/core.mjs';
import {GitHubTransport} from '../src/github.mjs';
import {researchDue,chooseCadence} from '../src/cadence.mjs';
function make(now){const coin={chain:'base',contract:'ExampleContract123',pool:'ExamplePool123',symbol:'EX'};
  return {id:'client-test-buy-001',mode:'PAPER',action:'BUY',authority:'dot-4-strategy',dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],reason:'Two independent source indicative price observations',quote_quality:'INDICATIVE_WEB_ONLY',created_at:new Date(now).toISOString(),expires_at:new Date(now+180000).toISOString(),coin,amount_test_usdc:50,quotes:['dexscreener.com','geckoterminal.com'].map((host,i)=>({provider_id:'source-'+i,source_url:'https://'+host+'/base/pools/ExamplePool123',observed_at:new Date(now-180000).toISOString(),price_usdc:.001,liquidity_usdc:25000,chain:'base',contract:coin.contract,pool:coin.pool}))};}
test('two independent client ledgers',()=>{const t=Date.now(),a=newState(),b=newState();assert.notEqual(a.clientId,b.clientId);assert.equal(settlePaper(make(t),a,t).state.cash,4950);assert.equal(settlePaper(make(t),b,t).state.cash,4950);});
test('offline signals expire',()=>{const t=Date.now();assert.throws(()=>settlePaper(make(t),newState(),t+600000),e=>e instanceof Reject&&e.code==='ORDER_EXPIRED');});
test('distinct indicative web sources',()=>{const t=Date.now(),o=make(t);o.quotes[1].source_url='https://www.dexscreener.com/base/other';assert.throws(()=>settlePaper(o,newState(),t),e=>e instanceof Reject&&e.code==='DUPLICATE_QUOTE_DOMAIN');});
test('separate per-client GitHub receipts',async()=>{let paths=[];for(const id of ['client-aaaa1111','client-bbbb2222']){const tr=new GitHubTransport('TEST_ONLY',id);tr.request=async(path)=>{paths.push(path);return {};};await tr.publishReceipt('client-test-buy-001',{status:'PAPER_FILLED'});}assert.notEqual(paths[0],paths[1]);});
test('adaptive 4/8/12/24 gate',()=>{assert.equal(chooseCadence({dataAvailable:true,newPools:100},4).target,24);assert.equal(chooseCadence({dataAvailable:true},24).target,24);assert.equal(chooseCadence({dataAvailable:true,consecutiveQuietChecks:2},24).target,4);assert.equal(researchDue('2026-11-21T08:00:00Z','2026-11-21T07:00:00Z',24).due,true);});
