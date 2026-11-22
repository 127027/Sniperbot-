// R29 V1.9 D3-05 – chain-specific sellability RESEARCH diagnostics.
// All evidence is self-reported until independent chain simulation, real
// provider proofs and a trusted issuer have been verified (D3-04/D3-05).
// The goal is to preserve potentially good pools under DATA_GAP rather than
// execute fake sales or discard all uncertain memecoins.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';
const at=asOfMillis;
const same=(c,a,b)=>c==='solana'?a===b:String(a).toLowerCase()===String(b).toLowerCase();
const evm=new Set(['ethereum','base','bsc','robinhood','cronos']);
const hasBool=x=>x===true||x===false;
const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;

export function assessChainSellability({coin,evidence=null,asOfUtc,
 entryAmountTestUsdc=50,maxReportedSellTaxBps=1000,
 maxEvidenceAgeSeconds=300,mode='LIVE_PAPER'}={}){
 const now=at(asOfUtc),chain=canonicalChain(coin?.chain);
 if(now===null||!chain||!poolValid(chain,coin?.pool,coin?.pool_kind)
   ||!tokenValid(chain,coin?.contract)||!Number.isFinite(entryAmountTestUsdc)
   ||entryAmountTestUsdc<=0
   ||!Number.isInteger(maxReportedSellTaxBps)||maxReportedSellTaxBps<0
   ||maxReportedSellTaxBps>10000
   ||!Number.isInteger(maxEvidenceAgeSeconds)||maxEvidenceAgeSeconds<1
   ||maxEvidenceAgeSeconds>3600
   ||!['LIVE_PAPER','HISTORICAL_ASOF','SYNTHETIC_REGRESSION_ONLY'].includes(mode))
  throw Error('INVALID_DOT3_SELLABILITY_INPUT');
 const gaps=[],warnings=[],probes=[],kind=evm.has(chain)?'EVM':'SOLANA';
 const add=(n,value)=>{if(value!==true)gaps.push(n)};
 const evidenceCapture=at(evidence?.captured_at_utc);
 const available=at(evidence?.available_at_utc);
 if(!evidence||typeof evidence!=='object'||evidence.source_class==='POST_EVENT_ORACLE'
   ||evidence?.future_winner_label!==undefined){
  gaps.push('VALID_ASOF_SELLABILITY_SOURCE');
 }else{
  if(evidenceCapture===null||available===null||available<evidenceCapture
     ||evidenceCapture>now||available>now)
   gaps.push('CONTEMPORANEOUS_SOURCE_TIME');
  else if(now-evidenceCapture>maxEvidenceAgeSeconds*1000)
   gaps.push('SELLABILITY_SOURCE_TOO_OLD');
  if(canonicalChain(evidence.chain)!==chain
   ||!same(chain,evidence.contract,coin.contract)
   ||!same(chain,evidence.pool,coin.pool))
   gaps.push('EXACT_CHAIN_CONTRACT_POOL_IDENTITY');
  if(kind==='EVM'){
   add('ERC20_TRANSFER_CALL_SIMULATED',evidence.transfer_simulation_success);
   add('EXACT_POOL_BUY_ROUTE_SIMULATED',evidence.buy_route_simulation_success);
   add('EXACT_POOL_SELL_ROUTE_SIMULATED',evidence.sell_route_simulation_success);
   add('TOKEN_ADMIN_OWNER_PRIVILEGES_CHECKED',evidence.owner_privileges_checked);
   add('BLACKLIST_AND_TRANSFER_RESTRICTIONS_CHECKED',evidence.blacklist_checked);
   add('TAX_ESTIMATE_AVAILABLE',numeric(evidence.sell_tax_bps));
   if(numeric(evidence.sell_tax_bps)&&evidence.sell_tax_bps>maxReportedSellTaxBps)
     warnings.push('REPORTED_SELL_TAX_EXCEEDS_RESEARCH_THRESHOLD');
   if(evidence.sell_route_simulation_success===false)
     warnings.push('REPORTED_SELL_ROUTE_FAILURE');
   if(evidence.blacklist_detected===true)
     warnings.push('REPORTED_BLACKLIST_RISK');
   if(evidence.owner_can_change_tax===true)
     warnings.push('REPORTED_MUTABLE_TAX_RISK');
   probes.push('ETH_CALL_TRANSFER_AND_SWAP_ROUTE','EXACT_POOL_BUY_AND_SELL_SIMULATION',
    'OWNER_AND_UPGRADE_PRIVILEGE_READ','BLACKLIST_AND_TRANSFER_TAX_INSPECTION');
  }else{
   add('SPL_TOKEN_MINT_AUTHORITY_INSPECTED',evidence.mint_authority_inspected);
   add('SPL_TOKEN_FREEZE_AUTHORITY_INSPECTED',evidence.freeze_authority_inspected);
   add('SPL_TOKEN_PROGRAM_INSPECTED',evidence.token_program_inspected);
   add('SOLANA_EXACT_POOL_SELL_ROUTE_SIMULATED',evidence.sell_route_simulation_success);
   add('SOLANA_TRANSACTION_DRY_RUN',evidence.transaction_dry_run_success);
   if(evidence.freeze_authority_present===true)
     warnings.push('REPORTED_ACTIVE_FREEZE_AUTHORITY');
   if(evidence.mint_authority_present===true)
     warnings.push('REPORTED_ACTIVE_MINT_AUTHORITY');
   if(evidence.transfer_hook_present===true)
     warnings.push('REPORTED_TRANSFER_HOOK_RISK');
   if(evidence.sell_route_simulation_success===false)
     warnings.push('REPORTED_SELL_ROUTE_FAILURE');
   probes.push('SPL_MINT_FREEZE_AND_TOKEN_PROGRAM_READ','TOKEN_2022_TRANSFER_HOOK_CHECK',
    'EXACT_POOL_SWAP_ROUTE','SOLANA_RPC_SIMULATE_TRANSACTION');
  }
  if(evidence?.liquidity_usd!==undefined
    &&(!numeric(evidence.liquidity_usd)||evidence.liquidity_usd<=0))
   warnings.push('REPORTED_NO_EXIT_LIQUIDITY');
 }
 // Never infer safety from lack of a warning, or from a caller-provided
 // "verified" flag. A complete synthetic evidence fixture proves only code.
 const status=warnings.length>0?'WATCH':gaps.length>0?'DATA_GAP':
   mode==='SYNTHETIC_REGRESSION_ONLY'?'SYNTHETIC_POSSIBLE_SELLABILITY':
   'DATA_GAP';
 const unresolved=mode==='SYNTHETIC_REGRESSION_ONLY'?gaps:
   [...new Set([...gaps,'INDEPENDENT_CHAIN_PROVIDER_BYTES_AND_EXECUTION_PROOF',
     'TRUSTED_SELLABILITY_ISSUER_AUTHENTICATION'])];
 return {schema:1,kind:'R29_V19_DOT3_SELLABILITY_RESEARCH',mode,
  as_of_utc:asOfUtc,chain,contract:coin.contract,pool:coin.pool,
  chain_family:kind,status,missing_fields:unresolved,warnings,
  required_provider_checks:probes,
  next_action:status==='WATCH'?'RECHECK_NEGATIVE_SELLABILITY_WARNING':
    'ACQUIRE_INDEPENDENT_ONCHAIN_SELLABILITY_EVIDENCE',
  requested_test_position_usdc:entryAmountTestUsdc,
  simulated_sell_route_is_not_an_actual_sell:true,
  complete_regression_fixture:status==='SYNTHETIC_POSSIBLE_SELLABILITY',
  any_issuer_claim_independently_authenticated:false,
  proof_of_live_sellability:false,
  live_paper_buy_authorized:false,
  real_onchain_transaction_executed:false};
}
