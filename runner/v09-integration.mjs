// V0.9 integration boundary for the existing Windows dashboard.
// This is a read-only diagnostic / pure synthetic quote preview.
// No balance mutation, no wallets or keys, no external order.
import {portfolioBudget} from './portfolio-budget.mjs';
import {quotePaperFunding} from './paper-fiat-onramp.mjs';

export function buildV09Status({state,network}={}){
 const b=portfolioBudget(state);
 const roles=Array.isArray(network?.roles)?network.roles:[];
 const freshRoles=roles.filter(x=>x.stale===false&&x.paper_only===true&&x.actionable===false);
 const advisories=Array.isArray(network?.advisories?.candidates)?
  network.advisories.candidates:[];
 const hasRealApproval=false; // No production real validator/Ed25519 issuer has been deployed.
 return {
  schema:'sniper_v09_integration_status.v1',
  mode:'PAPER_ONLY',live_enabled:false,signing_enabled:false,
  wallet_created:false,payment_provider_connected:false,
  research_transport:network?.transport||'UNAVAILABLE',
  role_snapshots_visible:freshRoles.length,
  roles_expected:5,
  candidates_visible:advisories.length,
  signed_quorum_verified:hasRealApproval,
  real_contract_validator_connected:false,
  real_size_specific_sell_quote_connected:false,
  automated_external_paper_trading_enabled:false,
  current_paper_budget:{
   valid:b.valid,cap_test_usdc:b.cap_test_usdc,
   available_to_allocate_test_usdc:b.free_to_allocate_test_usdc,
   reserved_test_usdc:b.reserved_test_usdc},
  active_module:'READ_ONLY_STATUS_AND_PAPER_FUNDING_PREVIEW',
  message:'GitHub-Rollen informieren nur. Ein unsigniertes Research-Advisory erzeugt keine Kauf- oder Verkaufstransaktion.'
 };
}
export function previewFundingV09({amountEur,eurPerUsdc,
 providerFeeEur=0,spreadPct=0,networkFeeUsdc=0,now=Date.now()}={}){
 return quotePaperFunding({
  mode:'PAPER',provider:'SYNTHETIC_FIAT_FIXTURE',
  eur_amount:amountEur,eur_per_usdc:eurPerUsdc,
  provider_fee_eur:providerFeeEur,spread_pct:spreadPct,
  network_fee_usdc:networkFeeUsdc,
  rate_observed_at_utc:new Date(now).toISOString(),now
 });
}
