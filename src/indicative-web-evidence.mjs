// Translate recorded public-page displays into explicitly INDICATIVE PAPER quotes.
// Does not fetch websites or assert that a source actually contained the given price.
// Cloud dots must verify the immutable GitHub page evidence before using output.
import {canonicalChain,parsePoolUrl,exactPoolUrl,tokenValid,poolValid} from './market-evidence.mjs';
export class EvidenceGap extends Error {
 constructor(code,detail){super(detail);this.name='EvidenceGap';this.code=code;}
}
const fail=(code,detail)=>{throw new EvidenceGap(code,detail);};
const stamp=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s)?Date.parse(s):NaN;
export function assessIndicativePages({coin,pages,decision_at_utc}={}){
 const now=stamp(decision_at_utc),chain=canonicalChain(coin?.chain);
 if(!Number.isFinite(now))fail('INVALID_DECISION_TIME','Decision time needs complete UTC date.');
 if(!chain||!tokenValid(chain,coin?.contract)||!poolValid(chain,coin?.pool,coin?.pool_kind))
   fail('INCOMPLETE_COIN_IDENTITY','Exact chain/contract/pool required.');
 if(!Array.isArray(pages)||pages.length<2)fail('MISSING_SECOND_POOL_PAGE','Two page observations required.');
 const quotes=[],domains=new Set(),contracts=new Set();
 for(const page of pages){
   const u=parsePoolUrl(page?.source_url);
   if(!u||!exactPoolUrl(page.source_url,chain,coin.pool))
     fail('SOURCE_POOL_MISMATCH','Page must show exact chain and pool on an allowed domain.');
   if(domains.has(u.host))fail('DUPLICATE_DOMAIN','Two different public domains required.');
   domains.add(u.host);
   const seen=stamp(page.captured_at_utc);
   if(!Number.isFinite(seen)||seen>now||now-seen>600000)fail('STALE_OR_FUTURE_CAPTURE','Page must have a real observation in the past ten minutes.');
   if(!Number.isFinite(page.price_usdc)||page.price_usdc<=0||!Number.isFinite(page.liquidity_usdc)||page.liquidity_usdc<5000)
     fail('INVALID_PRICE_OR_LIQUIDITY','Positive quoted price and sufficient reported liquidity needed.');
   if(!/^[0-9a-f]{40}$/.test(page.source_archive_blob_sha||'')||!/^research\/snapshots\/[\w./-]+\.json$/.test(page.source_archive_path||''))
     fail('IMMUTABLE_SOURCE_EVIDENCE_MISSING','Write snapshot first and verify its exact Git blob SHA.');
   if(page.token_contract!==undefined&&page.token_contract!==null){
     if(page.token_contract.toLowerCase()!==coin.contract.toLowerCase())
       fail('TOKEN_CONTRACT_MISMATCH','Displayed contract differs from selected coin.');
     contracts.add(u.host);
   }
   quotes.push({provider_id:u.provider,source_url:page.source_url,observed_at:page.captured_at_utc,
     price_usdc:page.price_usdc,liquidity_usdc:page.liquidity_usdc,
     chain,contract:coin.contract,pool:coin.pool});
 }
 if(contracts.size<1)fail('NO_FULL_CONTRACT_EVIDENCE','At least one actual source must confirm full contract.');
 const sorted=quotes.map(q=>q.price_usdc).sort((a,b)=>a-b),mid=(sorted[0]+sorted.at(-1))/2;
 if((sorted.at(-1)-sorted[0])/mid*100>3)fail('SOURCE_PRICE_DISAGREEMENT','Public page display prices disagree by more than 3%.');
 return {quote_quality:'INDICATIVE_WEB_ONLY',quotes,
   evidence_class:'TWO_ARCHIVED_PAGE_DISPLAYS_NOT_EXECUTABLE_PRICE',
   provider_quote_asof_verified:pages.every(p=>Number.isFinite(stamp(p.provider_quote_asof_utc))),
   git_blob_verification_required:true,
   caution:'Two public page captures alone do not prove provider freshness or trade sellability; validate Git blobs before publishing PAPER order.'};
}
