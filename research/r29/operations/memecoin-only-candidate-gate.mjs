// R29 MEMECOIN ONLY. Pure research candidate filter, NEVER order authority.
// Explicit user mandate: target small/new or newly viral meme tokens with
// potential 10x+ in approx. 1-7 weeks. 10x is NOT a guaranteed prediction.
const EVM=/^0x[a-fA-F0-9]{40}$/,SOL=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EXCLUDED=new Set([
 "BTC","WBTC","TBTC","ETH","WETH","STETH","WSTETH","SOL","WSOL",
 "BNB","WBNB","ADA","XRP","AVAX","LINK","DOT","TRX",
 "DOGE","SHIB","PEPE","BONK","WIF","FLOKI","TRUMP"
]);
const DEFAULT_MAX_FDV=50_000_000; // conservative placeholder, review on train only
const HOURS_72=72*3600000,DAY=86400000;
export function memeDiscoveryCandidate(candidate,{asof_utc,max_fdv_usd=DEFAULT_MAX_FDV}={}){
 const now=Date.parse(asof_utc);
 if(!Number.isFinite(now)||!Number.isFinite(max_fdv_usd)||max_fdv_usd<=0)
  throw Error("MEME_SNIPER_INVALID_REVIEW_CLOCK_OR_POLICY");
 const base={candidate_class:"RESEARCH_ONLY_NOT_BUY_AUTHORITY",
  target:"SMALL_NEW_OR_VIRAL_MEMECOIN_NOT_MACRO",
  desired_10x_upside_not_guaranteed:true,
  research_horizon_days:[7,49],
  model_gpt_buy_authorized:false,
  safety_and_sellability_still_required:true,
  real_wallet_or_paper_ledger_mutated:false};
 const fail=(reason)=>({...base,eligible_for_meme_research:false,
  status:reason});
 if(!candidate||typeof candidate!=="object")return fail("MISSING_CANDIDATE");
 const {symbol,chain,token_address,pool_address,theme,
  claimed_fdv_usd,fdv_observed_at_utc,
  launched_at_utc,media_event_at_utc,
  independently_verified_media_sources=0}=candidate;
 const s=String(symbol||"").toUpperCase().trim();
 if(EXCLUDED.has(s))return fail("MAJOR_OR_ESTABLISHED_BLUECHIP_EXCLUDED");
 if(!["solana","eth","base","bsc"].includes(chain))
  return fail("CHAIN_NOT_RESEARCH_SUPPORTED");
 const validAddress=chain==="solana"?SOL:EVM;
 if(!validAddress.test(String(token_address||""))||
  !validAddress.test(String(pool_address||"")))
  return fail("MISSING_CHAIN_TOKEN_POOL_IDENTITY");
 if(theme!=="MEME"&&theme!=="CULTURAL_SOCIAL_MEME")
  return fail("NOT_EVIDENCED_MEMECOIN_THEME");
 if(typeof claimed_fdv_usd!=="number"||!Number.isFinite(claimed_fdv_usd)||
  claimed_fdv_usd<=0||claimed_fdv_usd>max_fdv_usd)
  return fail("FDV_UNKNOWN_OR_TOO_LARGE");
 const fdvAt=Date.parse(fdv_observed_at_utc);
 if(!Number.isFinite(fdvAt)||fdvAt>now||now-fdvAt>HOURS_72)
  return fail("FDV_NOT_IN_ASOF_FRESH_WINDOW");
 const launched=Date.parse(launched_at_utc);
 const young=Number.isFinite(launched)&&launched<=now&&now-launched<=49*DAY;
 const media=Date.parse(media_event_at_utc);
 const viral=Number.isFinite(media)&&media<=now&&
  now-media<=HOURS_72&&independently_verified_media_sources>=2;
 if(!young&&!viral)return fail("NOT_NEW_AND_NO_VERIFIED_FRESH_MEME_EVENT");
 return {...base,eligible_for_meme_research:true,
  status:young?"NEW_SMALL_MEME_CANDIDATE":"VERIFIED_VIRAL_SMALL_MEME_CANDIDATE",
  chain,token_address,pool_address,symbol:s,
  source_fdv_usd:claimed_fdv_usd,
  actual_gpt_model_decision:null,
  historical_executable_sell_quote_proven:false,
  admission_does_not_prove_10x_profit:true};
}
export const MEME_SNIPER_EXCLUDED_SYMBOLS=[...EXCLUDED];
