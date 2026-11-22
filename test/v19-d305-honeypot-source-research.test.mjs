import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildHoneypotResearchRequest,classifyHoneypotResearchCapture}
 from '../src/v19-honeypot-risk-research.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const at='2026-11-22T20:30:00.000Z',captured='2026-11-22T20:29:00.000Z';
const contract='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const request={chain:'bsc',contract,pool,pool_kind:null};
const reply=()=>({token:{address:contract},chain:{id:'56'},
 pair:{pair:{address:pool,type:'UniswapV2'}},
 pairAddress:pool,
 summary:{risk:'low'},simulationSuccess:true,
 honeypotResult:{isHoneypot:false},simulationResult:{buyTax:1,sellTax:2},flags:[]});
function from(x,overrides={}){
 const p=buildHoneypotResearchRequest(request);
 const rawText=JSON.stringify(x),body_path='research/feeds/2026-11-22/1234567890/honeypot-bsc-0x'+contract.slice(2)+'.raw.json';
 return {request,rawText,evidence:{
  provider:'HONEYPOT_IS',url:p.url,body_path,
  http_status:200,http_ok:true,
  started_at_utc:'2026-11-22T20:28:59.000Z',
  received_at_utc:captured,response_sha256:sha(rawText),...overrides
 },asOfUtc:at};
}
test('D3-05: only exact supported EVM chain+pool+contract; Solana, V4, unsupported chains cannot request provider',()=>{
 for(const chain of ['ethereum','bsc','base']){
  const x=buildHoneypotResearchRequest({chain,contract,pool});
  assert.equal(x.status,'RESEARCH_REQUEST_ELIGIBLE');
  assert.equal(x.no_trade_or_order_authorization,true);
  assert.equal(new URL(x.url).hostname,'api.honeypot.is');
  assert.equal(new URL(x.url).searchParams.get('pair'),pool);
 }
 assert.equal(buildHoneypotResearchRequest({chain:'solana',contract,pool}).allowed_http_requests,0);
 assert.equal(buildHoneypotResearchRequest({chain:'robinhood',contract,pool}).allowed_http_requests,0);
 assert.equal(buildHoneypotResearchRequest({chain:'bsc',contract,pool,pool_kind:'UNISWAP_V4_POOL_ID'}).allowed_http_requests,0);
 assert.equal(buildHoneypotResearchRequest({chain:'bsc',contract,pool:'0xdeadbeef'}).allowed_http_requests,0);
});
test('D3-05: favorable THIRD-PARTY honeypot result is only indicative, never authenticated buy permission',()=>{
 const x=classifyHoneypotResearchCapture(from(reply()));
 assert.equal(x.status,'INDICATIVE_ONLY');
 assert.equal(x.original_http_sha256_verified,true);
 assert.equal(x.original_capture_time_independently_authenticated,false);
 assert.equal(x.independently_attested_quote_timestamp,null);
 assert.equal(x.authentically_live_sell_route_proven,false);
 assert.equal(x.trade_authorized,false);
 assert.equal(x.orders_created,0);
 assert.equal(x.actual_paper_client_fills,0);
});
test('D3-05: provider reports honeypot, blocked simulation or tax => WATCH no trade',()=>{
 for(const edit of [
  x=>x.honeypotResult.isHoneypot=true,
  x=>x.simulationSuccess=false,
  x=>x.simulationResult.sellTax=15,
  x=>x.summary.risk='honeypot',
  x=>x.flags.push('TRANSFER_BLOCKED')
 ]){
  const x=reply();edit(x);
  const o=classifyHoneypotResearchCapture(from(x));
  assert.equal(o.status,'WATCH');
  assert.equal(o.trade_authorized,false);
  assert.ok(o.warnings.length);
 }
});
test('D3-05: wrong pool/chain/token or UniswapV4 response rejected even with attractive simulated tax',()=>{
 for(const edit of [
  x=>x.chain.id='1',
  x=>x.token.address='0x'+'c'.repeat(40),
  x=>x.pair.pair.address='0x'+'c'.repeat(40),
  x=>x.pair.pair.type='UniswapV4'
 ]){
  const x=reply();edit(x);const o=classifyHoneypotResearchCapture(from(x));
  assert.notEqual(o.status,'INDICATIVE_ONLY');
  assert.equal(o.trade_authorized,false);
 }
});
test('D3-05: forged raw, after-asof, HTTP429, unknown quote and malicious API url remain fail-closed',()=>{
 const a=from(reply());a.rawText+='tamper';
 assert.equal(classifyHoneypotResearchCapture(a).status,'REJECTED_EVIDENCE');
 const b=from(reply());b.asOfUtc='2026-11-22T20:28:00Z';
 assert.equal(classifyHoneypotResearchCapture(b).status,'DATA_GAP');
 const c=from(reply(),{http_status:429,http_ok:false});
 assert.equal(classifyHoneypotResearchCapture(c).status,'DATA_GAP');
 const d=from({...reply(),simulationResult:{buyTax:1}});
 assert.equal(classifyHoneypotResearchCapture(d).status,'DATA_GAP');
 const e=from(reply(),{url:'https://evil.example/fake'});
 assert.equal(classifyHoneypotResearchCapture(e).status,'REJECTED_EVIDENCE');
});
