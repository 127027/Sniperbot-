// Forward-only outcome observer for adaptive research decisions.
// This is NOT backtest trading, PnL, real fillability or proof of complete highs.
// It uses only LATER observed quotes for the identical chain+token+pool ID.
import {createHash} from 'node:crypto';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
const HOUR=3600000,DAY=24*HOUR;
export const RESEARCH_HORIZONS=Object.freeze([
 {label:'1h',afterMs:HOUR,toleranceMs:20*60000},
 {label:'6h',afterMs:6*HOUR,toleranceMs:HOUR},
 {label:'24h',afterMs:DAY,toleranceMs:3*HOUR},
 {label:'7d',afterMs:7*DAY,toleranceMs:12*HOUR},
 {label:'14d',afterMs:14*DAY,toleranceMs:DAY},
 {label:'30d',afterMs:30*DAY,toleranceMs:DAY}
]);
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const ms=s=>typeof s==='string'&&s.endsWith('Z')?Date.parse(s):NaN;
const iso=n=>new Date(n).toISOString();
const money=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const isResearch=s=>s?.paper_only===true&&s?.actionable===false;
const empty=()=>({schema:'sniper_r29_research_observation_outcomes.v1',
 paper_only:true,actionable:false,active:[],completed_count:0,
 last_observed_at_utc:null,archived_count:0});
const validateState=s=>{
 if(s?.schema!=='sniper_r29_research_observation_outcomes.v1'||
 !isResearch(s)||!Array.isArray(s.active)||s.active.length>5000||
 !Number.isInteger(s.completed_count)||s.completed_count<0)
 throw Error('RESEARCH_OUTCOMES_STATE_INVALID');
};
function createTracked(review){
 if(!review||review.schema!=='sniper_r29_dynamic_research_review.v1'||
  !isResearch(review)||review.validated_buy_count!==0||
  review.decision!=='OBSERVE_ONLY_EVIDENCE_GAP'||
  !Number.isFinite(ms(review.at_utc))||
  !Array.isArray(review.candidates))
  throw Error('RESEARCH_OUTCOMES_UNTRUSTED_REVIEW');
 const eligible=review.candidates.filter(c=>
  typeof c.candidate_id==='string'&&c.candidate_id.length<215&&money(c.price_usd));
 const base=eligible.filter(c=>c.selection!=='DETERMINISTIC_CONTROL').slice(0,3);
 const controls=eligible.filter(c=>c.selection==='DETERMINISTIC_CONTROL').slice(0,1);
 return [...base,...controls].map(c=>({
   id:sha([review.sha256_payload,c.candidate_id]),
   review_sha256:review.sha256_payload,
   candidate_id:c.candidate_id,selected_at_utc:review.at_utc,
   experiment_phase:review.experiment_phase,
   baseline_price_usd:c.price_usd,
   selection:c.selection,
   marks:Object.fromEntries(RESEARCH_HORIZONS.map(h=>[h.label,
    {status:'PENDING',at_utc:null,indicative_ratio:null}]))
 }));
}
export function advanceResearchObservations(snapshot,previous=empty(),{review=null}={}){
 if(snapshot?.schema!=='research_market_snapshot.v1'||!isResearch(snapshot)||
   !Number.isFinite(ms(snapshot.published_at_utc))||
   !Array.isArray(snapshot.candidates))throw Error('RESEARCH_OUTCOMES_UNTRUSTED_MARKET');
 validateState(previous);
 const now=ms(snapshot.published_at_utc);
 const state=structuredClone(previous);
 if(Number.isFinite(ms(state.last_observed_at_utc))&&
   now<ms(state.last_observed_at_utc))throw Error('RESEARCH_OUTCOMES_CLOCK_BACKWARDS');
 let changed=false;
 if(review){
   if(ms(review.at_utc)!==now)throw Error('RESEARCH_OUTCOMES_REVIEW_NOT_ASOF');
   const exists=new Set(state.active.map(x=>x.id));
   for(const c of createTracked(review)){
     if(exists.has(c.id))continue;
     if(state.active.length>=5000)break;
     exists.add(c.id);state.active.push(c);changed=true;
   }
 }
 const current=new Map(snapshot.candidates.filter(c=>
   typeof c?.candidate_id==='string'&&money(c.price_usd))
   .map(c=>[c.candidate_id,c]));
 const completed=[];
 for(const c of state.active){
   for(const h of RESEARCH_HORIZONS){
     const m=c.marks[h.label];
     if(m.status!=='PENDING')continue;
     const start=ms(c.selected_at_utc)+h.afterMs;
     if(now<start)continue;
     const observed=current.get(c.candidate_id);
     if(now<=start+h.toleranceMs&&observed){
       m.status='INDICATIVE_SAME_POOL_PRICE_OBSERVED';
       m.at_utc=snapshot.published_at_utc;
       m.indicative_ratio=Math.round(observed.price_usd/c.baseline_price_usd*1e6)/1e6;
       changed=true;
     }else if(now>start+h.toleranceMs){
       m.status='UNKNOWN_NO_MATCHING_QUOTE_IN_WINDOW';
       changed=true;
     }
   }
   if(RESEARCH_HORIZONS.every(h=>c.marks[h.label].status!=='PENDING'))
     completed.push(c);
 }
 if(completed.length){
   const ids=new Set(completed.map(x=>x.id));
   state.active=state.active.filter(x=>!ids.has(x.id));
   state.completed_count+=completed.length;
   changed=true;
 }
 if(changed)state.last_observed_at_utc=snapshot.published_at_utc;
 return {state,changed,completed,new_tracked:review?createTracked(review).length:0};
}

