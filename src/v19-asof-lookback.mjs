// R29 V1.9: unlimited past-only feature history shared by replay / live research.
// OLD observations are useful features; they are NEVER fresh BUY/SELL execution quotes.
import {classifyAsOfEvidence,asOfMillis} from './v19-asof-evidence.mjs';
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';

const key=(c,p,t)=>c+':'+(c==='solana'?t:String(t).toLowerCase())+
 ':'+(c==='solana'?p:String(p).toLowerCase());
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
export function buildAsOfLookback({snapshots=[],asOfUtc}={}){
 const now=asOfMillis(asOfUtc);
 if(now===null||!Array.isArray(snapshots))throw Error('INVALID_ASOF_LOOKBACK_INPUT');
 const byMarket=new Map(),excluded={future_or_not_available:0,
  retrospective_or_oracle:0,invalid_identity_or_quote:0};
 for(const s of snapshots){
   const classification=classifyAsOfEvidence(s,{asOfUtc});
   if(!['PROVISIONAL_ASOF','SYNTHETIC_REGRESSION_ONLY'].includes(classification.status)){
     const bucket=['RETROSPECTIVE_RESEARCH_ONLY','POST_EVENT_ONLY'].includes(classification.status)
       ?'retrospective_or_oracle':'future_or_not_available';
     excluded[bucket]++;continue;
   }
   const c=canonicalChain(s?.coin?.chain),p=s?.coin?.pool,t=s?.coin?.contract;
   const observed=asOfMillis(s?.observed_at_utc),quotes=s?.quotes;
   if(!c||!tokenValid(c,t)||!poolValid(c,p,s.coin?.pool_kind)||observed===null
     ||!Array.isArray(quotes)||!quotes.length
     ||quotes.some(q=>!positive(q.price_usdc)||q.chain!==c||q.contract!==t||q.pool!==p)){
     excluded.invalid_identity_or_quote++;continue;
   }
   const price=quotes.reduce((sum,q)=>sum+q.price_usdc,0)/quotes.length;
   const id=key(c,p,t);
   if(!byMarket.has(id))byMarket.set(id,[]);
   byMarket.get(id).push({observed_at_utc:s.observed_at_utc,price_usdc:price,
     source_class:classification.source_class,available_at_utc:classification.available_at_utc,
     execution_quote_authorized:false});
 }
 const markets=[],earliest=[];
 for(const [id,rows] of byMarket){
   rows.sort((a,b)=>Date.parse(a.observed_at_utc)-Date.parse(b.observed_at_utc));
   const unique=rows.filter((r,i)=>!i||r.observed_at_utc!==rows[i-1].observed_at_utc);
   const first=unique[0],latest=unique.at(-1),firstMs=Date.parse(first.observed_at_utc);
   earliest.push(firstMs);
   const ago24=unique.filter(x=>Date.parse(x.observed_at_utc)<=now-24*3600000).at(-1);
   const moveFirst=first.price_usdc>0?(latest.price_usdc/first.price_usdc-1)*100:null;
   markets.push({key:id,observations:unique.length,
     first_observed_at_utc:first.observed_at_utc,
     latest_observed_at_utc:latest.observed_at_utc,
     first_price_usdc:first.price_usdc,latest_price_usdc:latest.price_usdc,
     previous_observed_at_utc:unique.length>1?unique.at(-2).observed_at_utc:null,
     previous_price_usdc:unique.length>1?unique.at(-2).price_usdc:null,
     past_observed_return_pct:moveFirst,
     past_24h_return_pct:ago24?(latest.price_usdc/ago24.price_usdc-1)*100:null,
     prior_to_day_eligible:false,execution_quote_authorized:false,
     older_than_five_hours:now-firstMs>5*3600000});
 }
 markets.sort((a,b)=>a.key.localeCompare(b.key));
 return {schema:1,kind:'R29_V19_PAST_ONLY_LOOKBACK',as_of_utc:asOfUtc,
   lookback_has_fixed_age_cutoff:false,market_count:markets.length,
   observation_count:markets.reduce((n,x)=>n+x.observations,0),
   oldest_observation_at_utc:earliest.length?new Date(Math.min(...earliest)).toISOString():null,
   markets,excluded,may_research_only:true,may_execute_trade:false,
   note:'Only prior actual/synthetic captures; execution still requires separate contemporaneous Dot3 and quote gates.'};
}
