// V0.9 Paper-only fiat funding scenario. This is NOT a PayPal API,
// on-ramp integration, FX quote, wallet, external transfer, or authorization.
// Same paper budget constraints remain enforced by execution-parity-lab.
const money=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&Math.abs(n*100-Math.round(n*100))<1e-7;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const blocked=reason=>({status:'BLOCKED',reason,ledger:null});
export function quotePaperFunding({
 mode='PAPER',eur_amount,eur_per_usdc,provider_fee_eur=0,
 spread_pct=0,network_fee_usdc=0,rate_observed_at_utc,
 now=Date.now(),provider='SYNTHETIC_FIAT_FIXTURE'
}={}){
 if(mode!=='PAPER')return blocked('REAL_FUNDS_DISABLED');
 if(provider!=='SYNTHETIC_FIAT_FIXTURE')return blocked('REAL_PROVIDER_DISABLED');
 if(!money(eur_amount)||eur_amount<=0||eur_amount>100000||
  !Number.isFinite(eur_per_usdc)||eur_per_usdc<=0||
  !money(provider_fee_eur)||!money(network_fee_usdc)||
  typeof spread_pct!=='number'||!Number.isFinite(spread_pct)||
  spread_pct<0||spread_pct>=100)return blocked('INVALID_FUNDING_PARAMETERS');
 const at=Date.parse(rate_observed_at_utc);
 if(!Number.isFinite(at)||at>now||now-at>60000)return blocked('STALE_OR_UNKNOWN_EXCHANGE_RATE');
 const eurNet=eur_amount-provider_fee_eur;
 if(eurNet<=0)return blocked('FEES_EXCEED_DEPOSIT');
 const usdc=round(eurNet/eur_per_usdc*(1-spread_pct/100)-network_fee_usdc);
 if(usdc<=0)return blocked('FEES_EXCEED_RECEIPT');
 return {status:'PAPER_QUOTED',paper_only:true,payment_performed:false,
  provider,eur_amount,eur_per_usdc,provider_fee_eur,spread_pct,
  network_fee_usdc,expected_test_usdc:usdc,
  quote_expires_at_utc:new Date(now+60000).toISOString(),
  warning:'Testquote; keine Euroeinzahlung, kein Paypal-Konto und kein realer Geldwechsel.'};
}
export function applyPaperFunding(state,quote,{now=Date.now()}={}){
 if(quote?.status!=='PAPER_QUOTED'||quote.provider!=='SYNTHETIC_FIAT_FIXTURE'||
  quote.paper_only!==true||quote.payment_performed!==false||
  !money(quote.expected_test_usdc)||quote.expected_test_usdc<=0||
  !Number.isFinite(Date.parse(quote.quote_expires_at_utc))||
  now>Date.parse(quote.quote_expires_at_utc))throw Error('PAPER_FUNDING_QUOTE_INVALID');
 if(!state||!money(state.cashUsdc)||!Array.isArray(state.positions)||
  state.positions.length!==0||state.entriesEnabled===true)
  throw Error('FUNDING_REQUIRES_PAUSED_EMPTY_PAPER_ACCOUNT');
 // Explicit one-time scenario setup; no implicit crediting of live funds.
 if(state.paperFundingInitialized===true)throw Error('PAPER_FUNDING_ALREADY_INITIALIZED');
 return {...state,cashUsdc:round(state.cashUsdc+quote.expected_test_usdc),
  paperFundingInitialized:true,paperFundingScenario:{
   eur_amount:quote.eur_amount,expected_test_usdc:quote.expected_test_usdc,
   provider:quote.provider,paper_only:true,performed_at_utc:new Date(now).toISOString()}};
}
