// V0.9 evidence dossier: human-readable blockers for every prioritized token.
// Research claims and public market readbacks must NEVER be converted into
// execution permissions. This module deliberately has no BUY/SELL imports.
import {candidateId} from './research-watchlist.mjs';
const AGE_MS=10*60_000,MAX=18;
const result=(at,entries)=>({
 schema:'candidate_decision_dossiers.v1',paper_only:true,actionable:false,
 generated_at_utc:new Date(at).toISOString(),candidates:entries,
 automated_external_paper_entry_authorized:false,
 message:'Sichtbare Beobachtungen und fehlende Nachweise; keine echten Trades oder Paper-Orders.'
});
const idMatches=x=>{
 try{return candidateId(x.chain,x.token_address,x.pool_address)===x.candidate_id}catch{return false}
};
export function buildDecisionDossiers({network,batch,now=Date.now()}={}){
 if(!Number.isFinite(now))throw Error('INVALID_DOSSIER_CLOCK');
 const advisories=network?.advisories?.candidates;
 if(!Array.isArray(advisories)||network?.paper_only!==true||
   network?.actionable!==false)return result(now,[]);
 const source=Array.isArray(batch?.results)&&batch?.schema==='pool_readback_batch.v1'&&
  batch.paper_only===true&&batch.actionable===false?batch.results:[];
 const checkedAt=Date.parse(batch?.checked_at_utc);
 const isFresh=Number.isFinite(checkedAt)&&checkedAt<=now&&now-checkedAt<=AGE_MS;
 const byId=new Map();
 if(isFresh){
  for(const r of source){
   if(typeof r?.candidate_id==='string'&&r.paper_only===true&&r.actionable===false&&
      r.paper_entry_authorized===false&&r.contract_status==='UNKNOWN'&&
      r.sellability_status==='UNKNOWN'&&r.executable_sell_quote===false&&
      r.executable_buy_quote===false&&r.checked_at_utc===batch.checked_at_utc)
      byId.set(r.candidate_id,r);
  }
 }
 const seen=new Set(),items=[];
 for(const candidate of advisories){
  if(items.length>=MAX)break;
  if(!idMatches(candidate)||seen.has(candidate.candidate_id))continue;
  seen.add(candidate.candidate_id);
  const r=byId.get(candidate.candidate_id);
  const chain=r?.onchain_existence;
  const chainOK=chain?.candidate_id===candidate.candidate_id&&
   chain?.schema==='onchain_existence_readback.v1'&&
   chain.paper_only===true&&chain.actionable===false&&
   chain.paper_entry_authorized===false&&chain.contract_security==='UNKNOWN'&&
   chain.sellability==='UNKNOWN';
  const header=chainOK?chain?.solana_mint_header:null;
  const mintObserved=candidate.chain==='solana'&&
   header?.schema==='solana_mint_header_risk.v1'&&
   header?.paper_only===true&&header?.actionable===false&&
   header?.paper_entry_authorized===false&&
   header?.contract_security==='UNKNOWN'&&header?.sellability==='UNKNOWN'&&
   ['SPL_TOKEN_LEGACY','TOKEN_2022'].includes(header?.mint_program)&&
   ['REVOKED','RETAINED'].includes(header?.mint_authority)&&
   ['REVOKED','RETAINED'].includes(header?.freeze_authority)&&
   ['CAUTION','HEADER_ONLY_NO_KNOWN_AUTHORITY'].includes(header?.observed_risk);
  const mint=mintObserved?header.mint_authority:'UNKNOWN';
  const freeze=mintObserved?header.freeze_authority:'UNKNOWN';
  const roles=Array.isArray(candidate.roles_reporting)?
   [...new Set(candidate.roles_reporting.filter(x=>typeof x==='string'))]:[];
  const reported=roles.filter(x=>['news_discovery','social_acceleration',
   'onchain_liquidity','contract_security','opportunity_qa'].includes(x)).length;
  const market=r?.market_identity_verified===true&&r.status==='IDENTITY_MATCHED'?
   'PROVIDERS_AGREE':'UNVERIFIED';
  const onchain=chainOK&&['CODE_PRESENT','ACCOUNTS_REPORTED'].includes(chain.existence_status)?
   'ACCOUNT_OR_CODE_OBSERVED':'UNVERIFIED';
  const blockers=[
   ...(mint==='RETAINED'?['SOLANA_MINT_AUTHORITY_RETAINED']:[]),
   ...(freeze==='RETAINED'?['SOLANA_FREEZE_AUTHORITY_RETAINED']:[]),
   ...(header?.mint_program==='TOKEN_2022'?['TOKEN_2022_EXTENSIONS_UNAUDITED']:[]),
   ...(market==='UNVERIFIED'?['TWO_SOURCE_POOL_METRICS_UNVERIFIED']:[]),
   ...(onchain==='UNVERIFIED'?['ONCHAIN_ACCOUNT_OR_CODE_NOT_CONFIRMED']:[]),
   'FIVE_SIGNED_ROLE_VOTES_NOT_PROVEN',
   'INDEPENDENT_CONTRACT_HOLDER_LP_RISK_NOT_CLEARED',
   'SIZE_SPECIFIC_EXECUTABLE_BUY_SELL_QUOTES_UNAVAILABLE'
  ];
  items.push({
   candidate_id:candidate.candidate_id,chain:candidate.chain,
   roles_reporting_count:reported,roles_signed_verified:0,
   provider_identity_status:market,
   onchain_existence_status:onchain,
   solana_mint_authority:mint,solana_freeze_authority:freeze,
   decision:'BLOCKED',paper_entry_authorized:false,
   signed_quorum_verified:false,objective_risk_pass:false,
   executable_buy_quote:false,executable_sell_quote:false,
   checked_at_utc:isFresh&&r?batch.checked_at_utc:null,
   blockers
  });
 }
 return result(now,items);
}
