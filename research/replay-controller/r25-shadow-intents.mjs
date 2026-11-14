// R25: timestamp-locked shadow BUY/SELL proposals from actual visible replay evidence.
// NO trades, wallets, API calls, synthetic external proof, changed role files or agent identity.
// This never claims a 75% breakout probability; score is an uncalibrated heuristic.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest} from './engine.mjs';

const check=(ok,reason)=>{if(!ok)throw Error(reason);};
const tm=s=>Date.parse(s);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const ids=xs=>[...new Set(xs.map(x=>x.id))];

export function shadowIntents(frame,{budget=5000,minScore=80,securityFreshMs=900000,
  marketFreshMs=900000,trendWindowMs=86400000}={}){
 check(frame?.schema==='dot_replay_frame.v1'&&Array.isArray(frame.events),'INVALID_FRAME');
 const {input_hash,...body}=frame;
 check(input_hash===digest(body),'FRAME_HASH_MISMATCH');
 check(finite(tm(frame.at)),'INVALID_FRAME_TIME');
 check(finite(budget)&&budget>0,'INVALID_PAPER_BUDGET');
 check(finite(minScore)&&minScore>=0&&minScore<=100,'INVALID_THRESHOLD');
 const asof=tm(frame.at),by=new Map(),invalid=[];
 for(const e of frame.events){
   check(typeof e.id==='string'&&typeof e.candidate_id==='string'&&
     ['POOL','SOCIAL','MARKET','SECURITY'].includes(e.kind),'INVALID_EVENT');
   check(finite(tm(e.available_at))&&finite(tm(e.event_at))&&
     tm(e.event_at)<=tm(e.available_at)&&tm(e.available_at)<=asof,
     'LOOKAHEAD_EVENT_REJECTED');
   if(e.evidence?.verified!==true){
     invalid.push(e.id);continue;
   }
   if(!by.has(e.candidate_id))by.set(e.candidate_id,[]);
   by.get(e.candidate_id).push(e);
 }
 const out=[];
 for(const [candidate_id,events] of by){
   const kind=k=>events.filter(e=>e.kind===k).sort((a,b)=>tm(a.available_at)-tm(b.available_at));
   const pools=kind('POOL'),markets=kind('MARKET'),social=kind('SOCIAL'),security=kind('SECURITY');
   const s=security.at(-1),m=markets.at(-1);
   const freshSecurity=Boolean(s&&asof-tm(s.available_at)<=securityFreshMs&&s.scope==='BLOCK_STATE');
   const freshMarket=Boolean(m&&asof-tm(m.available_at)<=marketFreshMs&&m.execution_verified===true&&
     finite(m.reserve_quote)&&m.reserve_quote>0&&finite(m.reserve_token)&&m.reserve_token>0&&
     finite(m.fee_bps)&&m.fee_bps>=0&&finite(m.gas_quote)&&m.gas_quote>=0);
   const activeSocial=social.filter(e=>asof-tm(e.available_at)<=trendWindowMs);
   const authors=new Set(activeSocial.flatMap(e=>Array.isArray(e.authors)?e.authors:[]));
   const independentSocial=authors.size>=2&&activeSocial.length>0;
   const previous=markets.filter(e=>tm(e.available_at)<tm(m?.available_at||'')&&
     asof-tm(e.available_at)<=trendWindowMs).at(-1);
   const price=x=>x.reserve_quote/x.reserve_token;
   const momentum=(previous&&freshMarket)?price(m)/price(previous)-1:null;
   const rising=finite(momentum)&&momentum>=0.10;
   const falling=finite(momentum)&&momentum<=-0.15;
   const hasPosition=Boolean(frame.portfolio?.positions?.[candidate_id]);
   const evidence=ids([...pools,...activeSocial,...markets.slice(-2),...security.slice(-1)]);
   const blockers=[];
   if(!pools.length)blockers.push('POOL_EVIDENCE_MISSING');
   if(!freshMarket)blockers.push('FRESH_EXECUTABLE_MARKET_EVIDENCE_MISSING');
   if(!freshSecurity)blockers.push('FRESH_BLOCK_SECURITY_MISSING');
   if(s&&s.buy_allowed===false)blockers.push('BUY_BLOCKED_BY_SECURITY');
   if(s&&s.sell_allowed===false)blockers.push('SELL_BLOCKED_BY_SECURITY');
   // Conservative, transparent baseline. Scores are NOT trained probabilities.
   // Pool + security + executable liquidity quote: up to 55; social plus momentum
   // can move a candidate over the exploratory paper-intent threshold.
   const score=Math.min(100,(pools.length?15:0)+
     (freshSecurity&&s.buy_allowed===true&&s.sell_allowed===true?20:0)+
     (freshMarket?20:0)+(independentSocial?25:0)+(rising?20:0));
   let action='WATCH',reason='INSUFFICIENT_ASOF_EVIDENCE';
   const hardBlocked=Boolean(s&&(s.sell_allowed===false||s.buy_allowed===false));
   if(hardBlocked){action='REJECT';reason='SECURITY_REJECTION';}
   else if(hasPosition&&freshMarket&&freshSecurity&&s.sell_allowed===true&&falling){
     action='SELL_INTENT';reason='VERIFIED_QUOTE_TREND_REVERSAL';}
   else if(!hasPosition&&!blockers.length&&score>=minScore&&
     (rising||independentSocial)){
     action='BUY_INTENT';reason='MULTISIGNAL_HISTORICAL_PAPER_HYPOTHESIS';}
   else if(!pools.length||!freshMarket||!freshSecurity){
     action='DATA_GAP';reason='SOURCE_GAP_NOT_NEGATIVE_SIGNAL';}
   const amount=action==='BUY_INTENT'?
     Math.min(budget,Math.round(50+Math.max(0,Math.min(1,(score-80)/12))*950)):null;
   out.push({candidate_id,action,score_unvalidated:score,
     score_is_breakout_probability:false,reason,asof:frame.at,
     evidence_ids:evidence,blockers,estimated_momentum_pct:finite(momentum)?
       Math.round(momentum*10000)/100:null,
     proposed_paper_quote_amount:amount, fills_executed:0,
     paper_account_changed:false, next_step:'INDEPENDENT_QA_AND_NEXT_TICK_EXECUTION_REQUIRED'});
 }
 out.sort((a,b)=>b.score_unvalidated-a.score_unvalidated||a.candidate_id.localeCompare(b.candidate_id));
 return {schema:'r25_shadow_intent.v1',mode:'RESEARCH_ONLY_PAPER_HYPOTHESIS',
   input_hash,at:frame.at,frame_index:frame.index,
   source_candidates:by.size,ignored_unverified_source_ids:invalid,
   buy_intents:out.filter(x=>x.action==='BUY_INTENT').length,
   sell_intents:out.filter(x=>x.action==='SELL_INTENT').length,
   executed_trades:0,real_orders:0,results:out,
   limitations:[
     'Heuristic score is not a calibrated probability of breakout or profitability.',
     'BUY_INTENT is not a simulated fill and never becomes a QA order automatically.',
     'A role must independently review each evidenced candidate and QA must decide.',
     'Without verified next-tick quote, gas, tax, slippage and sellability no historical fill may be claimed.',
     'Missing source data is not negative market evidence.'
   ]};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
   const [input,output]=process.argv.slice(2);
   check(input&&output,'USAGE: node r25-shadow-intents.mjs FRAME.json OUTPUT.json');
   check(!fs.existsSync(output),'OUTPUT_EXISTS');
   const data=shadowIntents(JSON.parse(fs.readFileSync(input,'utf8')));
   fs.mkdirSync(path.dirname(output),{recursive:true});
   fs.writeFileSync(output,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({candidates:data.source_candidates,buy_intents:data.buy_intents,
     sell_intents:data.sell_intents,executed_trades:0,output}));
 }catch(e){console.error('R25_BLOCKED:'+e.message);process.exitCode=2;}
}