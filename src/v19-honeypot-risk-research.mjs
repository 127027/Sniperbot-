// D3-05 PRE-TRADE RESEARCH, NOT trading authorization.
// API docs as of 22 Nov 2026: https://docs.honeypot.is/ishoneypot
// Supported ETH(1), BSC(56), Base(8453); V2/V3 ONLY, never V4/Solana/etc.
// Provider simulation is untrusted indicative research and cannot replace
// independent chain simulation/issuer/source risk authorization.
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';
import {verifyArchivedHttpBytes} from './v19-source-integrity.mjs';
const chains=Object.freeze({ethereum:1,bsc:56,base:8453});
const nowMs=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
const money=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
export function buildHoneypotResearchRequest({chain,contract,pool,pool_kind=null}={}){
 const c=canonicalChain(chain);
 if(!Object.hasOwn(chains,c)||pool_kind==='UNISWAP_V4_POOL_ID'
  ||!poolValid(c,pool,pool_kind)||!tokenValid(c,contract)
  ||contract.length!==42||pool.length!==42)
  return {status:'UNSUPPORTED_CHAIN_OR_POOL_FOR_THIS_PROVIDER',url:null,
   allowed_http_requests:0,orders_authorized:0,
   reason:'Official Honeypot.is only supports EVM ETH/BSC/Base and V2/V3 based pools'};
 const url=new URL('https://api.honeypot.is/v2/IsHoneypot');
 url.searchParams.set('address',contract);
 url.searchParams.set('chainID',String(chains[c]));
 url.searchParams.set('pair',pool);
 return {schema:1,kind:'R29_HONEYPOT_RESEARCH_ONLY_REQUEST',
  status:'RESEARCH_REQUEST_ELIGIBLE',
  chain:c,chain_id:chains[c],contract,pool,pool_kind,
  url:url.toString(),provider:'HONEYPOT_IS',
  expected_pair_must_match_exact_pool:true,
  provider_api_key_not_required_as_documented_2026_11_22:true,
  max_requests_per_workflow:1,
  required_cooldown_minutes:10,
  no_synthetic_liquidity:true,
  no_trade_or_order_authorization:true,
  orders_authorized:0};
}
const result=(status,reason,details={})=>({
 schema:1,kind:'R29_V19_D305_HONEYPOT_PROVIDER_RESEARCH_ASOF',
 status,reason,
 risk_research_source:'HONEYPOT_IS_THIRD_PARTY_SIMULATION',
 independent_issuer_verified:false,
 independent_chain_execution_verified:false,
 independently_attested_quote_timestamp:null,
 authentically_live_sell_route_proven:false,
 source_provider_is_single_indicative_upstream:true,
 trade_authorized:false,paper_buy_authorized:false,
 actual_paper_client_fills:0,
 orders_created:0,...details
});
export function classifyHoneypotResearchCapture({request,rawText,evidence,asOfUtc}={}){
 const at=nowMs(asOfUtc),source=buildHoneypotResearchRequest(request);
 if(at===null||source.status!=='RESEARCH_REQUEST_ELIGIBLE')
  return result('DATA_GAP','UNSUPPORTED_SOURCE_OR_INVALID_ASOF');
 if(evidence?.url!==source.url||evidence?.provider!=='HONEYPOT_IS')
  return result('REJECTED_EVIDENCE','SOURCE_URL_OR_PROVIDER_MISMATCH');
 const check=verifyArchivedHttpBytes({
  rawText,evidence,sourcePath:evidence.body_path,asOfUtc
 });
 if(check.status==='POST_ASOF_ONLY')
  return result('DATA_GAP','FUTURE_PROVIDER_CAPTURE_NOT_AVAILABLE_AT_ASOF',
   {original_raw_verification_status:check.status});
 if(check.status==='HTTP_ERROR_ARCHIVED')
  return result('DATA_GAP','PROVIDER_HTTP_ERROR_NOT_A_SELLABILITY_CHECK',
   {original_raw_verification_status:check.status,http_status:evidence.http_status});
 if(check.status!=='SOURCE_BYTES_VERIFIED')
  return result('REJECTED_EVIDENCE','ORIGINAL_PROVIDER_BYTES_NOT_VERIFIED',
   {raw_failure_reason:check.reason});
 let x;
 try{x=JSON.parse(rawText)}catch{
  return result('DATA_GAP','INVALID_JSON_PROVIDER_RESPONSE');
 }
 const exactChain=Number(x.chain?.id)===source.chain_id,
  exactToken=same(x.token?.address,source.contract),
  exactPool=same(x.pairAddress,source.pool)
   &&same(x.pair?.pair?.address,source.pool);
 if(!exactChain||!exactToken||!exactPool)
  return result('REJECTED_EVIDENCE','HONEY_POT_RESPONSE_WRONG_CHAIN_CONTRACT_OR_PAIR',{
   exact_chain:exactChain,exact_token:exactToken,exact_pool:exactPool});
 const pairType=x.pair?.pair?.type;
 if(!['UniswapV2','UniswapV3'].includes(pairType))
  return result('DATA_GAP','UNSUPPORTED_EXCHANGE_OR_PAIR_TYPE',{pair_type:pairType??null});
 const risks=Array.isArray(x.flags)?x.flags:[];
 const summaryFlags=Array.isArray(x.summary?.flags)?x.summary.flags:[];
 const riskLevel=x.summary?.risk??'unknown',sellTax=money(x.simulationResult?.sellTax),
  buyTax=money(x.simulationResult?.buyTax);
 const highRisk=['high','very_high','honeypot'].includes(riskLevel);
 const warnings=[];
 if(x.honeypotResult?.isHoneypot===true)warnings.push('PROVIDER_REPORTS_HONEYPOT');
 if(x.simulationSuccess===false)warnings.push('PROVIDER_SELL_SIMULATION_FAILED');
 if(highRisk)warnings.push('PROVIDER_HIGH_RISK_CATEGORY');
 if(sellTax!==null&&sellTax>10)warnings.push('PROVIDER_SELL_TAX_OVER_10_PERCENT');
 if(risks.length||summaryFlags.some(f=>['critical','high'].includes(f.severity)))
  warnings.push('PROVIDER_SECURITY_FLAGS_PRESENT');
 const missing=[];
 if(x.simulationSuccess!==true)missing.push('PROVIDER_SUCCESSFUL_BUY_SELL_SIMULATION');
 if(x.honeypotResult?.isHoneypot!==false)missing.push('PROVIDER_EXPLICIT_NOT_HONEYPOT');
 if(sellTax===null)missing.push('PROVIDER_NUMERIC_SELL_TAX');
 if(!['very_low','low','medium','high','very_high','honeypot'].includes(riskLevel))
  missing.push('PROVIDER_DEFINED_RISK_LEVEL');
 return result(warnings.length?'WATCH':missing.length?'DATA_GAP':'INDICATIVE_ONLY',
  warnings.length?'REPORTED_SELLABILITY_RISK':
  missing.length?'INCOMPLETE_THIRD_PARTY_RISK_RESPONSE':
  'SINGLE_THIRD_PARTY_SIMULATION_DOES_NOT_PROVE_LIVE_SELLABILITY',{
  source_chain:source.chain,source_contract:source.contract,source_pool:source.pool,
  provider_response_type:pairType,
  provider_risk_level:riskLevel,provider_sell_tax_percent:sellTax,
  provider_buy_tax_percent:buyTax,
  provider_reports_honeypot:x.honeypotResult?.isHoneypot??null,
  provider_reports_simulation_success:x.simulationSuccess??null,
  provider_flags_count:risks.length+summaryFlags.length,
  warnings,missing_fields:missing,
  original_http_sha256_verified:true,
  original_git_blob_id_cross_verified:false,
  original_capture_time_independently_authenticated:false,
  source_time_as_of_utc:evidence.received_at_utc,
  provider_quote_asof_utc:null,
  chain_simulation_was_by_third_party_not_our_own:true,
  third_party_response_could_be_cached:true,
  under_50_test_usdc_exact_sell_amount_proved:false
 });
}
