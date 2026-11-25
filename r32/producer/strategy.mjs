// R32 producer contract. No accounts, wallets, budgets, local client IDs or feedback.
import {identity} from '../../r31/broadcast.mjs';
import {preparePublication} from '../../r31/publisher.mjs';
export const ACTION=Object.freeze({ENTRY_ALLOWED:'BUY',HOLD_ONLY:'HOLD',EXIT:'SELL',WATCH:'WATCH',NO_TRADE:'NO_TRADE',DATA_GAP:'DATA_GAP'});
const keys=new Set(['coin','chain','contract','disposition','entry_rank','price_eur','observed_at_utc','source_url','reason','risk']);
export function compileReviews(reviews){
 if(!Array.isArray(reviews)||reviews.length>500)throw Error('INVALID_REVIEW_COUNT');
 const seen=new Set(),ranks=new Set();
 const entries=[],rest=[];
 for(const d of reviews){
  if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!keys.has(k))||!Object.hasOwn(ACTION,d.disposition)||typeof d.reason!=='string'||!d.reason.trim()||typeof d.risk!=='string'||!d.risk.trim())throw Error('INVALID_REVIEW');
  const k=identity(d);if(seen.has(k))throw Error('DUPLICATE_REVIEW');seen.add(k);
  if(d.disposition==='ENTRY_ALLOWED'){
   if(!Number.isSafeInteger(d.entry_rank)||d.entry_rank<1||ranks.has(d.entry_rank))throw Error('INVALID_ENTRY_RANK');
   ranks.add(d.entry_rank);
  }else if(d.entry_rank!==undefined)throw Error('UNEXPECTED_ENTRY_RANK');
  const wire={coin:d.coin,chain:d.chain,contract:d.contract,action:ACTION[d.disposition],reason:'['+d.disposition+(d.entry_rank?' #'+d.entry_rank:'')+'] '+d.reason+' | Risiko/Invalidierung: '+d.risk};
  for(const field of ['price_eur','observed_at_utc','source_url'])if(d[field]!==undefined)wire[field]=d[field];
  if(d.disposition==='ENTRY_ALLOWED')entries.push({rank:d.entry_rank,wire});else rest.push(wire);
 }
 // Stable global priority encoded by array order, compatible with installed R31 v0.3.
 entries.sort((a,b)=>a.rank-b.rank);
 if(entries.some((e,i)=>e.rank!==i+1))throw Error('NONCONTIGUOUS_ENTRY_RANK');
 return [...rest.filter(d=>d.action==='SELL'),...entries.map(e=>e.wire),...rest.filter(d=>d.action!=='SELL')];
}
export function prepareStrategy({previous=null,universe,reviews,target_utc,published_at_utc,expires_at_utc}){
 const decisions=compileReviews(reviews);
 // Never silently drop a prior entry or exit, even when absent from the newest research.
 const coverage=new Set([...universe.coins.map(identity),...decisions.map(identity)]);
 if(coverage.size>500)throw Error('WIRE_COVERAGE_LIMIT_REQUIRES_SHARDING');
 return preparePublication({previous,universe,decisions,target_utc,published_at_utc,expires_at_utc});
}