export async function updateResearchOutcomes(snapshot,{folder,review=null}={}){
 if(typeof folder!=='string'||!path.isAbsolute(folder))
   throw Error('RESEARCH_OUTCOMES_BAD_FOLDER');
 const stateFile=path.join(folder,'outcomes','tracking.json');
 let previous=empty();
 try{
   const raw=await readFile(stateFile);
   if(raw.length>10*1024*1024)throw Error('RESEARCH_OUTCOMES_TOO_LARGE');
   previous=JSON.parse(raw.toString('utf8'));
 }catch(e){if(e.code!=='ENOENT')throw e}
 const result=advanceResearchObservations(snapshot,previous,{review});
 if(!result.changed)return {changed:false,completed:0,
   active:result.state.active.length};
 const outcomesFolder=path.join(folder,'outcomes','completed');
 await mkdir(outcomesFolder,{recursive:true});
 for(const record of result.completed){
   const body={schema:'sniper_r29_research_outcome_30day.v1',
     paper_only:true,actionable:false,realized_pnl:null,executed_fills:0,
     security_verified:false,complete_price_history:false,
     outcome:record,completed_at_utc:snapshot.published_at_utc,
     warning:'Sparse source quotes. Missing match NOT a negative trade result.'};
   const payload={...body,sha256_payload:sha(body)};
   const file=path.join(outcomesFolder,record.id+'.json');
   const text=JSON.stringify(payload,null,2)+'\n';
   try{await writeFile(file,text,{flag:'wx',mode:0o600})}
   catch(e){
     if(e.code!=='EEXIST')throw e;
     if(await readFile(file,'utf8')!==text)
       throw Error('RESEARCH_OUTCOME_IMMUTABLE_CONFLICT');
   }
 }
 result.state.archived_count=(previous.archived_count||0)+result.completed.length;
 await mkdir(path.dirname(stateFile),{recursive:true});
 const tmp=stateFile+'.tmp-'+process.pid;
 await writeFile(tmp,JSON.stringify(result.state,null,2)+'\n',{mode:0o600});
 await rename(tmp,stateFile);
 return {changed:true,completed:result.completed.length,
   active:result.state.active.length,archived_total:result.state.archived_count,
   observed_at_utc:snapshot.published_at_utc,
   never_trade:true,never_wallet:true,
   disclaimer:'Indicative same-pool price outcomes only'};
}
