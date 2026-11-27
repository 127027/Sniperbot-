// GET-only quote diagnostic, no wallets, transaction construction or order execution.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const usd={solana:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',base:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',optimism:'0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'};
const pairs=[['solana','5DQSDg6SGkbsbykq4mQstpcL4d5raEHc6rY7LgBwpump','LOU'],['optimism','0x2598c30330d5771ae9f983979209486ae26de875','AI label unverified'],['base','0xb166e8b140d35d9d8226e40c09f757bac5a4d87d','NPC'],['solana','63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9','GIGA label unverified']];
const integer=x=>typeof x==='string'&&/^[1-9]\d{0,79}$/.test(x);
const same=(c,a,b)=>typeof a==='string'&&typeof b==='string'&&(c==='solana'?a===b:a.toLowerCase()===b.toLowerCase());
const num=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
async function get(url,fetcher=fetch){
 const started_at=new Date().toISOString();let http_status=null,response_sha256=null;
 try{
 const r=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),headers:{accept:'application/json','x-client-id':'r31-paper-diagnostic'}});
 http_status=r.status;const body=await r.text();if(body.length>2000000)throw Error('RESPONSE_TOO_LARGE');response_sha256=createHash('sha256').update(body).digest('hex');
 const receipt={url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256};
 if(!r.ok)return {receipt:{...receipt,error:'HTTP_'+r.status},data:null};
 return {receipt:{...receipt,error:null},data:JSON.parse(body)};
 }catch(e){return {receipt:{url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256,error:String(e.message).slice(0,200)},data:null}}
}
function parse(c,j,from,to,amount){
 const q=c==='solana'?j:j?.data?.routeSummary;
 if(c!=='solana'&&j?.code!==0)return null;
 if(!q||!same(c,c==='solana'?q.inputMint:q.tokenIn,from)||!same(c,c==='solana'?q.outputMint:q.tokenOut,to)||String(c==='solana'?q.inAmount:q.amountIn)!==amount)return null;
 const out=c==='solana'?q.outAmount:q.amountOut;
 if(!integer(out))return null;
 return {amount_in:amount,amount_out:out,gas_usd:c==='solana'?null:num(q.gasUsd),price_impact_pct:c==='solana'?num(q.priceImpactPct):null,slippage_bps:c==='solana'?num(q.slippageBps):null};
}
function url(c,from,to,amount){
 const p=c==='solana'?{inputMint:from,outputMint:to,amount,slippageBps:'50'}:{tokenIn:from,tokenOut:to,amountIn:amount,gasInclude:'true'};
 return (c==='solana'?'https://api.jup.ag/swap/v1/quote':'https://aggregator-api.kyberswap.com/'+c+'/api/v1/routes')+'?'+new URLSearchParams(p);
}
async function leg(c,from,to,amount,fetcher){
 const x=await get(url(c,from,to,amount),fetcher);const quote=parse(c,x.data,from,to,amount);
 return {receipt:x.receipt,quote,error:quote?null:x.receipt.error??'NO_VALID_EXACT_ROUTE'};
}
function reference(j){
 if(!j||!Array.isArray(j.error)||j.error.length)return null;
 const k=Object.keys(j.result??{});if(k.length!==1||!['USDCEUR','USDCZEUR'].includes(k[0]))return null;
 const t=Number(j.result[k[0]]?.c?.[0]);return Number.isFinite(t)&&t>0.5&&t<1.5?t:null;
}
export async function run(fetcher=fetch){
 const fx=await get('https://api.kraken.com/0/public/Ticker?pair=USDCEUR',fetcher);
 const eur_per_usdc=reference(fx.data);
 const amount=eur_per_usdc?String(Math.floor(50/eur_per_usdc*1e6)):null;
 const results=[];
 for(const [chain,contract,label] of pairs){
  const base={chain,contract,label,stake_target_eur:50,settlement_token:usd[chain],mode:'RESEARCH_ONLY',non_executable:true};
  if(!amount){results.push({...base,status:'FX_UNAVAILABLE',entry:null,exit:null,complete_costs:false});continue}
  const entry=await leg(chain,usd[chain],contract,amount,fetcher);
  if(!entry.quote){results.push({...base,status:'ENTRY_QUOTE_UNAVAILABLE',entry,exit:null,complete_costs:false});continue}
  const exit=await leg(chain,contract,usd[chain],entry.quote.amount_out,fetcher);
  const back=exit.quote?Number(exit.quote.amount_out)/1e6*eur_per_usdc:null;
  results.push({...base,status:exit.quote?'INDICATIVE_ROUNDTRIP_ONLY':'EXIT_QUOTE_UNAVAILABLE',entry,exit,reference_input_eur:Number(amount)/1e6*eur_per_usdc,reference_output_eur:back,roundtrip_difference_eur:back===null?null:Number(amount)/1e6*eur_per_usdc-back,complete_costs:false,gas_eur:null,dex_fee_pct:null,buy_tax_pct:null,sell_tax_pct:null,actual_sellability_verified:false,qualified_buys:0});
 }
 return {schema:'r31.readonly-roundtrip-probe.v1',mode:'RESEARCH_ONLY',non_executable:true,fx:{receipt:fx.receipt,eur_per_usdc,provider_quote_time:null},results,qualified_buys:0,limitations:'Reference conversion uses last USDC/EUR ticker price, unknown trade timestamp. Two independent sequential route quotes, not a stateful simulated swap. Route difference is not complete costs; gas, taxes, approvals, actual sellability and execution remain unverified. No transaction built or submitted.'};
}
async function test(){
 const c='base',a=usd[c],b=pairs[2][1],j={code:0,data:{routeSummary:{tokenIn:a,tokenOut:b,amountIn:'100',amountOut:'200',gasUsd:'0.1'}}};
 assert.equal(parse(c,j,a,b,'100').amount_out,'200');assert.equal(parse(c,j,b,a,'100'),null);assert.equal(parse(c,j,a,b,'101'),null);
 assert.equal(reference({error:[],result:{OTHER:{c:['0.9']}}}),null);
 const f=await run(async()=>new Response('unavailable',{status:429}));assert.equal(f.results.length,4);assert.ok(f.results.every(x=>x.status==='FX_UNAVAILABLE'));assert.equal(f.qualified_buys,0);
 console.log('Quote probe fixtures passed: exact identities and amounts, missing FX blocks, no BUY or execution.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.includes('--self-test'))await test();else console.log('ROUNDTRIP_PROBE '+JSON.stringify(await run()))}
